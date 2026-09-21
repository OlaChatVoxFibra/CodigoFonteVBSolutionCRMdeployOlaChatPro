/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op } from "sequelize";
import Inventory from "../models/Inventory";
import Prompt from "../models/Prompt";
import Ticket from "../models/Ticket";
import {
  AgentInventoryConfig,
  AgentInventoryReplyConfig,
  DEFAULT_AGENT_INVENTORY_REPLY,
  INVENTORY_STRATEGY_PRESETS,
  normalizeAgentInventoryConfig,
  normalizeInventoryReplyConfig,
  resolveEffectiveInventoryReplyConfig
} from "./agentInventoryDefaults";
import logger from "../utils/logger";

export type InventoryPublicView = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  currency: string;
  status: string;
  sku: string | null;
  category: string | null;
  brand: string | null;
  description: string | null;
  image: string | null;
  images: string[];
  buyLink: string | null;
  replySettings: AgentInventoryReplyConfig | null;
};

export function getAgentInventoryConfig(prompt: Prompt | null | undefined): AgentInventoryConfig {
  const cerebro = ((prompt as any)?.cerebro || {}) as Record<string, unknown>;
  return normalizeAgentInventoryConfig(
    (cerebro.guimoV2Inventory as Partial<AgentInventoryConfig>) || null
  );
}

export function formatMoneyBRL(value: number | string | null | undefined, currency = "BRL"): string {
  const n = Number(value);
  const amount = Number.isFinite(n) ? n : 0;
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL"
    }).format(amount);
  } catch {
    return `R$ ${amount.toFixed(2).replace(".", ",")}`;
  }
}

export function stockStatusLabel(status: string, quantity: number): string {
  const s = String(status || "").toLowerCase();
  if (s === "out_of_stock" || quantity <= 0) return "indisponível";
  if (s === "low_stock" || quantity <= 5) return "com poucas unidades";
  return "disponível";
}

export function stockPhrase(status: string, quantity: number): string {
  const s = String(status || "").toLowerCase();
  if (s === "out_of_stock" || quantity <= 0) return " (sem estoque no momento)";
  if (s === "low_stock" || quantity <= 5) return ` (restam ${quantity} un.)`;
  return ` (${quantity} em estoque)`;
}

export function toInventoryPublicView(row: Inventory | Record<string, any>): InventoryPublicView {
  const plain = typeof (row as any).toJSON === "function" ? (row as any).toJSON() : row;
  const imagesRaw = plain.images;
  const images = Array.isArray(imagesRaw)
    ? imagesRaw.map((u: any) => String(u || "").trim()).filter(Boolean)
    : [];
  return {
    id: Number(plain.id),
    name: String(plain.name || ""),
    price: Number(plain.price) || 0,
    quantity: Number(plain.quantity) || 0,
    currency: String(plain.currency || "BRL"),
    status: String(plain.status || "in_stock"),
    sku: plain.sku != null ? String(plain.sku) : null,
    category: plain.category != null ? String(plain.category) : null,
    brand: plain.brand != null ? String(plain.brand) : null,
    description: plain.description != null ? String(plain.description) : null,
    image: plain.image != null ? String(plain.image) : null,
    images,
    buyLink: plain.buyLink != null ? String(plain.buyLink) : null,
    replySettings: plain.replySettings
      ? normalizeInventoryReplyConfig(plain.replySettings)
      : null
  };
}

export function buildCatalogMessage(products: InventoryPublicView[], limit = 12): string {
  const list = products.slice(0, limit);
  if (!list.length) return "No momento não há produtos cadastrados no inventário.";
  return list
    .map((p, i) => {
      const price = formatMoneyBRL(p.price, p.currency);
      const stock = stockStatusLabel(p.status, p.quantity);
      return `${i + 1}. *${p.name}* — ${price} (${stock})`;
    })
    .join("\n");
}

function applyTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let out = String(template || "");
  Object.keys(vars).forEach((key) => {
    const re = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
    out = out.replace(re, vars[key] ?? "");
  });
  return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function formatInventoryAgentReply(opts: {
  product: InventoryPublicView;
  reply: AgentInventoryReplyConfig;
  catalogText?: string;
}): string {
  const { product, reply } = opts;
  const price = reply.includePrice
    ? formatMoneyBRL(product.price, product.currency)
    : "";
  const estoque = reply.includeStock ? String(product.quantity) : "";
  const estoque_frase = reply.includeStock
    ? stockPhrase(product.status, product.quantity)
    : "";
  const estoque_status = reply.includeStock
    ? stockStatusLabel(product.status, product.quantity)
    : "";
  const link = reply.includeLink && product.buyLink ? String(product.buyLink) : "";
  const link_frase =
    reply.includeLink && product.buyLink
      ? ` Link: ${product.buyLink}`
      : "";
  const descricao = reply.includeDescription
    ? String(product.description || "").trim()
    : "";
  const descricao_ou_nome = descricao || String(product.name || "");
  const sku = reply.includeSku && product.sku ? String(product.sku) : "";
  const catalogo = opts.catalogText || "";

  let template = String(reply.template || "").trim();
  if (!template || reply.strategyPreset !== "custom") {
    const preset = INVENTORY_STRATEGY_PRESETS[reply.strategyPreset];
    if (preset?.template) template = preset.template;
  }
  if (!template) template = DEFAULT_AGENT_INVENTORY_REPLY.template;

  let text = applyTemplate(template, {
    nome: product.name,
    preco: price,
    estoque,
    estoque_frase,
    estoque_status,
    link,
    link_frase,
    descricao,
    descricao_ou_nome,
    sku,
    catalogo
  });

  if (reply.includeSku && sku && !text.includes(sku)) {
    text = `${text}\nSKU: ${sku}`.trim();
  }
  if (reply.includeDescription && descricao && !text.includes(descricao)) {
    text = `${text}\n${descricao}`.trim();
  }
  if (reply.resumeHint && reply.resumeHintText) {
    text = `${text}\n\n${reply.resumeHintText}`.trim();
  }
  return text;
}

export async function findInventoryProductsForAgent(opts: {
  companyId: number;
  prompt?: Prompt | null;
  variables?: Record<string, unknown>;
  limit?: number;
}): Promise<InventoryPublicView[]> {
  const limit = Math.min(Math.max(Number(opts.limit) || 20, 1), 50);
  const cfg = getAgentInventoryConfig(opts.prompt);
  if (cfg.enabled === false) return [];

  const where: any = { companyId: opts.companyId };
  const searchParam = String(
    opts.variables?.searchParam ||
      opts.variables?.productName ||
      opts.variables?.query ||
      ""
  ).trim();
  const productId =
    opts.variables?.productId != null ? Number(opts.variables.productId) : NaN;

  if (Number.isFinite(productId) && productId > 0) {
    where.id = productId;
  } else if (cfg.productIds.length > 0) {
    where.id = { [Op.in]: cfg.productIds };
  }

  if (searchParam) {
    where.name = { [Op.iLike]: `%${searchParam}%` };
  }

  let rows = await Inventory.findAll({
    where,
    limit,
    order: [["createdAt", "DESC"]]
  });

  // Fallback: se filtro por productIds não achou e há busca, tenta na empresa toda
  if (
    !rows.length &&
    cfg.productIds.length > 0 &&
    (searchParam || (Number.isFinite(productId) && productId > 0))
  ) {
    const fallbackWhere: any = { companyId: opts.companyId };
    if (Number.isFinite(productId) && productId > 0) fallbackWhere.id = productId;
    else if (searchParam) fallbackWhere.name = { [Op.iLike]: `%${searchParam}%` };
    rows = await Inventory.findAll({
      where: fallbackWhere,
      limit,
      order: [["createdAt", "DESC"]]
    });
  }

  return rows.map(toInventoryPublicView);
}

export function resolveReplyForProduct(
  cfg: AgentInventoryConfig,
  product: InventoryPublicView
): AgentInventoryReplyConfig {
  const override =
    cfg.useSameMessage
      ? null
      : cfg.productReplies[String(product.id)] || null;
  return resolveEffectiveInventoryReplyConfig({
    agentReply: cfg.reply,
    productReplySettings: product.replySettings,
    productOverride: override
  });
}

export function collectInventoryMediaUrls(
  product: InventoryPublicView,
  reply: AgentInventoryReplyConfig
): { images: string[]; documentUrl: string; documentName: string } {
  const images: string[] = [];
  if (reply.sendImages) {
    const mode = reply.imageMode || "none";
    const cover = product.image ? [product.image] : [];
    const gallery = product.images?.length
      ? product.images
      : cover;
    if (mode === "cover") {
      images.push(...cover.slice(0, 1));
    } else if (mode === "gallery") {
      images.push(...gallery.slice(0, 6));
    } else if (mode === "first_n") {
      const n = Math.min(Math.max(reply.imageCount || 3, 1), 6);
      images.push(...gallery.slice(0, n));
    } else if (mode === "none" && cover.length) {
      // sendImages true + none → capa
      images.push(...cover.slice(0, 1));
    }
  }
  return {
    images: images.filter(Boolean),
    documentUrl: reply.sendDocument ? String(reply.documentUrl || "").trim() : "",
    documentName: reply.sendDocument ? String(reply.documentName || "documento") : ""
  };
}

