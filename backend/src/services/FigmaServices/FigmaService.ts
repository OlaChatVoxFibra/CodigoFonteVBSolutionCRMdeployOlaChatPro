/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios, { AxiosInstance } from "axios";
import AppError from "../../errors/AppError";
import FigmaIntegration from "../../models/FigmaIntegration";
import { decryptFigmaCredential } from "./figmaCredentialCrypto";

const FIGMA_API = "https://api.figma.com/v1";

export type FigmaIntegrationFlags = {
  enableBrainAi: boolean;
  enablePrototypeAnalysis: boolean;
  enableCommentsSync: boolean;
  enableDesignSystem: boolean;
};

function client(token: string): AxiosInstance {
  return axios.create({
    baseURL: FIGMA_API,
    timeout: 30000,
    headers: {
      "X-Figma-Token": token,
      Accept: "application/json"
    }
  });
}

export class FigmaService {
  constructor(private readonly token: string) {}

  async getMe(): Promise<{
    id?: string;
    email?: string;
    handle?: string;
    teams?: Array<{ id: string; name: string }>;
  }> {
    const { data } = await client(this.token).get("/me");
    return {
      id: data?.id,
      email: data?.email,
      handle: data?.handle,
      teams: (data?.teams || []).map((t: any) => ({
        id: String(t.id),
        name: String(t.name || "")
      }))
    };
  }

  async testConnection(): Promise<{
    ok: boolean;
    email?: string;
    handle?: string;
    id?: string;
  }> {
    const api = client(this.token);
    try {
      const data = await this.getMe();
      return {
        ok: true,
        email: data?.email,
        handle: data?.handle,
        id: data?.id
      };
    } catch (e: any) {
      const status = e?.response?.status;
      const msg =
        status === 403
          ? "Token Figma sem permissão ou inválido."
          : status === 401
            ? "Credencial Figma inválida."
            : String(e?.response?.data?.err || e?.message || "Falha ao conectar com Figma.");
      throw new AppError(msg, status === 401 || status === 403 ? 422 : 502);
    }
  }

  async getFile(fileKey: string, depth?: number): Promise<any> {
    const params = depth != null ? { depth } : undefined;
    const { data } = await client(this.token).get(
      `/files/${encodeURIComponent(fileKey)}`,
      { params }
    );
    return data;
  }

  async getFileSummary(fileKey: string): Promise<Record<string, unknown>> {
    const file = await this.getFile(fileKey, 1);
    const pages = await this.getPages(fileKey);
    const componentsMeta = await this.getComponents(fileKey).catch(() => null);
    let styles: unknown = null;
    try {
      styles = await this.getFileStyles(fileKey);
    } catch {
      styles = null;
    }
    return {
      name: file?.name,
      lastModified: file?.lastModified,
      version: file?.version,
      role: file?.role,
      editorType: file?.editorType,
      link: `https://www.figma.com/file/${fileKey}`,
      pages,
      componentCount: componentsMeta?.meta?.components
        ? Object.keys(componentsMeta.meta.components).length
        : 0,
      stylesAvailable: Boolean(styles)
    };
  }

  async getFileNodes(fileKey: string, nodeIds: string[]): Promise<any> {
    const ids = nodeIds.map(String).filter(Boolean).slice(0, 50).join(",");
    if (!ids) {
      throw new AppError("Informe ao menos um nodeId.", 422);
    }
    const { data } = await client(this.token).get(
      `/files/${encodeURIComponent(fileKey)}/nodes`,
      { params: { ids } }
    );
    return data;
  }

  async getFileStyles(fileKey: string): Promise<any> {
    const { data } = await client(this.token).get(
      `/files/${encodeURIComponent(fileKey)}/styles`
    );
    return data;
  }

  async getRenderedImages(
    fileKey: string,
    nodeIds: string[],
    format: "png" | "jpg" | "svg" | "pdf" = "png",
    scale = 2
  ): Promise<{ images: Record<string, string | null> }> {
    const ids = nodeIds.map(String).filter(Boolean).slice(0, 20).join(",");
    if (!ids) {
      throw new AppError("Informe nodeIds para renderizar.", 422);
    }
    const { data } = await client(this.token).get(
      `/images/${encodeURIComponent(fileKey)}`,
      {
        params: {
          ids,
          format,
          scale: format === "svg" ? undefined : Math.min(Math.max(scale, 0.1), 4)
        }
      }
    );
    return { images: data?.images || {} };
  }

