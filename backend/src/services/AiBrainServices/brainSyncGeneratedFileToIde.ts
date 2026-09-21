/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import type { BrainGeneratedFile } from "./brainGeneratedFile";
import { streamAndPersistCodeFiles } from "./brainCodeStreamService";

function slugFileName(title: string, ext: string): string {
  const base = String(title || "tela")
    .replace(/[^\w\s-áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 48);
  return `${base || "tela"}.${ext}`;
}

export function extractIdeFilesFromGenerated(
  generated: BrainGeneratedFile
): Array<{ path: string; content: string }> {
  if (!generated) return [];

  if (generated.type === "code_workspace" && Array.isArray(generated.files)) {
    return generated.files
      .map((f) => ({
        path: String(f.path || "").replace(/^\/+/, ""),
        content: String(f.content ?? "")
      }))
      .filter((f) => f.path);
  }

  const files: Array<{ path: string; content: string }> = [];
  const title = String(generated.title || "Projeto").trim();

  if (
    (generated.type === "prototype_html" || generated.type === "prototype_package") &&
    String(generated.content || "").trim()
  ) {
    files.push({ path: "index.html", content: String(generated.content) });
  }

  if (generated.type === "prototype_package" && Array.isArray(generated.exports)) {
    generated.exports.forEach((exp, idx) => {
      const format = String(exp.format || "").toLowerCase();
      const raw = String(exp.content || "").trim();
      if (!raw) return;

      if (format === "html") {
        const name = exp.fileName || slugFileName(exp.label || `tela-${idx + 1}`, "html");
        const path = name.includes("/") ? name.replace(/^\/+/, "") : `screens/${name}`;
        if (!files.some((f) => f.path === path)) {
          files.push({ path, content: raw });
        }
        return;
      }

      if (format === "svg" && raw.includes("<svg")) {
        const name = exp.fileName || slugFileName(exp.label || `tela-${idx + 1}`, "svg");
        const path = name.includes("/") ? name.replace(/^\/+/, "") : `assets/${name}`;
        files.push({ path, content: raw });
      }
    });
  }

  if (files.length === 1 && files[0].path === "index.html" && !files.some((f) => f.path === "styles.css")) {
    files.push({
      path: "styles.css",
      content: `/* ${title} — estilos adicionais */\nbody { margin: 0; }\n`
    });
  }

  if (files.length && !files.some((f) => f.path === "app.js")) {
    files.push({
      path: "app.js",
      content: `// ${title}\nconsole.log("Brain IDE — ${title}");\n`
    });
  }

  return files;
}

export function shouldSyncGeneratedFileToIde(generated: BrainGeneratedFile): boolean {
  if (!generated) return false;
  if (generated.type === "code_workspace") return true;
  if (generated.type === "prototype_html" || generated.type === "prototype_package") {
    return Boolean(String(generated.content || "").trim() || generated.exports?.length);
  }
  return false;
}

export async function syncGeneratedFileToIdeBuild(params: {
  companyId: number;
  userId: number;
  brainProjectId?: number;
  generatedFile: BrainGeneratedFile;
}): Promise<BrainGeneratedFile> {
  const { companyId, userId, brainProjectId, generatedFile } = params;
  if (!brainProjectId || !shouldSyncGeneratedFileToIde(generatedFile)) {
    return generatedFile;
  }

  const files = extractIdeFilesFromGenerated(generatedFile);
  if (!files.length) return generatedFile;

  const title = String(generatedFile.title || "Projeto IDE").trim();

  try {
    const saved = await streamAndPersistCodeFiles({
      companyId,
      userId,
      brainProjectId,
      files,
      title
    });
    return {
      ...generatedFile,
      type: "code_workspace",
      title,
      files,
      workspaceId: saved.workspaceId,
      openPreview: true
    };
  } catch {
    return generatedFile;
  }
}
