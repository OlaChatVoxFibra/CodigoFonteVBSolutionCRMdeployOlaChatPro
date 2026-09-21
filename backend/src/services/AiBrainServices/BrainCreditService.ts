/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import moment from "moment";
import { Op, Sequelize } from "sequelize";
import Company from "../../models/Company";
import Plan from "../../models/Plan";
import User from "../../models/User";
import BrainCreditAccount from "../../models/BrainCreditAccount";
import BrainTokenLog from "../../models/BrainTokenLog";
import {
  BRAIN_PLAN_OFFERS,
  calculateBrainCredits,
  estimateTokenCostUsd,
  inferBrainActionType,
  mapStripeProductToAddon,
  normalizePlanKey,
  resolveBrainAddonCredits,
  resolveMonthlyCreditsFromPlanName,
  type BrainCreditActionType,
  type BrainModelTier
} from "./brainCreditsCatalog";
import {
  getStripeClient,
  isBrainProduct,
  resolveProductKeyFromPriceId
} from "../../config/stripeBilling";

function endOfCurrentMonth(): Date {
  return moment().endOf("month").toDate();
}

function startOfCurrentMonth(): Date {
  return moment().startOf("month").toDate();
}

export async function resolveCompanyMonthlyQuota(companyId: number): Promise<number> {
  const company = await Company.findByPk(companyId, {
    include: [{ model: Plan, as: "plan" }]
  });
  const planName = (company as any)?.plan?.name || "";
  const crmCredits = resolveMonthlyCreditsFromPlanName(planName);
  const account = await BrainCreditAccount.findOne({ where: { companyId } });
  const addonCredits = resolveBrainAddonCredits(account?.brainAddonPlan);
  return crmCredits + addonCredits;
}

async function maybeResetCycle(account: BrainCreditAccount): Promise<BrainCreditAccount> {
  const now = moment();
  const cycleEnd = account.cycleEndsAt ? moment(account.cycleEndsAt) : null;
  if (cycleEnd && now.isAfter(cycleEnd)) {
    const quota = await resolveCompanyMonthlyQuota(account.companyId);
    await account.update({
      balance: quota,
      monthlyQuota: quota,
      cycleStartAt: startOfCurrentMonth(),
      cycleEndsAt: endOfCurrentMonth()
    });
    await account.reload();
  }
  return account;
}

export async function ensureBrainCreditAccount(companyId: number): Promise<BrainCreditAccount> {
  let account = await BrainCreditAccount.findOne({ where: { companyId } });
  const quota = await resolveCompanyMonthlyQuota(companyId);
  if (!account) {
    account = await BrainCreditAccount.create({
      companyId,
      balance: quota,
      monthlyQuota: quota,
      cycleStartAt: startOfCurrentMonth(),
      cycleEndsAt: endOfCurrentMonth()
    });
    return account;
  }
  if (account.monthlyQuota !== quota) {
    const delta = quota - account.monthlyQuota;
    await account.update({
      monthlyQuota: quota,
      balance: Math.max(0, account.balance + delta)
    });
  }
  return maybeResetCycle(account);
}

export class BrainCreditsInsufficientError extends Error {
  readonly code = "ERR_BRAIN_CREDITS_INSUFFICIENT";
  readonly required: number;
  readonly balance: number;

  constructor(required: number, balance: number) {
    super(
      `Créditos Brain.AI insuficientes. Necessário: ${required}, disponível: ${balance}. Adquira mais créditos em Planos.`
    );
    this.name = "BrainCreditsInsufficientError";
    this.required = required;
    this.balance = balance;
  }
}

export async function activateBrainAddonForCompany(
  companyId: number,
  addonPlan: string
): Promise<BrainCreditAccount> {
  const account = await ensureBrainCreditAccount(companyId);
  if (normalizePlanKey(account.brainAddonPlan) === normalizePlanKey(addonPlan)) {
    return account;
  }
  const company = await Company.findByPk(companyId, {
    include: [{ model: Plan, as: "plan" }]
  });
  const planName = (company as any)?.plan?.name || "";
  const crmCredits = resolveMonthlyCreditsFromPlanName(planName);
  const oldAddonCredits = resolveBrainAddonCredits(account.brainAddonPlan);
  const newAddonCredits = resolveBrainAddonCredits(addonPlan);
  const newQuota = crmCredits + newAddonCredits;
  const addonDelta = Math.max(0, newAddonCredits - oldAddonCredits);

  await account.update({
    brainAddonPlan: addonPlan,
    monthlyQuota: newQuota,
    balance: account.balance + addonDelta,
    cycleStartAt: startOfCurrentMonth(),
    cycleEndsAt: endOfCurrentMonth()
  });
  await account.reload();
  return account;
}

export async function activateBrainAddonFromStripeProduct(
  companyId: number,
  productKey: string
): Promise<BrainCreditAccount | null> {
  const addonPlan = mapStripeProductToAddon(productKey);
  if (!addonPlan) return null;
  return activateBrainAddonForCompany(companyId, addonPlan);
}

