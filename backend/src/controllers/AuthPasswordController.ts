/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import authConfig from "../config/auth";
import User from "../models/User";

const getFrontendUrl = () => {
  return (
    process.env.FRONTEND_URL ||
    process.env.APP_URL ||
    "http://localhost:5174"
  ).replace(/\/+$/, "");
};

export const forgot = async (req: Request, res: Response): Promise<Response> => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "EMAIL_REQUIRED" });

  const user = await User.findOne({ where: { email } });
  if (!user) {
    return res.json({ ok: true });
  }

  const resetSecret =
    process.env.JWT_RESET_SECRET || authConfig.secret || "reset_secret";

  const token = jwt.sign(
    { id: user.id, email: user.email, companyId: user.companyId, jti: uuidv4() },
    resetSecret,
    { expiresIn: "1h" }
  );

  const link = `${getFrontendUrl()}/reset-password?token=${encodeURIComponent(
    token
  )}`;

  return res.json({ ok: true, redirectUrl: link });
};

export const reset = async (req: Request, res: Response): Promise<Response> => {
  const { token, password, confirmPassword } = req.body || {};
  if (!token || !password) {
    return res.status(400).json({ error: "INVALID_REQUEST" });
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({ error: "PASSWORDS_DONT_MATCH" });
  }

  try {
    const resetSecret =
      process.env.JWT_RESET_SECRET || authConfig.secret || "reset_secret";
    const payload = jwt.verify(token, resetSecret) as any;
    const userId = payload?.id;
    if (!userId) throw new Error("INVALID_TOKEN");

    const user = await User.findByPk(userId);
    if (!user) throw new Error("USER_NOT_FOUND");
    (user as any).password = password;
    await user.save();
    return res.json({ ok: true });
  } catch (err) {
    return res.status(400).json({ error: "INVALID_OR_EXPIRED_TOKEN" });
  }
};

export default { forgot, reset };
