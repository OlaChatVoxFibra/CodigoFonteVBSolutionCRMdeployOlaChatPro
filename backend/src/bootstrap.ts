/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { bootstrapFrontendEnvUrls } from "./utils/appUrlUtils";

const envFile =
  process.env.NODE_ENV === "test" ? ".env.test" : ".env";
const envPath = path.resolve(__dirname, "..", envFile);
dotenv.config({
  path: envPath
});

// Garante PORT do backend/.env (shell/frontend às vezes exporta PORT=5181 e o dotenv não sobrescreve)
try {
  if (fs.existsSync(envPath)) {
    const parsed = dotenv.parse(fs.readFileSync(envPath));
    if (parsed.PORT) {
      process.env.PORT = parsed.PORT;
    }
  }
} catch {}

try {
  // Railway: DATABASE_URL (privado) ou DATABASE_PUBLIC_URL (proxy público)
  const urlRaw =
    process.env.DATABASE_URL ||
    process.env.DATABASE_PUBLIC_URL ||
    process.env.RAILWAY_DATABASE_URL;
  const url = urlRaw ? urlRaw.replace(/\s+/g, "") : "";
  if (url) {
    process.env.DATABASE_URL = url; // normaliza p/ Sequelize + migrations
  }
  if (url && (!process.env.DB_HOST || !process.env.DB_NAME)) {
    const u = new URL(url);
    process.env.DB_DIALECT = process.env.DB_DIALECT || "postgres";
    process.env.DB_HOST = process.env.DB_HOST || u.hostname;
    process.env.DB_PORT = process.env.DB_PORT || (u.port || "5432");
    process.env.DB_USER = process.env.DB_USER || decodeURIComponent(u.username || "");
    process.env.DB_PASS = process.env.DB_PASS || decodeURIComponent(u.password || "");
    process.env.DB_NAME = process.env.DB_NAME || (u.pathname || "").replace("/", "");
    const host = u.hostname || "";
    if (!process.env.DB_SSL && (process.env.NODE_ENV === "production" || /rlwy\.net$/i.test(host))) {
      process.env.DB_SSL = "true";
    }
  }
} catch {}

bootstrapFrontendEnvUrls();
