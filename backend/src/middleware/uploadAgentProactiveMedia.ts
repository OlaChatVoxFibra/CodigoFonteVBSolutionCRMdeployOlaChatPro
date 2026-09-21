/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import path from "path";
import fs from "fs";
import multer from "multer";
import { Request, Response, NextFunction } from "express";

const publicRoot = path.resolve(__dirname, "..", "..", "public");

/**
 * Upload para public/company{id}/agent-proactive/ (usado nas mídias proativas, sem URL externa).
 */
export default function uploadAgentProactiveMedia(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const companyId = (req as any).user?.companyId;
  if (!companyId) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  const dest = path.join(publicRoot, `company${companyId}`, "agent-proactive");
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (_r, _f, cb) => cb(null, dest),
    filename: (_r, file, cb) => {
      const base = (file.originalname || "file").replace(/[^\w.\-]+/g, "_").slice(0, 120);
      cb(null, `${Date.now()}_${base}`);
    }
  });

  multer({
    storage,
    limits: { fileSize: 30 * 1024 * 1024 }
  }).single("file")(req, res, next);
}
