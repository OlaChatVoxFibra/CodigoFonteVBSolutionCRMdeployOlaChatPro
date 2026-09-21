import {
  buildLocalCrmStripeCatalog,
  mergeCrmPlansWithStripeCatalog,
  stripeCheckoutUrl
} from "./stripeCatalogMerge";

describe("stripeCatalogMerge", () => {
  const catalog = [
    {
      key: "starter",
      type: "crm",
      prices: [
        {
          currency: "brl",
          interval: "monthly",
          unitAmount: 19700,
          paymentLink: "https://buy.stripe.com/starter-m"
        },
        {
          currency: "brl",
          interval: "annual",
          unitAmount: 15800,
          paymentLink: "https://buy.stripe.com/starter-a"
        }
      ]
    }
  ];

  it("retorna somente planos presentes no catálogo Stripe", () => {
    const plans = mergeCrmPlansWithStripeCatalog(catalog);
    expect(plans).toHaveLength(1);
    expect(plans[0].id).toBe("starter");
    expect(plans[0].prices.mensal).toBe(197);
    expect(plans[0].prices.anual).toBe(158);
  });

  it("usa catálogo local quando Stripe retorna vazio", () => {
    const plans = mergeCrmPlansWithStripeCatalog([]);
    expect(plans).toHaveLength(0);

    const local = buildLocalCrmStripeCatalog();
    const fallback = mergeCrmPlansWithStripeCatalog(local);
    expect(fallback.length).toBeGreaterThanOrEqual(3);
    expect(fallback.some(p => p.id === "starter")).toBe(true);
    expect(fallback[0].stripePrices?.mensal?.paymentLink).toContain("buy.stripe.com");
  });

  it("monta checkout url com email prefilled", () => {
    const url = stripeCheckoutUrl(catalog, "starter", "mensal", "test@vb.com");
    expect(url).toContain("prefilled_email=test%40vb.com");
    expect(url).toContain("starter-m");
  });
});
