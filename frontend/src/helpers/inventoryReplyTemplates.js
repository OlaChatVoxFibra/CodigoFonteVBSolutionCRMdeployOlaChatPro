/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export const DEFAULT_INVENTORY_REPLY_TEMPLATE =
  "O *{{nome}}* custa {{preco}}{{estoque_frase}}.{{link_frase}}";

export const DEFAULT_AGENT_INVENTORY_REPLY = {
  tone: "consultivo",
  strategyPreset: "price_first",
  template: DEFAULT_INVENTORY_REPLY_TEMPLATE,
  includePrice: true,
  includeStock: true,
  includeLink: true,
  includeDescription: false,
  includeSku: false,
  sendImages: false,
  imageMode: "none",
  imageCount: 3,
  sendDocument: false,
  documentUrl: "",
  documentName: "",
  resumeHint: true,
  resumeHintText: "Quando quiser, seguimos de onde paramos."
};

export const DEFAULT_AGENT_INVENTORY = {
  enabled: true,
  productIds: [],
  reply: { ...DEFAULT_AGENT_INVENTORY_REPLY },
  productReplies: {},
  useSameMessage: false
};

export const INVENTORY_STRATEGY_PRESETS = [
  {
    id: "price_first",
    label: "Preço primeiro",
    hint: "Valor + disponibilidade",
    template: DEFAULT_INVENTORY_REPLY_TEMPLATE
  },
  {
    id: "benefit_then_price",
    label: "Benefício → preço",
    hint: "Contexto antes do valor",
    template: "{{descricao_ou_nome}}\n\nInvestimento: {{preco}}{{estoque_frase}}.{{link_frase}}"
  },
  {
    id: "scarcity",
    label: "Escassez suave",
    hint: "Estoque com naturalidade",
    template: "Sobre o *{{nome}}*: está {{estoque_status}} por {{preco}}.{{link_frase}}"
  },
  {
    id: "link_cta",
    label: "CTA com link",
    hint: "Convite à compra",
    template: "*{{nome}}* — {{preco}}{{estoque_frase}}.\n\nSe quiser, pode comprar por aqui: {{link}}"
  },
  {
    id: "catalog_brief",
    label: "Catálogo breve",
    hint: "Lista enxuta",
    template: "{{catalogo}}"
  },
  {
    id: "custom",
    label: "Personalizado",
    hint: "Seu template",
    template: ""
  }
];

export const INVENTORY_COMPACT_PRESET_IDS = [
  "price_first",
  "benefit_then_price",
  "link_cta",
  "custom"
];

export function normalizeInventoryReply(raw) {
  const base = { ...DEFAULT_AGENT_INVENTORY_REPLY };
  if (!raw || typeof raw !== "object") return base;
  let imageCount = Number(raw.imageCount != null ? raw.imageCount : base.imageCount);
  if (!Number.isFinite(imageCount) || imageCount < 1) imageCount = 1;
  if (imageCount > 6) imageCount = 6;
  return {
    ...base,
    ...raw,
    tone: ["formal", "consultivo", "amigavel", "direto"].includes(raw.tone) ? raw.tone : base.tone,
    strategyPreset: INVENTORY_STRATEGY_PRESETS.some((p) => p.id === raw.strategyPreset)
      ? raw.strategyPreset
      : base.strategyPreset,
    template: raw.template != null && String(raw.template).trim() ? String(raw.template) : base.template,
    includePrice: raw.includePrice !== false,
    includeStock: raw.includeStock !== false,
    includeLink: raw.includeLink !== false,
    includeDescription: !!raw.includeDescription,
    includeSku: !!raw.includeSku,
    sendImages: !!raw.sendImages,
    imageMode: ["none", "cover", "gallery", "first_n"].includes(raw.imageMode)
      ? raw.imageMode
      : base.imageMode,
    imageCount,
    sendDocument: !!raw.sendDocument,
    documentUrl: String(raw.documentUrl || ""),
    documentName: String(raw.documentName || ""),
    resumeHint: raw.resumeHint !== false,
    resumeHintText:
      raw.resumeHintText != null && String(raw.resumeHintText).trim()
        ? String(raw.resumeHintText)
        : base.resumeHintText
  };
}