export async function confirmBrainPaymentSession(
  sessionId: string,
  companyId: number
) {
  const stripe = await getStripeClient();
  if (!stripe) throw new Error("STRIPE_NOT_CONFIGURED");

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items.data.price"]
  });

  const paid =
    session.payment_status === "paid" ||
    session.status === "complete";
  if (!paid) {
    return {
      activated: false,
      paymentStatus: session.payment_status,
      sessionStatus: session.status
    };
  }

  const priceId = session.line_items?.data?.[0]?.price?.id;
  const productKey = priceId
    ? resolveProductKeyFromPriceId(String(priceId))
    : (session.metadata?.productKey as string) || null;

  if (!productKey || !isBrainProduct(productKey)) {
    return { activated: false, reason: "NOT_BRAIN_PRODUCT", productKey };
  }

  const metaCompanyId = session.metadata?.companyId;
  if (metaCompanyId && Number(metaCompanyId) !== companyId) {
    throw new Error("ERR_SESSION_COMPANY_MISMATCH");
  }

  await activateBrainAddonFromStripeProduct(companyId, productKey);
  const status = await getBrainCreditsStatus(companyId);
  return { activated: true, productKey, status };
}

export async function getBrainCreditsStatus(companyId: number) {
  const account = await ensureBrainCreditAccount(companyId);
  const used = Math.max(0, account.monthlyQuota - account.balance);
  const percentUsed =
    account.monthlyQuota > 0
      ? Math.min(100, Math.round((used / account.monthlyQuota) * 100))
      : 0;
  return {
    balance: account.balance,
    monthlyQuota: account.monthlyQuota,
    used,
    percentUsed,
    cycleStartAt: account.cycleStartAt,
    cycleEndsAt: account.cycleEndsAt,
    brainAddonPlan: account.brainAddonPlan,
    plans: BRAIN_PLAN_OFFERS
  };
}

export async function assertBrainCreditsAvailable(
  companyId: number,
  requiredCredits: number
): Promise<BrainCreditAccount> {
  const account = await ensureBrainCreditAccount(companyId);
  if (account.balance < requiredCredits) {
    throw new BrainCreditsInsufficientError(requiredCredits, account.balance);
  }
  return account;
}

export async function debitBrainCredits(
  companyId: number,
  amount: number
): Promise<BrainCreditAccount> {
  const account = await ensureBrainCreditAccount(companyId);
  if (account.balance < amount) {
    throw new BrainCreditsInsufficientError(amount, account.balance);
  }
  await account.update({ balance: account.balance - amount });
  return account;
}

export interface LogBrainTokenUsageParams {
  companyId: number;
  userId?: number;
  conversationId?: number;
  actionType: BrainCreditActionType;
  provider: string;
  model?: string;
  creditsUsed: number;
  promptTokens?: number;
  completionTokens?: number;
  toolsUsed?: string[];
  metadata?: Record<string, unknown>;
  costUsdEstimate?: number;
}

export async function logBrainTokenUsage(
  params: LogBrainTokenUsageParams
): Promise<BrainTokenLog> {
  const promptTokens = params.promptTokens || 0;
  const completionTokens = params.completionTokens || 0;
  return BrainTokenLog.create({
    companyId: params.companyId,
    userId: params.userId,
    conversationId: params.conversationId,
    actionType: params.actionType,
    provider: params.provider,
    model: params.model,
    creditsUsed: params.creditsUsed,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    costUsdEstimate: params.costUsdEstimate || 0,
    toolsUsed: params.toolsUsed,
    metadata: params.metadata
  });
}

export interface ListBrainTokenLogsParams {
  companyId?: number;
  userId?: number;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  provider?: string;
  actionType?: string;
  platformWide?: boolean;
}

function buildLogWhereClause(params: ListBrainTokenLogsParams): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (params.companyId != null) where.companyId = params.companyId;
  if (params.userId) where.userId = params.userId;
  if (params.provider) where.provider = params.provider;
  if (params.actionType) where.actionType = params.actionType;
  if (params.startDate || params.endDate) {
    where.createdAt = {};
    if (params.startDate) {
      (where.createdAt as any)[Op.gte] = moment(params.startDate).startOf("day").toDate();
    }
    if (params.endDate) {
      (where.createdAt as any)[Op.lte] = moment(params.endDate).endOf("day").toDate();
    }
  }
  return where;
}

