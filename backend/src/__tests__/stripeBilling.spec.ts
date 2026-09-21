import {
  isProductConfiguredInStripe,
  listConfiguredCatalogProducts,
  normalizeInterval,
  resolvePriceId,
  resolveProductKeyFromPriceId,
  listCatalogProducts
} from "../config/stripeBilling";

describe("stripeBilling catalog", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.STRIPE_PRICE_STARTER_BRL_MONTHLY = "price_starter_m";
    process.env.STRIPE_PRICE_STARTER_BRL_ANNUAL = "price_starter_a";
    process.env.PAYMENT_LINK_ESSENCIAL_BRL_MONTHLY = "https://buy.stripe.com/test-essencial";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("normaliza intervalos anual e mensal", () => {
    expect(normalizeInterval("anual")).toBe("annual");
    expect(normalizeInterval("yearly")).toBe("annual");
    expect(normalizeInterval("mensal")).toBe("monthly");
  });

  it("resolve priceId a partir das variáveis de ambiente", () => {
    expect(resolvePriceId("starter", "brl", "monthly")).toBe("price_starter_m");
    expect(resolvePriceId("starter", "brl", "annual")).toBe("price_starter_a");
    expect(resolvePriceId("pro", "brl", "monthly")).toBeNull();
  });

  it("mapeia priceId de volta para productKey", () => {
    expect(resolveProductKeyFromPriceId("price_starter_m")).toBe("starter");
    expect(resolveProductKeyFromPriceId("unknown")).toBeNull();
  });

  it("filtra apenas produtos configurados na Stripe (BRL)", () => {
    const crm = listConfiguredCatalogProducts({ type: "crm" });
    const keys = crm.map(p => p.key);
    expect(keys).toContain("starter");
    expect(keys).toContain("essencial");
    expect(keys).not.toContain("brain_lite");
  });

  it("identifica produto configurado quando há priceId ou payment link", () => {
    const starter = listCatalogProducts().find(p => p.key === "starter");
    const pro = listCatalogProducts().find(p => p.key === "pro");
    expect(starter && isProductConfiguredInStripe(starter)).toBe(true);
    expect(pro && isProductConfiguredInStripe(pro)).toBe(false);
  });
});
