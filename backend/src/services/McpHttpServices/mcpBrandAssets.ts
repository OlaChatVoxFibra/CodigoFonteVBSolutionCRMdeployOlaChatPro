/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import path from "path";
import fs from "fs";
import type { Express, Request, Response } from "express";
import { resolvePublicBackendUrl } from "../../utils/appUrlUtils";

const BRANDING_DIR = path.resolve(
  process.cwd(),
  "public",
  "branding"
);

function sendBrandFile(
  res: Response,
  filename: string,
  contentType: string
): void {
  const filePath = path.join(BRANDING_DIR, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).send("Not found");
    return;
  }
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.setHeader("Content-Type", contentType);
  res.sendFile(filePath);
}

export function resolveMcpLogoUrl(req?: Request): string {
  const base = resolvePublicBackendUrl(req).replace(/\/+$/, "");
  return `${base}/favicon.png`;
}

export function registerMcpBrandRoutes(app: Express): void {
  app.get("/favicon.ico", (_req, res) =>
    sendBrandFile(res, "favicon.ico", "image/x-icon")
  );
  app.get("/favicon.png", (_req, res) =>
    sendBrandFile(res, "favicon.png", "image/png")
  );
  app.get("/apple-touch-icon.png", (_req, res) =>
    sendBrandFile(res, "favicon.png", "image/png")
  );
  app.get("/branding/favicon.png", (_req, res) =>
    sendBrandFile(res, "favicon.png", "image/png")
  );
}
