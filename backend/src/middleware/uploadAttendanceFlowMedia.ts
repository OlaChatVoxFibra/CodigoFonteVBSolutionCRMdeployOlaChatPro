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

/** Limite solicitado (upload único, até 100 GB). Ajuste nginx/reverse-proxy conforme uso real. */
const MAX_FILE_BYTES = 100 * 1024 * 1024 * 1024;

export default function uploadAttendanceFlowMedia(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const companyId = (req as any).user?.companyId;
  if (!companyId) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  const dest = path.join(publicRoot, `company${companyId}`, "attendance-flow");
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (_r, _f, cb) => cb(null, dest),
    filename: (_r, file, cb) => {
      const base = (file.originalname || "file").replace(/[^\w.\-]+/g, "_").slice(0, 180);
      cb(null, `${Date.now()}_${base}`);
    }
  });

  multer({
    storage,
    limits: { fileSize: MAX_FILE_BYTES }
  }).single("file")(req, res, (err) => {
    if (err) {
      const code = (err as { code?: string }).code;
      if (code === "LIMIT_FILE_SIZE") {
        res.status(413).json({ error: "Arquivo acima do limite de 100 GB." });
        return;
      }
      res.status(400).json({ error: err.message || "Falha no upload" });
      return;
    }
    next();
  });
}

export { MAX_FILE_BYTES };
