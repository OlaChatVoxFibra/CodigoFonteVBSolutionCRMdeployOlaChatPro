/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { brainUploadBinaryToGoogleDrive } from "../GoogleAuthServices/googleDriveStub";
import { createFigmaServiceForCompany } from "./FigmaService";

/**
 * A API REST do Figma (Personal Access Token) não cria arquivos .fig no time.
 * Este serviço publica o pacote no Drive + links do workspace + passos claros de importação manual.
 */
export async function publishPrototypeFigmaHandoff(params: {
  companyId: number;
  title: string;
  htmlContent: string;
  projectHint?: string;
}): Promise<{
  success: boolean;
  driveHtmlLink?: string;
  driveReadmeLink?: string;
  figmaWorkspace?: {
    accountEmail?: string;
    teams: Array<{ id: string; name: string; projects: Array<{ id: string; name: string }> }>;
  };
  figmaNewFileUrl: string;
  steps: string[];
  error?: string;
}> {
  const title = String(params.title || "Protótipo VB Solution").trim();
  const html = String(params.htmlContent || "").trim();
  if (!html) {
    return { success: false, figmaNewFileUrl: "https://www.figma.com", steps: [], error: "HTML do protótipo vazio." };
  }

  const ctx = await createFigmaServiceForCompany(params.companyId);
  let accountEmail: string | undefined;
  let figmaWorkspace:
    | {
        accountEmail?: string;
        teams: Array<{ id: string; name: string; projects: Array<{ id: string; name: string }> }>;
      }
    | undefined;

  if (ctx) {
    try {
      const me = await ctx.service.getMe();
      accountEmail = me.email;
      const listed = await ctx.service.listWorkspaceFiles();
      figmaWorkspace = {
        accountEmail: listed.account.email,
        teams: listed.teams.map(t => ({
          id: t.id,
          name: t.name,
          projects: t.projects.map(p => ({ id: p.id, name: p.name }))
        }))
      };
    } catch {
      /* token ok mas listagem falhou */
    }
  }

  const safeName = title.replace(/[^\w\s-]/g, "").slice(0, 72) || "prototipo";
  const htmlUp = await brainUploadBinaryToGoogleDrive({
    companyId: params.companyId,
    fileName: `${safeName}.html`,
    mimeType: "text/html",
    buffer: Buffer.from(html, "utf8")
  });

  const readme = `# ${title}

Conta Figma: ${accountEmail || "—"}
Projeto sugerido: ${params.projectHint || "Projeto de equipe"}

## Importante
A API pública do Figma **não permite criar arquivos de design automaticamente** com Personal Access Token.
O pacote foi salvo no Google Drive. Siga os passos abaixo no Figma desktop ou web.

## Passos
1. Abra https://www.figma.com e entre na equipe **VISÃO BUSINESS** (ou sua equipe).
2. Clique em **+ Projeto** (se o plano permitir) ou abra o projeto existente **Projeto de equipe**.
3. Crie um novo arquivo de design ou abra um arquivo vazio.
4. Use o HTML navegável como referência visual (abra ${safeName}.html no navegador).
5. Recrie os frames ou use plugin de importação HTML→Figma se disponível na comunidade.
6. Para protótipo clicável dentro do Figma: conecte os frames no modo Prototype.

## Arquivo HTML
${htmlUp.webViewLink || "(conecte Google Drive no CRM para obter link)"}
`;

  const readmeUp = await brainUploadBinaryToGoogleDrive({
    companyId: params.companyId,
    fileName: `${safeName}-importar-no-figma.md`,
    mimeType: "text/markdown",
    buffer: Buffer.from(readme, "utf8")
  });

  const steps = [
    htmlUp.success
      ? `Pacote HTML salvo no Google Drive: ${htmlUp.webViewLink}`
      : "Conecte Google Drive em Integrações para receber o link do arquivo HTML.",
    "No Figma: equipe → projeto → novo arquivo de design (a API não cria o arquivo automaticamente).",
    "Use o HTML como referência visual e monte os frames / fluxo de protótipo no Figma.",
    readmeUp.success ? `Guia de importação: ${readmeUp.webViewLink}` : ""
  ].filter(Boolean);

  return {
    success: htmlUp.success || Boolean(figmaWorkspace),
    driveHtmlLink: htmlUp.webViewLink,
    driveReadmeLink: readmeUp.webViewLink,
    figmaWorkspace,
    figmaNewFileUrl: "https://www.figma.com/files/recent",
    steps
  };
}
