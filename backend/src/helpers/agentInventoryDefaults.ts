/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export type InventoryImageMode = "none" | "cover" | "gallery" | "first_n";

export type AgentInventoryReplyConfig = {
  tone: "formal" | "consultivo" | "amigavel" | "direto";
  strategyPreset:
    | "price_first"
    | "benefit_then_price"
    | "scarcity"
    | "link_cta"
    | "catalog_brief"
    | "custom";
  template: string;
  includePrice: boolean;
  includeStock: boolean;
  includeLink: boolean;
  includeDescription: boolean;
  includeSku: boolean;
  sendImages: boolean;
  imageMode: InventoryImageMode;
  imageCount: number;
  sendDocument: boolean;
  documentUrl: string;
  documentName: string;
  resumeHint: boolean;
  resumeHintText: string;
};

export type AgentInventoryConfig = {
  enabled: boolean;
  productIds: number[];
  reply: AgentInventoryReplyConfig;
  productReplies: Record<string, AgentInventoryReplyConfig>;
  useSameMessage: boolean;
};

export const DEFAULT_INVENTORY_REPLY_TEMPLATE =
  "O *{{nome}}* custa {{preco}}{{estoque_frase}}.{{link_frase}}";

export const DEFAULT_AGENT_INVENTORY_REPLY: AgentInventoryReplyConfig = {
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

export const DEFAULT_AGENT_INVENTORY_CONFIG: AgentInventoryConfig = {
  enabled: true,
  productIds: [],
  reply: { ...DEFAULT_AGENT_INVENTORY_REPLY },
  productReplies: {},
  useSameMessage: false
};

export const INVENTORY_STRATEGY_PRESETS: Record<
  string,
  { id: string; label: string; hint: string; template: string }
> = {
  price_first: {
    id: "price_first",
    label: "Preço primeiro",
    hint: "Valor + disponibilidade",
    template: DEFAULT_INVENTORY_REPLY_TEMPLATE
  },
  benefit_then_price: {
    id: "benefit_then_price",
    label: "Benefício → preço",
    hint: "Contexto antes do valor",
    template: "{{descricao_ou_nome}}\n\nInvestimento: {{preco}}{{estoque_frase}}.{{link_frase}}"
  },
  scarcity: {
    id: "scarcity",
    label: "Escassez suave",
    hint: "Estoque com naturalidade",
    template: "Sobre o *{{nome}}*: está {{estoque_status}} por {{preco}}.{{link_frase}}"
  },
  link_cta: {
    id: "link_cta",
    label: "CTA com link",
    hint: "Convite à compra",
    template: "*{{nome}}* — {{preco}}{{estoque_frase}}.\n\nSe quiser, pode comprar por aqui: {{link}}"
  },
  catalog_brief: {
    id: "catalog_brief",
    label: "Catálogo breve",
    hint: "Lista enxuta",
    template: "{{catalogo}}"
  },
  custom: {
    id: "custom",
    label: "Personalizado",
    hint: "Seu template",
    template: ""
  }
};

export function normalizeInventoryReplyConfig(
  raw?: Partial<AgentInventoryReplyConfig> | null
): AgentInventoryReplyConfig {
  const base = { ...DEFAULT_AGENT_INVENTORY_REPLY };
  if (!raw || typeof raw !== "object") return base;
  const tone = String(raw.tone || base.tone);
  const strategyPreset = String(raw.strategyPreset || base.strategyPreset);
  const imageMode = String(raw.imageMode || base.imageMode) as InventoryImageMode;
  let imageCount = Number(raw.imageCount != null ? raw.imageCount : base.imageCount);
  if (!Number.isFinite(imageCount) || imageCount < 1) imageCount = 1;
  if (imageCount > 6) imageCount = 6;
  return {
    tone: (["formal", "consultivo", "amigavel", "direto"].includes(tone)
      ? tone
      : base.tone) as AgentInventoryReplyConfig["tone"],
    strategyPreset: (Object.keys(INVENTORY_STRATEGY_PRESETS).includes(strategyPreset)
      ? strategyPreset
      : base.strategyPreset) as AgentInventoryReplyConfig["strategyPreset"],
    template:
      raw.template != null && String(raw.template).trim()
        ? String(raw.template)
        : base.template,
    includePrice: raw.includePrice !== false,
    includeStock: raw.includeStock !== false,
    includeLink: raw.includeLink !== false,
    includeDescription: !!raw.includeDescription,
    includeSku: !!raw.includeSku,
    sendImages: !!raw.sendImages,
    imageMode: (["none", "cover", "gallery", "first_n"].includes(imageMode)
      ? imageMode
      : base.imageMode) as InventoryImageMode,
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

export function normalizeAgentInventoryConfig(
  raw?: Partial<AgentInventoryConfig> | null
): AgentInventoryConfig {
  const base = {
    ...DEFAULT_AGENT_INVENTORY_CONFIG,
    reply: { ...DEFAULT_AGENT_INVENTORY_REPLY },
    productReplies: {} as Record<string, AgentInventoryReplyConfig>
  };
  if (!raw || typeof raw !== "object") return base;
  const productIds = Array.isArray(raw.productIds)
    ? raw.productIds.map((id) => Number(id)).filter((n) => Number.isFinite(n) && n > 0)
    : [];
  const productReplies: Record<string, AgentInventoryReplyConfig> = {};
  const srcReplies =
    raw.productReplies && typeof raw.productReplies === "object" ? raw.productReplies : {};
  Object.keys(srcReplies).forEach((key) => {
    productReplies[String(key)] = normalizeInventoryReplyConfig(
      (srcReplies as any)[key]
    );
  });
  return {
    enabled: raw.enabled !== false,
    productIds,
    reply: normalizeInventoryReplyConfig(raw.reply),
    productReplies,
    useSameMessage: !!raw.useSameMessage
  };
}

export function mergeInventoryReplyConfigs(
  ...layers: Array<Partial<AgentInventoryReplyConfig> | null | undefined>
): AgentInventoryReplyConfig {
  let merged = { ...DEFAULT_AGENT_INVENTORY_REPLY };
  layers.forEach((layer) => {
    if (!layer || typeof layer !== "object") return;
    merged = normalizeInventoryReplyConfig({ ...merged, ...layer });
  });
  return merged;
}

export function resolveEffectiveInventoryReplyConfig(opts: {
  agentReply?: Partial<AgentInventoryReplyConfig> | null;
  productReplySettings?: Partial<AgentInventoryReplyConfig> | null;
  productOverride?: Partial<AgentInventoryReplyConfig> | null;
}): AgentInventoryReplyConfig {
  return mergeInventoryReplyConfigs(
    opts.agentReply,
    opts.productReplySettings,
    opts.productOverride
  );
}

export function computeInventoryStatus(
  quantity: number,
  preferred?: string | null
): string {
  const qty = Number(quantity) || 0;
  const pref = String(preferred || "").trim();
  if (qty <= 0) return "out_of_stock";
  if (pref === "out_of_stock") return "out_of_stock";
  if (qty <= 5) {
    if (pref === "in_stock" || pref === "low_stock" || !pref) return "low_stock";
    return pref || "low_stock";
  }
  if (pref === "in_stock" || pref === "low_stock" || !pref) return "in_stock";
  return pref || "in_stock";
}