export function normalizeAgentInventory(raw) {
  const base = {
    ...DEFAULT_AGENT_INVENTORY,
    reply: { ...DEFAULT_AGENT_INVENTORY_REPLY },
    productReplies: {}
  };
  if (!raw || typeof raw !== "object") return base;
  const productIds = Array.isArray(raw.productIds)
    ? raw.productIds.map((id) => Number(id)).filter((n) => Number.isFinite(n) && n > 0)
    : [];
  const productReplies = {};
  const src = raw.productReplies && typeof raw.productReplies === "object" ? raw.productReplies : {};
  Object.keys(src).forEach((key) => {
    productReplies[String(key)] = normalizeInventoryReply(src[key]);
  });
  return {
    enabled: raw.enabled !== false,
    productIds,
    reply: normalizeInventoryReply(raw.reply),
    productReplies,
    useSameMessage: !!raw.useSameMessage
  };
}

export function formatPrice(price, currency = "BRL") {
  const n = Number(price);
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

function stockStatusLabel(status, quantity) {
  const s = String(status || "").toLowerCase();
  if (s === "out_of_stock" || quantity <= 0) return "indisponível";
  if (s === "low_stock" || quantity <= 5) return "com poucas unidades";
  return "disponível";
}

function stockPhrase(status, quantity) {
  const s = String(status || "").toLowerCase();
  if (s === "out_of_stock" || quantity <= 0) return " (sem estoque no momento)";
  if (s === "low_stock" || quantity <= 5) return ` (restam ${quantity} un.)`;
  return ` (${quantity} em estoque)`;
}

function applyTemplate(template, vars) {
  let out = String(template || "");
  Object.keys(vars).forEach((key) => {
    const re = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
    out = out.replace(re, vars[key] ?? "");
  });
  return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Preview WhatsApp a partir do draft de reply + produto.
 */
export function buildInventoryWhatsAppPreview(replyRaw, product) {
  const reply = normalizeInventoryReply(replyRaw);
  const p = product || {};
  const qty = Number(p.quantity) || 0;
  const status = String(p.status || "in_stock");
  const price = reply.includePrice ? formatPrice(p.price, p.currency || "BRL") : "";
  const estoque = reply.includeStock ? String(qty) : "";
  const estoque_frase = reply.includeStock ? stockPhrase(status, qty) : "";
  const estoque_status = reply.includeStock ? stockStatusLabel(status, qty) : "";
  const link = reply.includeLink && p.buyLink ? String(p.buyLink) : "";
  const link_frase = reply.includeLink && p.buyLink ? ` Link: ${p.buyLink}` : "";
  const descricao = reply.includeDescription ? String(p.description || "").trim() : "";
  const descricao_ou_nome = descricao || String(p.name || "Produto");
  const sku = reply.includeSku && p.sku ? String(p.sku) : "";
  const catalogo = `1. *${p.name || "Produto"}* — ${price || formatPrice(p.price, p.currency)}`;

  let template = String(reply.template || "").trim();
  if (!template || reply.strategyPreset !== "custom") {
    const preset = INVENTORY_STRATEGY_PRESETS.find((x) => x.id === reply.strategyPreset);
    if (preset?.template) template = preset.template;
  }
  if (!template) template = DEFAULT_INVENTORY_REPLY_TEMPLATE;

  let text = applyTemplate(template, {
    nome: String(p.name || "Produto"),
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
  return text || "Sem preview";
}

export function stripInventoryTemplatePlaceholders(template) {
  return String(template || "")
    .replace(/\{\{\s*\w+\s*\}\}/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