export async function listBrainTokenLogs(params: ListBrainTokenLogsParams) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 25));
  const offset = (page - 1) * limit;
  const where = buildLogWhereClause(params);

  const include: any[] = [
    {
      model: User,
      as: "user",
      attributes: ["id", "name", "email"]
    }
  ];
  if (params.platformWide) {
    include.push({
      model: Company,
      as: "company",
      attributes: ["id", "name"]
    });
  }

  const { count, rows } = await BrainTokenLog.findAndCountAll({
    where,
    include,
    order: [["createdAt", "DESC"]],
    limit,
    offset
  });

  const summaryWhere = params.companyId != null ? { companyId: params.companyId } : where;
  const totals = await BrainTokenLog.findAll({
    where: summaryWhere,
    attributes: [
      [Sequelize.fn("SUM", Sequelize.col("creditsUsed")), "totalCredits"],
      [Sequelize.fn("SUM", Sequelize.col("totalTokens")), "totalTokens"],
      [Sequelize.fn("SUM", Sequelize.col("costUsdEstimate")), "totalCostUsd"]
    ],
    raw: true
  });
  const summaryRow = totals[0] as any;
  return {
    logs: rows,
    count,
    page,
    limit,
    hasMore: offset + rows.length < count,
    summary: {
      totalCredits: Number(summaryRow?.totalCredits || 0),
      totalTokens: Number(summaryRow?.totalTokens || 0),
      totalCostUsd: Number(summaryRow?.totalCostUsd || 0)
    }
  };
}

export async function listBrainPlatformCostBreakdown() {
  const rows = await BrainTokenLog.findAll({
    attributes: [
      "companyId",
      [Sequelize.fn("COUNT", Sequelize.col("BrainTokenLogs.id")), "requestCount"],
      [Sequelize.fn("SUM", Sequelize.col("creditsUsed")), "totalCredits"],
      [Sequelize.fn("SUM", Sequelize.col("totalTokens")), "totalTokens"],
      [Sequelize.fn("SUM", Sequelize.col("costUsdEstimate")), "totalCostUsd"]
    ],
    group: ["companyId"],
    raw: true
  });

  const companyIds = rows.map((r: any) => Number(r.companyId)).filter(Boolean);
  const companies =
    companyIds.length > 0
      ? await Company.findAll({
          where: { id: companyIds },
          attributes: ["id", "name", "email"]
        })
      : [];
  const companyMap = new Map(companies.map((c) => [c.id, c]));

  const accounts = await BrainCreditAccount.findAll({
    order: [["balance", "DESC"]]
  });
  const accountCompanyIds = accounts
    .map((a) => a.companyId)
    .filter((id) => !companyMap.has(id));
  if (accountCompanyIds.length) {
    const extra = await Company.findAll({
      where: { id: accountCompanyIds },
      attributes: ["id", "name", "email"]
    });
    extra.forEach((c) => companyMap.set(c.id, c));
  }

  return {
    byCompany: rows.map((row: any) => {
      const company = companyMap.get(Number(row.companyId));
      return {
        companyId: Number(row.companyId),
        companyName: company?.name || `Org #${row.companyId}`,
        requestCount: Number(row.requestCount || 0),
        totalCredits: Number(row.totalCredits || 0),
        totalTokens: Number(row.totalTokens || 0),
        totalCostUsd: Number(row.totalCostUsd || 0)
      };
    }),
    creditAccounts: accounts.map((acc) => ({
      companyId: acc.companyId,
      companyName: companyMap.get(acc.companyId)?.name || `Org #${acc.companyId}`,
      balance: acc.balance,
      monthlyQuota: acc.monthlyQuota,
      cycleEndsAt: acc.cycleEndsAt
    }))
  };
}

export async function chargeBrainTurn(params: {
  companyId: number;
  userId: number;
  model?: string;
  provider: string;
  conversationId?: number;
  voiceMode?: boolean;
  toolsUsed?: string[];
  hasCodeSnapshot?: boolean;
  isTranscribe?: boolean;
  isSynthesize?: boolean;
  isImage?: boolean;
  promptTokens?: number;
  completionTokens?: number;
  metadata?: Record<string, unknown>;
}): Promise<{ creditsUsed: number; logId: number }> {
  const actionType = inferBrainActionType({
    voiceMode: params.voiceMode,
    toolsUsed: params.toolsUsed,
    hasCodeSnapshot: params.hasCodeSnapshot,
    isTranscribe: params.isTranscribe,
    isSynthesize: params.isSynthesize,
    isImage: params.isImage
  });
  const creditsUsed = calculateBrainCredits(actionType, params.model);
  await assertBrainCreditsAvailable(params.companyId, creditsUsed);
  await debitBrainCredits(params.companyId, creditsUsed);
  const log = await logBrainTokenUsage({
    companyId: params.companyId,
    userId: params.userId,
    conversationId: params.conversationId,
    actionType,
    provider: params.provider,
    model: params.model,
    creditsUsed,
    promptTokens: params.promptTokens,
    completionTokens: params.completionTokens,
    toolsUsed: params.toolsUsed,
    metadata: params.metadata,
    costUsdEstimate: estimateTokenCostUsd(
      params.provider,
      params.model || "",
      params.promptTokens || 0,
      params.completionTokens || 0
    )
  });
  return { creditsUsed, logId: log.id };
}

export { calculateBrainCredits, inferBrainActionType, type BrainCreditActionType, type BrainModelTier };
