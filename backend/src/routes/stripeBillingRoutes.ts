/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";
import * as StripeBillingController from "../controllers/StripeBillingController";

const stripeBillingRoutes = express.Router();

stripeBillingRoutes.get(
  "/public/stripe/plans",
  StripeBillingController.listPlansPublic
);
stripeBillingRoutes.post(
  "/public/stripe/checkout",
  StripeBillingController.publicCheckout
);
stripeBillingRoutes.get(
  "/subscription/stripe/plans",
  isAuth,
  StripeBillingController.listPlans
);
stripeBillingRoutes.get(
  "/subscription/stripe/status",
  isAuth,
  StripeBillingController.status
);
stripeBillingRoutes.get(
  "/subscription/stripe/plans/enriched",
  isAuth,
  StripeBillingController.listPlansEnriched
);
stripeBillingRoutes.get(
  "/subscription/stripe/admin/plans",
  isAuth,
  StripeBillingController.adminPlansCatalog
);
stripeBillingRoutes.patch(
  "/subscription/stripe/admin/plans/:productKey/entitlements",
  isAuth,
  StripeBillingController.adminUpdatePlanEntitlements
);
stripeBillingRoutes.post(
  "/subscription/stripe/admin/plans/:productKey/prices",
  isAuth,
  StripeBillingController.adminUpdatePlanPrice
);
stripeBillingRoutes.post(
  "/subscription/stripe/admin/subscriptions",
  isAuth,
  StripeBillingController.adminCreateSubscription
);
stripeBillingRoutes.post(
  "/subscription/stripe/admin/subscriptions/:subscriptionId/cancel",
  isAuth,
  StripeBillingController.adminCancelSubscriptionHandler
);
stripeBillingRoutes.post(
  "/subscription/stripe/admin/subscriptions/:subscriptionId/reactivate",
  isAuth,
  StripeBillingController.adminReactivateSubscriptionHandler
);
stripeBillingRoutes.post(
  "/subscription/stripe/admin/invoices/:invoiceId/void",
  isAuth,
  StripeBillingController.adminVoidInvoiceHandler
);
stripeBillingRoutes.post(
  "/subscription/stripe/admin/invoices/:invoiceId/uncollectible",
  isAuth,
  StripeBillingController.adminMarkInvoiceUncollectibleHandler
);
stripeBillingRoutes.get(
  "/subscription/stripe/subscriptions/platform",
  isAuth,
  StripeBillingController.platformSubscriptions
);
stripeBillingRoutes.get(
  "/subscription/stripe/admin/subscribers",
  isAuth,
  StripeBillingController.adminUnifiedSubscribers
);
stripeBillingRoutes.post(
  "/subscription/stripe/checkout",
  isAuth,
  StripeBillingController.checkout
);
stripeBillingRoutes.get(
  "/subscription/stripe/pay",
  StripeBillingController.publicPay
);
stripeBillingRoutes.post(
  "/subscription/stripe-billing/webhook",
  StripeBillingController.webhook
);

export default stripeBillingRoutes;
