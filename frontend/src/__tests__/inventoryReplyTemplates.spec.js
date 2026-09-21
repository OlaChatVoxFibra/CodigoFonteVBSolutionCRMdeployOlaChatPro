/**
 * Smoke tests for inventory reply templates (frontend helper).
 */
const {
  normalizeAgentInventory,
  normalizeInventoryReply,
  buildInventoryWhatsAppPreview,
  formatPrice,
  DEFAULT_AGENT_INVENTORY
} = require("../helpers/inventoryReplyTemplates");

describe("inventoryReplyTemplates", () => {
  it("normalizes defaults", () => {
    const inv = normalizeAgentInventory(null);
    expect(inv.enabled).toBe(true);
    expect(inv.productIds).toEqual([]);
    expect(inv.reply.strategyPreset).toBe("price_first");
  });

  it("builds whatsapp preview", () => {
    const reply = normalizeInventoryReply({
      strategyPreset: "price_first",
      includePrice: true,
      includeStock: true,
      resumeHint: true,
      resumeHintText: "Ok?"
    });
    const text = buildInventoryWhatsAppPreview(reply, {
      name: "Camiseta",
      price: 50,
      currency: "BRL",
      quantity: 2,
      status: "low_stock",
      buyLink: "https://x.com"
    });
    expect(text).toContain("Camiseta");
    expect(text).toContain("Ok?");
  });

  it("formatPrice", () => {
    expect(formatPrice(10, "BRL")).toMatch(/10/);
  });

  it("DEFAULT_AGENT_INVENTORY shape", () => {
    expect(DEFAULT_AGENT_INVENTORY.useSameMessage).toBe(false);
  });
});
