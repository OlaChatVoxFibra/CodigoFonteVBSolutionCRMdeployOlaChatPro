/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";
import * as UserController from "../controllers/UserController";
import * as SessionController from "../controllers/SessionController";
import * as PaymentConfirmationController from "../controllers/PaymentConfirmationController";
import * as AuthPasswordController from "../controllers/AuthPasswordController";
import * as WhiteLabelController from "../controllers/WhiteLabelController";
import * as GoogleLoginController from "../controllers/GoogleLoginController";

const authRoutes = express.Router();

authRoutes.post("/signup", UserController.store);
authRoutes.post("/login", SessionController.store);
authRoutes.get("/offline-status", SessionController.offlineStatus);
authRoutes.get("/google/status", GoogleLoginController.status);
authRoutes.get("/google/authorize", GoogleLoginController.authorize);
authRoutes.post("/google/complete", GoogleLoginController.complete);
authRoutes.post("/refresh_token", SessionController.update);
authRoutes.delete("/logout", isAuth, SessionController.remove);
authRoutes.get("/me", isAuth, SessionController.me);
authRoutes.post("/validate-cnpj", UserController.validateCnpj);
authRoutes.get("/confirm/by-email", PaymentConfirmationController.byEmail);
authRoutes.get("/confirm/:token", PaymentConfirmationController.show);
authRoutes.post(
  "/confirm/:token/acknowledge",
  isAuth,
  PaymentConfirmationController.acknowledgePaid
);
authRoutes.post("/confirm/:token", PaymentConfirmationController.consume);
authRoutes.post("/whitelabel/notify", WhiteLabelController.notify);
authRoutes.put("/whitelabel/domain", isAuth, WhiteLabelController.saveDomain);
authRoutes.post("/forgot-password", AuthPasswordController.forgot);
authRoutes.post("/reset-password", AuthPasswordController.reset);

export default authRoutes;