/**
 * Envia mídia de inventário após a resposta textual (best-effort).
 * Suporta http(s) URLs via Baileys; caminhos locais via SendWhatsAppMedia.
 */
export async function sendInventoryReplyMedia(opts: {
  ticket: Ticket;
  product: InventoryPublicView;
  reply: AgentInventoryReplyConfig;
}): Promise<void> {
  const media = collectInventoryMediaUrls(opts.product, opts.reply);
  if (!media.images.length && !media.documentUrl) return;

  try {
    const GetTicketWbot = (await import("./GetTicketWbot")).default;
    const wbot = await GetTicketWbot(opts.ticket);
    if (!wbot) return;

    const jid =
      (opts.ticket as any)?.contact?.remoteJid ||
      (opts.ticket as any)?.remoteJid ||
      null;

    for (const url of media.images) {
      try {
        if (/^https?:\/\//i.test(url) && jid) {
          await wbot.sendMessage(jid, {
            image: { url },
            caption: opts.product.name || ""
          });
        } else if (/^data:image\//i.test(url)) {
          // data URL — skip binary send; preview-only in UI
          logger.info(
            `[INVENTORY MEDIA] data:image omitida no envio produto=${opts.product.id}`
          );
        } else {
          const SendWhatsAppMedia = (
            await import("../services/WbotServices/SendWhatsAppMedia")
          ).default;
          await SendWhatsAppMedia({
            media: {
              filename: `inventory-${opts.product.id}.jpg`,
              mimetype: "image/jpeg",
              path: url
            } as any,
            ticket: opts.ticket,
            body: "",
            isPrivate: false,
            isForwarded: false
          } as any);
        }
      } catch (e) {
        logger.warn(
          `[INVENTORY MEDIA] falha ao enviar imagem produto=${opts.product.id}: ${e}`
        );
      }
    }

    if (media.documentUrl) {
      try {
        if (/^https?:\/\//i.test(media.documentUrl) && jid) {
          await wbot.sendMessage(jid, {
            document: { url: media.documentUrl },
            mimetype: "application/pdf",
            fileName: media.documentName || "documento.pdf"
          });
        } else {
          const SendWhatsAppMedia = (
            await import("../services/WbotServices/SendWhatsAppMedia")
          ).default;
          await SendWhatsAppMedia({
            media: {
              filename: media.documentName || "documento.pdf",
              mimetype: "application/pdf",
              path: media.documentUrl
            } as any,
            ticket: opts.ticket,
            body: media.documentName || "",
            isPrivate: false,
            isForwarded: false
          } as any);
        }
      } catch (e) {
        logger.warn(
          `[INVENTORY MEDIA] falha ao enviar documento produto=${opts.product.id}: ${e}`
        );
      }
    }
  } catch (e) {
    logger.warn(`[INVENTORY MEDIA] sendInventoryReplyMedia: ${e}`);
  }
}

const PRICE_INTENT =
  /\b(pre[cç]o|quanto custa|qual o valor|or[cç]amento|investimento|custa)\b/i;
const STOCK_INTENT =
  /\b(estoque|dispon[ií]vel|ainda tem|quantas unidades|tem unidade|tem no estoque)\b/i;
const CATALOG_INTENT =
  /\b(cat[aá]logo|quais produtos|o que voc[eê]s vendem|quais op[cç][oõ]es|me mostra|quero ver produtos)\b/i;
const LINK_INTENT =
  /\b(manda o link|envia o link|quero o link|link para comprar|onde compro|como compro)\b/i;
const BUY_INTENT =
  /\b(quero comprar|quero esse|vou levar|pode fechar|quero adquirir|me interessa comprar)\b/i;

export type InventoryInboundHandleResult = {
  handled: boolean;
  message?: string;
  product?: InventoryPublicView;
  reply?: AgentInventoryReplyConfig;
  intent?: string;
};

/**
 * Responde grounded em inventário quando o cliente pergunta preço/estoque/catálogo/link/intenção.
 * Pausa o roteiro (caller deve marcar inbound handled e opcionalmente resume hint).
 */
