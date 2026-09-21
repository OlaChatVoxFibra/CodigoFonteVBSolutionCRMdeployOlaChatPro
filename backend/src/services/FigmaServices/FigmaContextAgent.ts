/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { createFigmaServiceForCompany } from "./FigmaService";

/**
 * Fornece contexto de design estruturado para o Brain AI e agentes futuros.
 */
export class FigmaContextAgent {
  constructor(private readonly companyId: number) {}

  private async resolve() {
    const ctx = await createFigmaServiceForCompany(this.companyId);
    if (!ctx) {
      throw new Error(
        "Figma não conectado ou Brain AI sem permissão. Conecte em Integrações → Figma."
      );
    }
    return ctx;
  }

  async getDesignSystemContext(fileKey: string): Promise<Record<string, unknown>> {
    const { service, flags } = await this.resolve();
    if (!flags.enableDesignSystem) {
      return { enabled: false, message: "Design System desativado nas configurações." };
    }
    const [components, variables] = await Promise.all([
      service.getComponents(fileKey),
      service.getVariables(fileKey)
    ]);
    return {
      enabled: true,
      fileKey,
      components: components?.meta || components,
      variables
    };
  }

  async getComponentLibrary(fileKey: string): Promise<Record<string, unknown>> {
    const { service, flags } = await this.resolve();
    if (!flags.enableDesignSystem) {
      return { components: [], message: "Design System desativado." };
    }
    return service.getComponents(fileKey);
  }

  async getPrototypeFlow(fileKey: string): Promise<Record<string, unknown>> {
    const { service, flags } = await this.resolve();
    if (!flags.enablePrototypeAnalysis) {
      return { enabled: false, message: "Análise de protótipos desativada." };
    }
    return service.getPrototypeLinks(fileKey);
  }

  async getDesignTokens(fileKey: string): Promise<Record<string, unknown>> {
    const { service, flags } = await this.resolve();
    if (!flags.enableDesignSystem) {
      return { variables: [], message: "Design System desativado." };
    }
    return service.getVariables(fileKey);
  }

  async getVisualContext(
    fileKey: string,
    options?: { pageId?: string }
  ): Promise<Record<string, unknown>> {
    const { service, flags } = await this.resolve();
    const pages = await service.getPages(fileKey);
    const frames = await service.getFrames(fileKey, options?.pageId);
    const payload: Record<string, unknown> = {
      fileKey,
      pages,
      frames: frames.slice(0, 80)
    };

    if (flags.enableCommentsSync) {
      try {
        payload.comments = await service.getComments(fileKey);
      } catch {
        payload.comments = [];
      }
    }

    if (flags.enablePrototypeAnalysis) {
      payload.prototype = await service.getPrototypeLinks(fileKey);
    }

    return payload;
  }

  /** Resumo compacto para o Brain montar HTML/React alinhado ao arquivo de referência. */
  async getDesignLanguage(fileKey: string): Promise<Record<string, unknown>> {
    const { service, flags } = await this.resolve();
    const summary = await service.getFileSummary(fileKey);
    const frames = (await service.getFrames(fileKey)).slice(0, 24);
    let componentNames: string[] = [];
    let colorHints: string[] = [];

    if (flags.enableDesignSystem) {
      try {
        const comp = await service.getComponents(fileKey);
        const map = comp?.meta?.components || comp?.components || {};
        componentNames = Object.values(map)
          .map((c: any) => String(c?.name || ""))
          .filter(Boolean)
          .slice(0, 40);
      } catch {
        componentNames = [];
      }
      try {
        const vars = await service.getVariables(fileKey);
        const collections = vars?.meta?.variableCollections || vars?.variableCollections || {};
        const variables = vars?.meta?.variables || vars?.variables || {};
        for (const v of Object.values(variables) as any[]) {
          const n = String(v?.name || "");
          if (n) colorHints.push(n);
        }
        void collections;
        colorHints = colorHints.slice(0, 30);
      } catch {
        colorHints = [];
      }
    }

    let prototype: Record<string, unknown> | null = null;
    if (flags.enablePrototypeAnalysis) {
      prototype = await service.getPrototypeLinks(fileKey);
    }

    return {
      fileKey,
      fileName: summary.name,
      link: summary.link,
      pages: summary.pages,
      referenceFrames: frames.map(f => ({ id: f.id, name: f.name, type: f.type })),
      componentNames,
      designTokenNames: colorHints,
      prototype,
      guidance:
        "Use estes nomes e padrões ao escrever HTML/CSS ou código React. Cores: infira a partir dos tokens ou mantenha paleta coerente com produto SaaS moderno."
    };
  }
}

export default FigmaContextAgent;
