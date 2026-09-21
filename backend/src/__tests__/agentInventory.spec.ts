/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  DEFAULT_AGENT_INVENTORY_CONFIG,
  mergeInventoryReplyConfigs,
  normalizeAgentInventoryConfig,
  normalizeInventoryReplyConfig,
  resolveEffectiveInventoryReplyConfig,
  computeInventoryStatus
} from "../helpers/agentInventoryDefaults";
import {
  buildCatalogMessage,
  formatInventoryAgentReply,
  formatMoneyBRL,
  getAgentInventoryConfig,
  toInventoryPublicView
} from "../helpers/agentInventoryRuntime";
import { expandPromptV2ToLegacy, type PromptV2Body } from "../helpers/promptV2Payload";
import { findActionPresetBySlug, ACTION_PRESET_DEFS } from "../services/PromptServices/ActionPresetDefs";

describe("agent inventory defaults & merge", () => {
  it("normalizes reply with defaults", () => {
    const r = normalizeInventoryReplyConfig({});
    expect(r.tone).toBe("consultivo");
    expect(r.strategyPreset).toBe("price_first");
    expect(r.includePrice).toBe(true);
    expect(r.template).toContain("{{nome}}");
  });

  it("merges agent < product < override", () => {
    const effective = resolveEffectiveInventoryReplyConfig({
      agentReply: { template: "A {{nome}}", includePrice: true },
      productReplySettings: { includeStock: false, tone: "formal" },
      productOverride: { template: "OVERRIDE {{preco}}", strategyPreset: "custom" }
    });
    expect(effective.template).toContain("OVERRIDE");
    expect(effective.tone).toBe("formal");
    expect(effective.includeStock).toBe(false);
    expect(effective.strategyPreset).toBe("custom");
  });

  it("mergeInventoryReplyConfigs last wins", () => {
    const m = mergeInventoryReplyConfigs(
      { tone: "formal" },
      { tone: "amigavel" },
      { tone: "direto" }
    );
    expect(m.tone).toBe("direto");
  });

  it("computeInventoryStatus forces out when qty<=0", () => {
    expect(computeInventoryStatus(0, "in_stock")).toBe("out_of_stock");
    expect(computeInventoryStatus(3, "in_stock")).toBe("low_stock");
    expect(computeInventoryStatus(10, "in_stock")).toBe("in_stock");
  });

  it("normalizeAgentInventoryConfig empty productIds means all", () => {
    const cfg = normalizeAgentInventoryConfig({ enabled: true, productIds: [] });
    expect(cfg.productIds).toEqual([]);
    expect(cfg.enabled).toBe(true);
  });
});

describe("inventory format helpers", () => {
  it("formatMoneyBRL", () => {
    expect(formatMoneyBRL(10, "BRL")).toMatch(/10/);
  });

  it("builds catalog and formats reply", () => {
    const product = toInventoryPublicView({
      id: 1,
      name: "Produto X",
      price: 99.9,
      quantity: 4,
      currency: "BRL",
      status: "low_stock",
      sku: "SKU1",
      buyLink: "https://shop.example/x",
      description: "Ótimo item",
      image: null,
      images: [],
      replySettings: null
    });
    const catalog = buildCatalogMessage([product], 12);
    expect(catalog).toContain("Produto X");

    const reply = formatInventoryAgentReply({
      product,
      reply: normalizeInventoryReplyConfig({
        strategyPreset: "price_first",
        includePrice: true,
        includeStock: true,
        includeLink: true,
        resumeHint: true,
        resumeHintText: "Seguimos?"
      })
    });
    expect(reply).toContain("Produto X");
    expect(reply).toContain("Seguimos?");
  });

  it("getAgentInventoryConfig reads cerebro.guimoV2Inventory", () => {
    const prompt = {
      cerebro: {
        guimoV2Inventory: {
          enabled: true,
          productIds: [1, 2],
          useSameMessage: true,
          reply: { strategyPreset: "link_cta" }
        }
      }
    } as any;
    const cfg = getAgentInventoryConfig(prompt);
    expect(cfg.productIds).toEqual([1, 2]);
    expect(cfg.useSameMessage).toBe(true);
    expect(cfg.reply.strategyPreset).toBe("link_cta");
  });

  it("defaults when missing", () => {
    expect(getAgentInventoryConfig({} as any).enabled).toBe(
      DEFAULT_AGENT_INVENTORY_CONFIG.enabled
    );
  });
});

describe("prompt v2 inventory persistence", () => {
  it("expandPromptV2ToLegacy writes guimoV2Inventory", () => {
    const v2: PromptV2Body = {
      schemaVersion: 2,
      integration: { apiKey: "k" },
      agent: { name: "Agente" },
      generalRules: "regra",
      attendance: { script: "oi" },
      inventory: {
        enabled: true,
        productIds: [7],
        reply: normalizeInventoryReplyConfig({ strategyPreset: "scarcity" }),
        productReplies: { "7": normalizeInventoryReplyConfig({ tone: "direto" }) },
        useSameMessage: false
      }
    };
    const legacy = expandPromptV2ToLegacy(v2, { promptId: 1 });
    const cerebro = legacy.cerebro as any;
    expect(cerebro.guimoV2Inventory).toBeTruthy();
    expect(cerebro.guimoV2Inventory.productIds).toEqual([7]);
    expect(cerebro.guimoV2Inventory.reply.strategyPreset).toBe("scarcity");
    expect(String(legacy.prompt)).toContain("Inventário");
  });
});

describe("inventory smart action presets", () => {
  const slugs = [
    "consultarprodutos",
    "passarpreco",
    "consultarestoque",
    "enviarlinkproduto",
    "registrarintencaocompra"
  ];

  it("includes all 5 inventory presets", () => {
    slugs.forEach((slug) => {
      const p = findActionPresetBySlug(slug);
      expect(p).toBeTruthy();
      expect(p!.slug).toBe(slug);
    });
  });

  it("has exact trigger patterns for consultarprodutos", () => {
    const p = findActionPresetBySlug("consultarprodutos")!;
    expect(p.agentTriggerPatterns).toContain("temos os seguintes produtos");
    expect(p.userTriggerPatterns).toContain("quais produtos");
  });

  it("registrar_intencao_compra type is correct", () => {
    const p = findActionPresetBySlug("registrarintencaocompra")!;
    expect(p.type).toBe("registrar_intencao_compra");
  });

  it("ACTION_PRESET_DEFS length includes inventory", () => {
    expect(ACTION_PRESET_DEFS.length).toBeGreaterThanOrEqual(5);
  });
});
