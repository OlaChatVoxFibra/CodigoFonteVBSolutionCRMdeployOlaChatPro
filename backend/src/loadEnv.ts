/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Carrega .env sem depender do pacote dotenv (para quando node_modules está incompleto).
 */
import * as fs from "fs";
import * as path from "path";

const envPath = path.resolve(process.cwd(), process.env.NODE_ENV === "test" ? ".env.test" : ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eq = trimmed.indexOf("=");
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1).replace(/\\(.)/g, "$1");
        }
        if (!(key in process.env)) process.env[key] = val;
      }
    }
  }
}
