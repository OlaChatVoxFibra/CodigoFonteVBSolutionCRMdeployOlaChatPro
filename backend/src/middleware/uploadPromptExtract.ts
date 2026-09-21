/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import path from "path";
import fs from "fs";
import multer from "multer";
import { Request, Response, NextFunction } from "express";

const tmpRoot = path.resolve(__dirname, "..", "..", "tmp", "prompt-extract");

const MAX = 25 * 1024 * 1024;

export default function uploadPromptExtract(req: Request, res: Response, next: NextFunction): void {
  if (!fs.existsSync(tmpRoot)) {
    fs.mkdirSync(tmpRoot, { recursive: true });
  }
  const storage = multer.diskStorage({
    destination: (_r, _f, cb) => cb(null, tmpRoot),
    filename: (_r, file, cb) => {
      const base = (file.originalname || "file").replace(/[^\w.\-]+/g, "_").slice(0, 180);
      cb(null, `${Date.now()}_${base}`);
    }
  });
  multer({ storage, limits: { fileSize: MAX } }).single("file")(req, res, next);
}
