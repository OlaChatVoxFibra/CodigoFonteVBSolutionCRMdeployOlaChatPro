/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import type OpenAI from "openai";
import FigmaContextAgent from "../FigmaServices/FigmaContextAgent";
import {
  brainExportFigmaAssetsToGoogleDrive,
  brainGetFigmaDesignLanguage,
  brainGetFigmaFileSummary,
  brainListFigmaProjectsAndFiles,
  brainOpenFigmaNavigablePrototype,
  brainRenderFigmaNavigablePrototype,
  brainRenderFigmaPrototypeScreen
} from "../FigmaServices/figmaBrainService";
import { publishPrototypeFigmaHandoff } from "../FigmaServices/figmaHandoffService";
import { parseFigmaFileKey } from "../FigmaServices/figmaUrlUtils";
import { getFigmaIntegrationPublic } from "../FigmaServices/FigmaIntegrationService";
import { createFigmaServiceForCompany } from "../FigmaServices/FigmaService";

export const FIGMA_MCP_ID = "figma";

export const FIGMA_MCP_IDS = new Set([FIGMA_MCP_ID]);

export const FIGMA_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_figma_integration_status",
      description:
        "Verifica se o Figma está conectado e quais recursos estão habilitados (Brain, protótipos, comentários, design system).",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "list_figma_projects_and_files",
      description:
        "Lista times, projetos e arquivos Figma acessíveis pelo token da organização. Use primeiro para o usuário escolher um arquivo.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "get_figma_file_summary",
      description:
        "Resumo do arquivo (nome, páginas, link, componentes). fileKeyOrUrl: URL figma.com/file/... ou ID do arquivo.",
      parameters: {
        type: "object",
        properties: {
          fileKeyOrUrl: { type: "string", description: "URL ou fileKey do arquivo" }
        },
        required: ["fileKeyOrUrl"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_figma_design_context",
      description:
        "Páginas, frames, protótipo e comentários (conforme configuração). fileKeyOrUrl obrigatório.",
      parameters: {
        type: "object",
        properties: {
          fileKeyOrUrl: { type: "string" },
          pageId: { type: "string", description: "ID da página (opcional)" }
        },
        required: ["fileKeyOrUrl"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_figma_design_system",
      description: "Componentes publicados e variáveis (design tokens) do arquivo.",
      parameters: {
        type: "object",
        properties: {
          fileKeyOrUrl: { type: "string" }
        },
        required: ["fileKeyOrUrl"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_figma_prototype_flow",
      description:
        "Links de protótipo Figma, embed e mapa de interações. Para preview navegável use open_figma_navigable_prototype.",
      parameters: {
        type: "object",
        properties: {
          fileKeyOrUrl: { type: "string" }
        },
        required: ["fileKeyOrUrl"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_figma_file_nodes",
      description:
        "Detalhes de nós específicos (frames, componentes). nodeIds: IDs separados por vírgula (ex: 1:2,1:3).",
      parameters: {
        type: "object",
        properties: {
          fileKeyOrUrl: { type: "string" },
          nodeIds: {
            type: "string",
            description: "IDs dos nós, separados por vírgula"
          }
        },
        required: ["fileKeyOrUrl", "nodeIds"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_figma_comments",
      description: "Comentários do arquivo Figma (requer opção sincronizar comentários ativa).",
      parameters: {
        type: "object",
        properties: {
          fileKeyOrUrl: { type: "string" }
        },
        required: ["fileKeyOrUrl"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "export_figma_assets_to_google_drive",
      description:
        "Exporta frames do Figma como PNG/SVG/PDF e envia ao Google Drive da organização. Requer MCP google_drive ativo e Drive conectado. Também salva manifest.json com metadados do arquivo.",
      parameters: {
        type: "object",
        properties: {
          fileKeyOrUrl: { type: "string" },
          nodeIds: {
            type: "array",
            items: { type: "string" },
            description: "IDs dos frames (opcional; padrão: primeiros frames)"
          },
          format: {
            type: "string",
            enum: ["png", "jpg", "svg", "pdf"],
            description: "Formato de exportação"
          },
          scale: { type: "number", description: "Escala 1–4 para raster (padrão 2)" },
          driveFileNamePrefix: {
            type: "string",
            description: "Prefixo dos arquivos no Drive"
          }
        },
        required: ["fileKeyOrUrl"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_figma_design_language",
      description:
        "Extrai linguagem visual do arquivo Figma (frames de referência, componentes, tokens) para criar protótipo HTML ou código alinhado ao design system.",
      parameters: {
        type: "object",
        properties: {
          fileKeyOrUrl: {
            type: "string",
            description: "Arquivo de referência (URL ou fileKey)"
          }
        },
        required: ["fileKeyOrUrl"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "open_figma_navigable_prototype",
      description:
        "Abre protótipo JÁ EXISTENTE no Figma (clique entre telas no player Figma). Use quando o arquivo já tem fluxo de protótipo. Entrega preview embutido + link navegável.",
      parameters: {
        type: "object",
        properties: {
          fileKeyOrUrl: { type: "string", description: "Arquivo com protótipo no Figma" }
        },
        required: ["fileKeyOrUrl"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "render_figma_navigable_prototype",
      description:
        "Protótipo NAVEGÁVEL (HTML clicável) + exportações PNG por tela, PDF do fluxo e SVG. Padrão: html+png+pdf. Use quando pedirem protótipo, exportar PDF/PNG ou vários formatos.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          startScreenId: { type: "string", description: "ID da tela inicial" },
          referenceFileKeyOrUrl: { type: "string" },
          width: { type: "number" },
          height: { type: "number" },
          uploadToGoogleDrive: { type: "boolean" },
          exportFormats: {
            type: "array",
            items: {
              type: "string",
              enum: ["html", "png", "pdf", "svg"]
            },
            description:
              "Formatos extras além do HTML navegável (padrão: png e pdf)"
          },
          screens: {
            type: "array",
            description: "Telas do fluxo",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                html: { type: "string", description: "HTML da tela (use data-goto no botão/link)" }
              },
              required: ["id", "html"]
            }
          },
          flowLinks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                fromScreenId: { type: "string" },
                toScreenId: { type: "string" },
                label: { type: "string" },
                hotspotSelector: { type: "string" }
              },
              required: ["fromScreenId", "toScreenId"]
            }
          }
        },
        required: ["title", "screens"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "render_figma_prototype_screen",
      description:
        "Gera UMA tela estática em PNG (não navegável). Para protótipo com cliques use render_figma_navigable_prototype ou open_figma_navigable_prototype.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título do protótipo" },
          html: {
            type: "string",
            description: "HTML/CSS completo da tela (pode ser só o body)"
          },
          referenceFileKeyOrUrl: {
            type: "string",
            description: "Arquivo Figma usado como referência visual"
          },
          width: { type: "number", description: "Largura viewport (padrão 390)" },
          height: { type: "number", description: "Altura viewport (padrão 844)" },
          uploadToGoogleDrive: {
            type: "boolean",
            description: "Se true, também envia PNG ao Google Drive (MCP google_drive)"
          }
        },
        required: ["title", "html"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "publish_prototype_figma_handoff",
      description:
        "Quando o usuário pedir para LEVAR/SUBIR/CRIAR no Figma: salva HTML no Google Drive + guia de importação. A API Figma NÃO cria arquivo .fig automaticamente — use esta ferramenta e confirme o link do Drive. NUNCA diga que o upload para o Figma já terminou sem chamar esta ferramenta.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          htmlContent: { type: "string", description: "HTML completo do protótipo navegável" },
          projectHint: {
            type: "string",
            description: "Nome do projeto Figma destino, ex: Projeto de equipe"
          }
        },
        required: ["title", "htmlContent"]
      }
    }
  }
];

export function filterFigmaToolsForMcp(
  mcpConnections?: string[]
): OpenAI.Chat.Completions.ChatCompletionTool[] {
  if (!mcpConnections?.length) return [];
  const hasFigma = mcpConnections.some((id) => id === FIGMA_MCP_ID);
  return hasFigma ? FIGMA_TOOLS : [];
}

function resolveKeyArg(args: Record<string, unknown>): string {
  const raw = String(
    args.fileKeyOrUrl || args.fileKey || args.url || ""
  ).trim();
  const key = parseFigmaFileKey(raw);
  if (!key) {
    throw new Error(
      "fileKeyOrUrl inválido. Use a URL completa do Figma ou o ID do arquivo."
    );
  }
  return key;
}

export async function executeAiBrainFigmaTool(
  toolName: string,
  args: Record<string, unknown>,
  companyId: number
): Promise<string | null> {
  const figmaTools = new Set(
    FIGMA_TOOLS.map((t) => (t as { function: { name: string } }).function.name)
  );
  if (!figmaTools.has(toolName)) {
    return null;
  }

  try {
    switch (toolName) {
      case "list_figma_integration_status": {
        const pub = await getFigmaIntegrationPublic(companyId);
        return JSON.stringify(pub, null, 2);
      }
      case "list_figma_projects_and_files": {
        const data = await brainListFigmaProjectsAndFiles(companyId);
        return JSON.stringify(
          {
            success: true,
            ...data,
            instruction:
              "Apresente times/projetos/arquivos ao usuário. Use fileKey ou URL para as próximas ferramentas."
          },
          null,
          2
        );
      }
      case "get_figma_design_language": {
        const lang = await brainGetFigmaDesignLanguage(
          companyId,
          String(args.fileKeyOrUrl || args.fileKey || "")
        );
        return JSON.stringify(
          {
            success: true,
            ...lang,
            instruction:
              "Use este contexto para escrever HTML/CSS fiel ao design. Depois chame render_figma_prototype_screen. Pode também entregar código React na resposta."
          },
          null,
          2
        );
      }
      case "get_figma_file_summary": {
        const summary = await brainGetFigmaFileSummary(
          companyId,
          String(args.fileKeyOrUrl || args.fileKey || "")
        );
        return JSON.stringify({ success: true, ...summary }, null, 2);
      }
      case "render_figma_prototype_screen": {
        const result = await brainRenderFigmaPrototypeScreen({
          companyId,
          title: String(args.title || "Protótipo"),
          html: String(args.html || ""),
          width: args.width as number | undefined,
          height: args.height as number | undefined,
          referenceFileKeyOrUrl: args.referenceFileKeyOrUrl as string | undefined,
          uploadToGoogleDrive: Boolean(args.uploadToGoogleDrive)
        });
        if (!result.success || !result.fileData) {
          return JSON.stringify({
            success: false,
            error: result.error || "Falha ao renderizar protótipo."
          });
        }
        return JSON.stringify({
          success: true,
          message: `Protótipo "${result.fileData.title}" gerado em PNG.`,
          fileData: result.fileData,
          driveLinks: result.driveLinks,
          instruction:
            "O PNG foi anexado ao chat para o usuário. Descreva a tela e ofereça código React/HTML se pedido."
        });
      }
      case "get_figma_design_context": {
        const fileKey = resolveKeyArg(args);
        const agent = new FigmaContextAgent(companyId);
        const ctx = await agent.getVisualContext(fileKey, {
          pageId: args.pageId ? String(args.pageId) : undefined
        });
        return JSON.stringify({ success: true, ...ctx }, null, 2);
      }
      case "get_figma_design_system": {
        const fileKey = resolveKeyArg(args);
        const agent = new FigmaContextAgent(companyId);
        const ctx = await agent.getDesignSystemContext(fileKey);
        return JSON.stringify({ success: true, ...ctx }, null, 2);
      }
      case "open_figma_navigable_prototype": {
        const result = await brainOpenFigmaNavigablePrototype(
          companyId,
          String(args.fileKeyOrUrl || args.fileKey || "")
        );
        if (!result.success || !result.fileData) {
          return JSON.stringify({ success: false, error: result.error });
        }
        return JSON.stringify({
          success: true,
          fileData: result.fileData,
          flows: result.flows,
          instruction:
            "O preview navegável do Figma foi anexado ao chat. Inclua o link prototypeUrl na resposta."
        });
      }
      case "get_figma_prototype_flow": {
        const fileKey = resolveKeyArg(args);
        const ctx = await createFigmaServiceForCompany(companyId);
        if (!ctx) {
          return JSON.stringify({ success: false, error: "Figma não conectado." });
        }
        const proto = await ctx.service.getPrototypeLinks(fileKey);
        return JSON.stringify(
          {
            success: true,
            fileKey,
            ...proto,
            instruction:
              "Para abrir player navegável no chat use open_figma_navigable_prototype."
          },
          null,
          2
        );
      }
      case "render_figma_navigable_prototype": {
        const screens = Array.isArray(args.screens) ? args.screens : [];
        const result = await brainRenderFigmaNavigablePrototype({
          companyId,
          title: String(args.title || "Protótipo"),
          screens: screens as Array<{ id: string; title?: string; html: string }>,
          startScreenId: args.startScreenId as string | undefined,
          flowLinks: Array.isArray(args.flowLinks)
            ? (args.flowLinks as Array<{
                fromScreenId: string;
                toScreenId: string;
                label?: string;
                hotspotSelector?: string;
              }>)
            : undefined,
          width: args.width as number | undefined,
          height: args.height as number | undefined,
          referenceFileKeyOrUrl: args.referenceFileKeyOrUrl as string | undefined,
          uploadToGoogleDrive: Boolean(args.uploadToGoogleDrive),
          exportFormats: Array.isArray(args.exportFormats)
            ? (args.exportFormats as Array<"html" | "png" | "pdf" | "svg">)
            : undefined
        });
        if (!result.success || !result.fileData) {
          return JSON.stringify({ success: false, error: result.error });
        }
        const fd = result.fileData;
        const exportCount =
          fd.type === "prototype_package" ? fd.exports?.length || 0 : 0;
        const warnings =
          fd.type === "prototype_package" && fd.exportWarnings?.length
            ? fd.exportWarnings
            : result.exportWarnings;
        return JSON.stringify({
          success: true,
          message: `Protótipo navegável com ${fd.screenCount} tela(s)${
            exportCount ? ` + ${exportCount} exportação(ões)` : ""
          }.`,
          fileData: result.fileData,
          driveLinks: result.driveLinks,
          exportWarnings: warnings,
          instruction: warnings?.length
            ? "O HTML navegável foi gerado com sucesso. Informe que PNG/PDF falharam pelo motivo em exportWarnings e como corrigir (CHROME_PATH). Não diga que o protótipo inteiro falhou."
            : "Preview navegável no painel + botões de download PNG/PDF/HTML."
        });
      }
      case "get_figma_file_nodes": {
        const fileKey = resolveKeyArg(args);
        const ctx = await createFigmaServiceForCompany(companyId);
        if (!ctx) {
          return JSON.stringify({
            success: false,
            error: "Figma não conectado ou Brain sem permissão."
          });
        }
        const nodeIds = String(args.nodeIds || "")
          .split(",")
          .map(s => s.trim())
          .filter(Boolean);
        const nodes = await ctx.service.getFileNodes(fileKey, nodeIds);
        return JSON.stringify({ success: true, fileKey, nodes }, null, 2);
      }
      case "get_figma_comments": {
        const fileKey = resolveKeyArg(args);
        const ctx = await createFigmaServiceForCompany(companyId);
        if (!ctx) {
          return JSON.stringify({
            success: false,
            error: "Figma não conectado."
          });
        }
        if (!ctx.flags.enableCommentsSync) {
          return JSON.stringify({
            success: false,
            error: "Sincronizar comentários está desativado em Integrações → Figma."
          });
        }
        const comments = await ctx.service.getComments(fileKey);
        return JSON.stringify({ success: true, fileKey, comments }, null, 2);
      }
      case "export_figma_assets_to_google_drive": {
        const result = await brainExportFigmaAssetsToGoogleDrive({
          companyId,
          fileKeyOrUrl: String(args.fileKeyOrUrl || args.fileKey || ""),
          nodeIds: Array.isArray(args.nodeIds)
            ? (args.nodeIds as string[])
            : undefined,
          format: args.format as "png" | "jpg" | "svg" | "pdf" | undefined,
          scale: args.scale as number | undefined,
          driveFileNamePrefix: args.driveFileNamePrefix as string | undefined
        });
        if (!result.success) {
          return JSON.stringify({ success: false, error: result.error });
        }
        return JSON.stringify({
          success: true,
          accountEmail: result.accountEmail,
          uploaded: result.uploaded,
          prototypeUrl: result.prototypeUrl,
          instruction:
            "Confirme ao usuário os links webViewLink dos arquivos no Google Drive. Se pediu protótipo, inclua prototypeUrl."
        });
      }
      case "publish_prototype_figma_handoff": {
        const result = await publishPrototypeFigmaHandoff({
          companyId,
          title: String(args.title || "Protótipo"),
          htmlContent: String(args.htmlContent || ""),
          projectHint: args.projectHint as string | undefined
        });
        if (!result.success && !result.driveHtmlLink) {
          return JSON.stringify({
            success: false,
            error: result.error || "Falha ao publicar pacote para o Figma."
          });
        }
        return JSON.stringify({
          success: true,
          message:
            "Pacote publicado no Google Drive com guia para importar no Figma. A API do Figma não cria arquivos automaticamente.",
          fileData: {
            type: "figma_handoff",
            title: String(args.title || "Handoff Figma"),
            content: result.driveHtmlLink || "",
            driveHtmlLink: result.driveHtmlLink,
            driveReadmeLink: result.driveReadmeLink,
            figmaNewFileUrl: result.figmaNewFileUrl,
            steps: result.steps,
            figmaWorkspace: result.figmaWorkspace
          },
          instruction:
            "Confirme sucesso com links do Drive. Explique que o usuário deve criar/abrir o arquivo no Figma manualmente (plano gratuito pode limitar novos projetos). NÃO diga que o arquivo já apareceu no Figma."
        });
      }
      default:
        return null;
    }
  } catch (e: any) {
    return JSON.stringify({
      success: false,
      error: String(e?.message || e).slice(0, 800)
    });
  }
}
