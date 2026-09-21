/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import fs from "fs";
import path from "path";

const WORKSPACE_ROOT = path.join(process.cwd(), "tmp", "brain-code");

export function getBrainCodeWorkspaceDir(
  companyId: number,
  userId: number,
  projectId?: number
): string {
  const suffix = projectId ? `${companyId}-${userId}-p${projectId}` : `${companyId}-${userId}`;
  return path.join(WORKSPACE_ROOT, suffix);
}

export async function syncBrainCodeWorkspace(
  companyId: number,
  userId: number,
  files: Record<string, string>,
  projectId?: number
): Promise<{ workspacePath: string; fileCount: number }> {
  const dir = getBrainCodeWorkspaceDir(companyId, userId, projectId);
  fs.mkdirSync(dir, { recursive: true });

  let count = 0;
  for (const [relPath, content] of Object.entries(files || {})) {
    const safe = String(relPath || "")
      .replace(/^\/+/, "")
      .replace(/\.\./g, "");
    if (!safe) continue;
    const full = path.join(dir, safe);
    const resolved = path.resolve(full);
    if (!resolved.startsWith(path.resolve(dir))) continue;
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, String(content ?? ""), "utf8");
    count += 1;
  }

  return { workspacePath: dir, fileCount: count };
}

export function listBrainCodeWorkspaceFiles(
  companyId: number,
  userId: number,
  projectId?: number
): string[] {
  const dir = getBrainCodeWorkspaceDir(companyId, userId, projectId);
  if (!fs.existsSync(dir)) return [];

  const out: string[] = [];
  const walk = (base: string, prefix: string) => {
    for (const name of fs.readdirSync(base)) {
      if (name === "node_modules" || name === ".git") continue;
      const full = path.join(base, name);
      const rel = prefix ? `${prefix}/${name}` : name;
      const st = fs.statSync(full);
      if (st.isDirectory()) walk(full, rel);
      else out.push(rel.replace(/\\/g, "/"));
    }
  };
  walk(dir, "");
  return out.sort();
}
