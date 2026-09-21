/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export const BRAIN_MCP_OPTIONS = [
  {
    id: "figma",
    name: "Figma",
    provider: "Figma",
    description: "Protótipo navegável + export PNG/PDF/SVG e design system.",
    accent: "#A259FF",
  },
  {
    id: "github",
    name: "GitHub",
    provider: "GitHub",
    description: "Issues, pull requests, leitura de código e publicação do IDE Build.",
    accent: "#24292F",
  },
];

export const BRAIN_CRM_MCP_OPTIONS = [];

export const ALL_BRAIN_MCP_IDS = BRAIN_MCP_OPTIONS.map((item) => item.id);

export function getBrainMcpById(id) {
  return BRAIN_MCP_OPTIONS.find((item) => item.id === id) || null;
}
