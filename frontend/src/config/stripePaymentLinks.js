/**
 * Payment Links Stripe — placeholders.
 * Configure no .env (PAYMENT_LINK_*) ou no painel Stripe do comprador.
 * Nenhum link LIVE da Visão Business vem embutido neste pacote.
 */
export const STRIPE_CRM_PAYMENT_LINKS = {
  mensal: {
    starter: "",
    essencial: "",
    pro: ""
  },
  anual: {
    starter: "",
    essencial: "",
    pro: ""
  }
};

export const STRIPE_BRAIN_PAYMENT_LINKS = {
  mensal: {
    starter: "",
    essencial: "",
    pro: ""
  },
  anual: {
    starter: "",
    essencial: "",
    pro: ""
  }
};

/** Tier interno → productKey Stripe (backend) */
export const BRAIN_TIER_TO_STRIPE_PRODUCT = {
  starter: "brain_lite",
  essencial: "brain_growth",
  pro: "brain_scale"
};

/** Valores exibidos nos cards — preencha conforme seus preços Stripe. */
export const STRIPE_CRM_DISPLAY_PRICES = {
  mensal: {
    starter: 0,
    essencial: 0,
    pro: 0
  },
  anual: {
    starter: 0,
    essencial: 0,
    pro: 0
  }
};
