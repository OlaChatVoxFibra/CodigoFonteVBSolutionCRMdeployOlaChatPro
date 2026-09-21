/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export interface BrainGeneratedFile {
  type:
    | "pdf"
    | "excel"
    | "json"
    | "presentation"
    | "image"
    | "png"
    | "prototype_html"
    | "prototype_package"
    | "figma_prototype"
    | "figma_handoff"
    | "code_workspace";
  title: string;
  content: string;
  columns?: string[];
  rows?: string[][];
  slides?: Array<{ title: string; content: string; notes?: string }>;
  width?: number;
  height?: number;
  screenCount?: number;
  referenceFileKey?: string;
  prototypeUrl?: string;
  embedUrl?: string;
  fileKey?: string;
  exports?: Array<{
    format: string;
    fileName: string;
    label: string;
    content: string;
    screenId?: string;
  }>;
  files?: Array<{ path: string; content: string }>;
  workspaceId?: number;
  openPreview?: boolean;
  driveHtmlLink?: string;
  driveReadmeLink?: string;
  figmaNewFileUrl?: string;
  steps?: string[];
}

const FILE_TOOLS = new Set([
  "generate_file",
  "render_figma_prototype_screen",
  "render_figma_navigable_prototype",
  "open_figma_navigable_prototype",
  "publish_prototype_figma_handoff",
  "code_sandbox_write_files",
  "code_sandbox_write_file"
]);

export type BrainCodeSnapshot = {
  projectTitle: string;
  files: Record<string, string>;
  fileOrder?: string[];
  workspaceId?: number;
};

export class BrainCodeSnapshotAccumulator {
  private files: Record<string, string> = {};
  private fileOrder: string[] = [];
  private projectTitle = "";
  private workspaceId?: number;

  absorb(file?: BrainGeneratedFile): void {
    if (!file?.files?.length) return;
    for (const f of file.files) {
      const path = String(f.path || "").replace(/^\/+/, "");
      if (!path) continue;
      this.files[path] = String(f.content ?? "");
      if (!this.fileOrder.includes(path)) this.fileOrder.push(path);
    }
    if (file.title) this.projectTitle = String(file.title).trim();
    if (file.workspaceId) this.workspaceId = file.workspaceId;
  }

  toSnapshot(): BrainCodeSnapshot | undefined {
    if (!Object.keys(this.files).length) return undefined;
    return {
      projectTitle: this.projectTitle || "IDE Build",
      files: { ...this.files },
      fileOrder: [...this.fileOrder],
      workspaceId: this.workspaceId
    };
  }
}

export function parseBrainToolGeneratedFile(
  toolName: string,
  result: string
): BrainGeneratedFile | undefined {
  if (!FILE_TOOLS.has(toolName)) return undefined;
  try {
    const parsed = JSON.parse(result);
    if (parsed?.success && parsed?.fileData) {
      return parsed.fileData as BrainGeneratedFile;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}