  async listWorkspaceFiles(): Promise<{
    account: { email?: string; handle?: string };
    teams: Array<{
      id: string;
      name: string;
      projects: Array<{
        id: string;
        name: string;
        files: Array<{
          key: string;
          name: string;
          lastModified?: string;
          thumbnailUrl?: string;
          projectId: string;
          projectName: string;
          teamId: string;
          teamName: string;
        }>;
      }>;
    }>;
    totalFiles: number;
  }> {
    const me = await this.getMe();
    const teamsOut: Array<{
      id: string;
      name: string;
      projects: Array<{
        id: string;
        name: string;
        files: Array<{
          key: string;
          name: string;
          lastModified?: string;
          thumbnailUrl?: string;
          projectId: string;
          projectName: string;
          teamId: string;
          teamName: string;
        }>;
      }>;
    }> = [];
    let totalFiles = 0;

    for (const team of me.teams || []) {
      const projects: typeof teamsOut[0]["projects"] = [];
      try {
        const { data: projData } = await client(this.token).get(
          `/teams/${encodeURIComponent(team.id)}/projects`
        );
        for (const project of projData?.projects || []) {
          const files: (typeof projects)[0]["files"] = [];
          try {
            const { data: filesData } = await client(this.token).get(
              `/projects/${encodeURIComponent(project.id)}/files`
            );
            for (const f of filesData?.files || []) {
              files.push({
                key: String(f.key),
                name: String(f.name || ""),
                lastModified: f.last_modified,
                thumbnailUrl: f.thumbnail_url,
                projectId: String(project.id),
                projectName: String(project.name || ""),
                teamId: team.id,
                teamName: team.name
              });
              totalFiles += 1;
            }
          } catch {
            /* projeto sem permissão */
          }
          projects.push({
            id: String(project.id),
            name: String(project.name || ""),
            files
          });
        }
      } catch {
        /* time sem permissão */
      }
      teamsOut.push({ id: team.id, name: team.name, projects });
    }

    return {
      account: { email: me.email, handle: me.handle },
      teams: teamsOut,
      totalFiles
    };
  }

  async getPages(fileKey: string): Promise<Array<{ id: string; name: string; type: string }>> {
    const file = await this.getFile(fileKey);
    const doc = file?.document;
    const pages =
      doc?.children?.filter((n: any) => n?.type === "CANVAS")?.map((n: any) => ({
        id: n.id,
        name: n.name,
        type: n.type
      })) || [];
    return pages;
  }

  async getFrames(
    fileKey: string,
    pageId?: string
  ): Promise<Array<{ id: string; name: string; type: string }>> {
    const file = await this.getFile(fileKey);
    const frames: Array<{ id: string; name: string; type: string }> = [];

    const walk = (node: any, onPage: boolean) => {
      if (!node) return;
      const isTargetPage = !pageId || node.id === pageId || onPage;
      if (isTargetPage && (node.type === "FRAME" || node.type === "COMPONENT")) {
        frames.push({ id: node.id, name: node.name, type: node.type });
      }
      if (node.children && Array.isArray(node.children)) {
        const childOnPage = onPage || node.id === pageId || node.type === "CANVAS";
        node.children.forEach((c: any) => walk(c, childOnPage));
      }
    };

    file?.document?.children?.forEach((page: any) => walk(page, false));
    return frames.slice(0, 200);
  }

  async getComponents(fileKey: string): Promise<any> {
    const { data } = await client(this.token).get(
      `/files/${encodeURIComponent(fileKey)}/components`
    );
    return data;
  }

  async getVariables(fileKey: string): Promise<any> {
    try {
      const { data } = await client(this.token).get(
        `/files/${encodeURIComponent(fileKey)}/variables/local`
      );
      return data;
    } catch (e: any) {
      if (e?.response?.status === 403 || e?.response?.status === 404) {
        return {
          meta: { unavailable: true, reason: "Variáveis exigem plano Figma com API de variables." },
          variables: []
        };
      }
      throw e;
    }
  }

