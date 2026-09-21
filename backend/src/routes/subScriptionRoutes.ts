/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";

import * as SubscriptionController from "../controllers/SubscriptionController";

const subscriptionRoutes = express.Router();

subscriptionRoutes.post("/subscription",isAuth,SubscriptionController.createSubscription);

subscriptionRoutes.post("/subscription/create/webhook",SubscriptionController.createWebhook);
subscriptionRoutes.post("/subscription/webhook/:type?", SubscriptionController.webhook);
subscriptionRoutes.post("/subscription/webhook/pix/:type?", SubscriptionController.webhook);
subscriptionRoutes.post("/subscription/stripewebhook/:type?", SubscriptionController.stripewebhook);
subscriptionRoutes.post("/subscription/mercadopagowebhook/:type?", SubscriptionController.mercadopagowebhook);
subscriptionRoutes.post("/subscription/asaaswebhook/:type?", SubscriptionController.asaaswebhook);

export default subscriptionRoutes;
