/**
 * VB Solution CRM — Visão Business
 * Callback OAuth Google — apenas fluxo de login.
 */
import express from "express";
import { handleGoogleLoginCallbackRedirect } from "../controllers/GoogleLoginController";

export const googleOAuthCallbackRoutes = express.Router();

googleOAuthCallbackRoutes.get("/google/oauth/callback", async (req, res) => {
  const handledLogin = await handleGoogleLoginCallbackRedirect(req, res);
  if (handledLogin) return;
  const base = (process.env.FRONTEND_URL || "http://localhost:5181").replace(/\/$/, "");
  res.redirect(
    `${base}/login?google=error&message=${encodeURIComponent(
      "Fluxo Google Workspace removido deste pacote. Use o login Google apenas na tela de autenticação."
    )}`
  );
});

export default googleOAuthCallbackRoutes;
