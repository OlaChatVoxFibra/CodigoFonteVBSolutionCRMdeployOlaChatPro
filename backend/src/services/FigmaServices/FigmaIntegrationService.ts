/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import FigmaIntegration, {
  FigmaIntegrationStatus
} from "../../models/FigmaIntegration";
import AppError from "../../errors/AppError";
import {
  decryptFigmaCredential,
  encryptFigmaCredential
} from "./figmaCredentialCrypto";
import { FigmaService } from "./FigmaService";

export type FigmaIntegrationPublic = {
  status: FigmaIntegrationStatus;
  credential: { hasKey: boolean; last4: string };
  enableBrainAi: boolean;
  enablePrototypeAnalysis: boolean;
  enableCommentsSync: boolean;
  enableDesignSystem: boolean;
  lastSyncAt: string | null;
  figmaAccount?: { email?: string; handle?: string };
};

function maskCredential(plain: string): { hasKey: boolean; last4: string } {
  const t = String(plain || "").trim();
  if (!t) return { hasKey: false, last4: "" };
  return { hasKey: true, last4: t.length <= 4 ? "****" : t.slice(-4) };
}

async function findOrCreate(workspaceId: number): Promise<FigmaIntegration> {
  const existing = await FigmaIntegration.findOne({ where: { workspaceId } });
  if (existing) return existing;
  return FigmaIntegration.create({
    workspaceId,
    credential: "",
    enableBrainAi: true,
    enablePrototypeAnalysis: true,
    enableCommentsSync: false,
    enableDesignSystem: true,
    status: "disconnected"
  });
}

function rowToPublic(
  row: FigmaIntegration,
  plain: string,
  extra?: Partial<FigmaIntegrationPublic>
): FigmaIntegrationPublic {
  return {
    status: row.status,
    credential: maskCredential(plain),
    enableBrainAi: Boolean(row.enableBrainAi),
    enablePrototypeAnalysis: Boolean(row.enablePrototypeAnalysis),
    enableCommentsSync: Boolean(row.enableCommentsSync),
    enableDesignSystem: Boolean(row.enableDesignSystem),
    lastSyncAt: row.lastSyncAt ? row.lastSyncAt.toISOString() : null,
    ...extra
  };
}

export async function getFigmaIntegrationPublic(
  workspaceId: number
): Promise<FigmaIntegrationPublic> {
  const row = await FigmaIntegration.findOne({ where: { workspaceId } });
  if (!row) {
    return {
      status: "disconnected",
      credential: { hasKey: false, last4: "" },
      enableBrainAi: true,
      enablePrototypeAnalysis: true,
      enableCommentsSync: false,
      enableDesignSystem: true,
      lastSyncAt: null
    };
  }
  let plain = "";
  try {
    plain = decryptFigmaCredential(row.credential || "") || "";
  } catch {
    plain = "";
  }
  return rowToPublic(row, plain);
}

export async function saveFigmaIntegration(params: {
  workspaceId: number;
  credential?: string;
  enableBrainAi?: boolean;
  enablePrototypeAnalysis?: boolean;
  enableCommentsSync?: boolean;
  enableDesignSystem?: boolean;
  status?: FigmaIntegrationStatus;
}): Promise<FigmaIntegrationPublic> {
  const row = await findOrCreate(params.workspaceId);

  let plainExisting = "";
  try {
    plainExisting = decryptFigmaCredential(row.credential || "") || "";
  } catch {
    plainExisting = "";
  }

  const incomingCredential =
    params.credential != null ? String(params.credential).trim() : "";
  let nextPlain = plainExisting;

  if (incomingCredential.length > 0) {
    nextPlain = incomingCredential;
    row.credential = encryptFigmaCredential(nextPlain);
  }

  if (params.enableBrainAi !== undefined) {
    row.enableBrainAi = Boolean(params.enableBrainAi);
  }
  if (params.enablePrototypeAnalysis !== undefined) {
    row.enablePrototypeAnalysis = Boolean(params.enablePrototypeAnalysis);
  }
  if (params.enableCommentsSync !== undefined) {
    row.enableCommentsSync = Boolean(params.enableCommentsSync);
  }
  if (params.enableDesignSystem !== undefined) {
    row.enableDesignSystem = Boolean(params.enableDesignSystem);
  }

  if (params.status) {
    row.status = params.status;
  } else if (nextPlain.length > 0 && row.status === "disconnected") {
    row.status = "disconnected";
  }

  if (!nextPlain.length) {
    row.status = "disconnected";
  }

  await row.save();
  return getFigmaIntegrationPublic(params.workspaceId);
}

export async function testFigmaIntegration(params: {
  workspaceId: number;
  credentialOverride?: string;
}): Promise<{
  ok: boolean;
  status: FigmaIntegrationStatus;
  latencyMs: number;
  account?: { email?: string; handle?: string };
  error?: string;
}> {
  const row = await FigmaIntegration.findOne({
    where: { workspaceId: params.workspaceId }
  });

  let token = "";
  if (params.credentialOverride != null && String(params.credentialOverride).trim()) {
    token = String(params.credentialOverride).trim();
  } else if (row?.credential) {
    token = decryptFigmaCredential(row.credential) || "";
  }

  if (!token.trim()) {
    throw new AppError("Informe a credencial Figma para testar a conexão.", 422);
  }

  const started = Date.now();
  try {
    if (row) {
      row.status = "syncing";
      await row.save();
    }

    const service = new FigmaService(token.trim());
    const me = await service.testConnection();

    if (row) {
      row.status = "connected";
      row.lastSyncAt = new Date();
      if (params.credentialOverride?.trim()) {
        row.credential = encryptFigmaCredential(token.trim());
      }
      await row.save();
    }

    return {
      ok: true,
      status: "connected",
      latencyMs: Date.now() - started,
      account: { email: me.email, handle: me.handle }
    };
  } catch (e: any) {
    if (row) {
      row.status = "error";
      await row.save();
    }
    return {
      ok: false,
      status: "error",
      latencyMs: Date.now() - started,
      error: String(e?.message || e).slice(0, 500)
    };
  }
}

export async function loadFigmaCredentialForCompany(
  companyId: number
): Promise<string> {
  const row = await FigmaIntegration.findOne({ where: { workspaceId: companyId } });
  if (!row || row.status !== "connected") {
    throw new AppError("Integração Figma não está conectada.", 422);
  }
  if (!row.enableBrainAi) {
    throw new AppError("Acesso do Brain AI ao Figma está desativado.", 422);
  }
  const key = decryptFigmaCredential(row.credential || "") || "";
  if (!key.trim()) {
    throw new AppError("Credencial Figma não configurada.", 422);
  }
  return key.trim();
}