  async getComments(fileKey: string): Promise<any> {
    const { data } = await client(this.token).get(
      `/files/${encodeURIComponent(fileKey)}/comments`
    );
    return data;
  }

  async getPrototypeLinks(fileKey: string): Promise<{
    prototypeUrl: string | null;
    embedUrl: string | null;
    pages: Array<{ id: string; name: string; prototypeStartNodeID?: string | null }>;
    flowStartingPoints: Array<{ nodeId: string; name: string }>;
    interactions: Array<{
      fromNodeId: string;
      fromNodeName: string;
      toNodeId: string;
      trigger?: string;
    }>;
  }> {
    const file = await this.getFile(fileKey);
    const pages =
      file?.document?.children
        ?.filter((n: any) => n?.type === "CANVAS")
        ?.map((n: any) => ({
          id: n.id,
          name: n.name,
          prototypeStartNodeID: n.prototypeStartNodeID || null
        })) || [];

    const flowStartingPoints: Array<{ nodeId: string; name: string }> = [];
    const interactions: Array<{
      fromNodeId: string;
      fromNodeName: string;
      toNodeId: string;
      trigger?: string;
    }> = [];

    const walk = (node: any) => {
      if (!node) return;
      if (Array.isArray(node.flowStartingPoints)) {
        for (const fp of node.flowStartingPoints) {
          if (fp?.nodeId) {
            flowStartingPoints.push({
              nodeId: String(fp.nodeId),
              name: String(fp.name || node.name || "")
            });
          }
        }
      }
      if (Array.isArray(node.reactions)) {
        for (const reaction of node.reactions) {
          const trigger = reaction?.trigger?.type;
          for (const action of reaction?.actions || []) {
            const dest =
              action?.destinationId ||
              action?.navigation?.destinationId ||
              action?.transitionNodeID;
            if (dest) {
              interactions.push({
                fromNodeId: String(node.id),
                fromNodeName: String(node.name || ""),
                toNodeId: String(dest),
                trigger
              });
            }
          }
        }
      }
      if (Array.isArray(node.children)) {
        node.children.forEach(walk);
      }
    };

    if (file?.document) walk(file.document);

    const startNode =
      flowStartingPoints[0]?.nodeId ||
      pages.find(p => p.prototypeStartNodeID)?.prototypeStartNodeID ||
      null;

    const prototypeUrl = startNode
      ? `https://www.figma.com/proto/${fileKey}?node-id=${encodeURIComponent(
          String(startNode).replace(/:/g, "-")
        )}&scaling=scale-down`
      : `https://www.figma.com/file/${fileKey}`;

    const embedUrl = startNode
      ? `https://www.figma.com/embed?embed_host=vbbrain&url=${encodeURIComponent(prototypeUrl)}`
      : `https://www.figma.com/embed?embed_host=vbbrain&url=${encodeURIComponent(
          `https://www.figma.com/file/${fileKey}`
        )}`;

    return {
      prototypeUrl,
      embedUrl,
      pages,
      flowStartingPoints,
      interactions: interactions.slice(0, 120)
    };
  }
}

export async function createFigmaServiceForCompany(
  companyId: number
): Promise<{ service: FigmaService; flags: FigmaIntegrationFlags } | null> {
  const row = await FigmaIntegration.findOne({ where: { workspaceId: companyId } });
  if (!row || row.status !== "connected" || !row.enableBrainAi) {
    return null;
  }
  const token = decryptFigmaCredential(row.credential || "") || "";
  if (!token.trim()) {
    return null;
  }
  return {
    service: new FigmaService(token.trim()),
    flags: {
      enableBrainAi: Boolean(row.enableBrainAi),
      enablePrototypeAnalysis: Boolean(row.enablePrototypeAnalysis),
      enableCommentsSync: Boolean(row.enableCommentsSync),
      enableDesignSystem: Boolean(row.enableDesignSystem)
    }
  };
}