export async function tryHandleInventoryProductInbound(opts: {
  companyId: number;
  prompt: Prompt;
  ticket: Ticket;
  userText: string;
}): Promise<InventoryInboundHandleResult> {
  const cfg = getAgentInventoryConfig(opts.prompt);
  const text = String(opts.userText || "").trim();
  if (!text) return { handled: false };

  if (cfg.enabled === false) {
    if (PRICE_INTENT.test(text) || CATALOG_INTENT.test(text) || STOCK_INTENT.test(text)) {
      const hint = cfg.reply?.resumeHintText || DEFAULT_AGENT_INVENTORY_REPLY.resumeHintText;
      return {
        handled: true,
        message: `No momento o catálogo deste agente está desativado.${hint ? `\n\n${hint}` : ""}`,
        intent: "disabled"
      };
    }
    return { handled: false };
  }

  let intent: string | null = null;
  if (BUY_INTENT.test(text)) intent = "buy";
  else if (LINK_INTENT.test(text)) intent = "link";
  else if (PRICE_INTENT.test(text)) intent = "price";
  else if (STOCK_INTENT.test(text)) intent = "stock";
  else if (CATALOG_INTENT.test(text)) intent = "catalog";
  if (!intent) return { handled: false };

  const products = await findInventoryProductsForAgent({
    companyId: opts.companyId,
    prompt: opts.prompt,
    variables: { searchParam: text },
    limit: intent === "catalog" ? 12 : 5
  });

  if (intent === "catalog") {
    const all = await findInventoryProductsForAgent({
      companyId: opts.companyId,
      prompt: opts.prompt,
      variables: {},
      limit: 12
    });
    const reply = normalizeInventoryReplyConfig(cfg.reply);
    const catalogText = buildCatalogMessage(all, 12);
    const message = applyTemplate(
      reply.strategyPreset === "catalog_brief"
        ? "{{catalogo}}"
        : reply.template || "{{catalogo}}",
      { catalogo: catalogText, nome: "", preco: "", estoque: "", estoque_frase: "", estoque_status: "", link: "", link_frase: "", descricao: "", descricao_ou_nome: "", sku: "" }
    );
    const finalMsg =
      message.includes(catalogText) || !catalogText
        ? message || catalogText
        : catalogText;
    const withHint =
      reply.resumeHint && reply.resumeHintText
        ? `${finalMsg}\n\n${reply.resumeHintText}`
        : finalMsg;
    return { handled: true, message: withHint, intent, reply };
  }

  if (!products.length) {
    return {
      handled: true,
      message: "Não encontrei esse produto no inventário agora. Pode me dizer o nome com mais detalhes?",
      intent
    };
  }

  const product = products[0];
  const reply = resolveReplyForProduct(cfg, product);

  if (intent === "buy") {
    try {
      const dw = ((opts.ticket as any).dataWebhook || {}) as Record<string, unknown>;
      const agentState = ((dw.agentState || {}) as Record<string, unknown>) || {};
      const nextDw = {
        ...dw,
        agentState: {
          ...agentState,
          purchaseIntent: {
            productId: product.id,
            productName: product.name,
            at: new Date().toISOString()
          }
        }
      };
      await (opts.ticket as any).update({ dataWebhook: nextDw });
      (opts.ticket as any).setDataValue("dataWebhook", nextDw);
    } catch (e) {
      logger.warn(`[INVENTORY] falha ao registrar intenção: ${e}`);
    }
    const msg = `Anotei seu interesse em *${product.name}*. Nossa equipe pode seguir com a compra.${
      reply.resumeHint && reply.resumeHintText ? `\n\n${reply.resumeHintText}` : ""
    }`;
    return { handled: true, message: msg, product, reply, intent };
  }

  if (intent === "link") {
    const link = product.buyLink || "";
    const msg = link
      ? `Segue o link de compra do *${product.name}*:\n${link}${
          reply.resumeHint && reply.resumeHintText ? `\n\n${reply.resumeHintText}` : ""
        }`
      : `Ainda não temos link de compra cadastrado para *${product.name}*. Posso te ajudar de outra forma?`;
    return { handled: true, message: msg, product, reply, intent };
  }

  if (intent === "stock") {
    const status = stockStatusLabel(product.status, product.quantity);
    const msg = `Sobre *${product.name}*: está ${status} (${product.quantity} un.).${
      reply.resumeHint && reply.resumeHintText ? `\n\n${reply.resumeHintText}` : ""
    }`;
    return { handled: true, message: msg, product, reply, intent };
  }

  // price (default)
  const message = formatInventoryAgentReply({ product, reply });
  return { handled: true, message, product, reply, intent };
}
