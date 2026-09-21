/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export function extractIdeFilesFromGenerated(gf) {
  if (!gf) return [];

  if (gf.type === "code_workspace" && Array.isArray(gf.files)) {
    return gf.files
      .map((f) => ({
        path: String(f.path || "").replace(/^\/+/, ""),
        content: String(f.content ?? "")
      }))
      .filter((f) => f.path);
  }

  const files = [];
  const title = String(gf.title || "Projeto").trim();

  if (
    (gf.type === "prototype_html" || gf.type === "prototype_package") &&
    String(gf.content || "").trim()
  ) {
    files.push({ path: "index.html", content: String(gf.content) });
  }

  if (gf.type === "prototype_package" && Array.isArray(gf.exports)) {
    gf.exports.forEach((exp, idx) => {
      const format = String(exp.format || "").toLowerCase();
      const raw = String(exp.content || "").trim();
      if (!raw || format !== "html") return;
      const name = exp.fileName || `tela-${idx + 1}.html`;
      const path = name.includes("/") ? name.replace(/^\/+/, "") : `screens/${name}`;
      if (!files.some((f) => f.path === path)) files.push({ path, content: raw });
    });
  }

  if (files.length && !files.some((f) => f.path === "styles.css")) {
    files.push({ path: "styles.css", content: `/* ${title} */\nbody { margin: 0; }\n` });
  }
  if (files.length && !files.some((f) => f.path === "app.js")) {
    files.push({ path: "app.js", content: `// ${title}\n` });
  }

  return files;
}

export function shouldOpenInIdeBuild(gf) {
  if (!gf) return false;
  if (gf.type === "code_workspace") return Array.isArray(gf.files) && gf.files.length > 0;
  if (gf.type === "prototype_html" || gf.type === "prototype_package") {
    return Boolean(gf.content || gf.exports?.length);
  }
  return false;
}

export function toIdeBuildPayload(gf) {
  const files = extractIdeFilesFromGenerated(gf);
  if (!files.length) return null;
  return { files, title: gf.title || "Projeto IDE" };
}
