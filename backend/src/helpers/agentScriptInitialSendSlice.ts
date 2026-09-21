/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** Remove bloco OBJEÇÕES (alinhado ao strip do roteiro). */
const RE_OBJEÇÕES_BLOCO = /(^|\n)\s*#?\s*OBJE[CÇ][AÃ]O(E)?S\b[\s\S]*/i;

/**
 * Trecho após "EXEMPLO DE RESPOSTA…" é simulação: fala do lead + RESPOSTA do agente **depois** da resposta real.
 * Na apresentação inicial da etapa, só enviar o que vem **antes** desse marcador.
 */
const RE_EXEMPLO_RESPOSTA_CUT = /EXEMPLO\s+DE\s+RESPOSTA/i;

/** Só a parte do roteiro que pode ser falada ao cliente neste turno (antes dos exemplos de treinamento). */
export function sliceAgentStepTextForInitialSend(stepText: string): string {
  let s = String(stepText || "").replace(/\r\n/g, "\n");
  s = s.replace(RE_OBJEÇÕES_BLOCO, "").trimEnd();
  const cut = s.search(RE_EXEMPLO_RESPOSTA_CUT);
  if (cut >= 0) s = s.slice(0, cut).trimEnd();
  return s;
}

/** Slug de comando de roteiro: /agendamento, /transferirchamado, etc. */
const RE_CMD_FULL_LINE = /^\/([a-zA-Z][a-zA-Z0-9_-]*)\s*$/;
/** Comando no fim da linha; exige espaço ou início antes de `/` (evita `...com/agendamento` em URL). */
const RE_CMD_LINE_TAIL = /(?:^|\s)\/([a-zA-Z][a-zA-Z0-9_-]*)\s*$/;

/** Uma linha do roteiro contém `/slug` isolado ou no final da linha. */
export function matchScriptCommandSlugFromLine(rawLine: string): string | null {
  const line = String(rawLine || "").replace(/\u200e/g, "").trim();
  if (!line) return null;
  let m = line.match(RE_CMD_FULL_LINE);
  if (!m) m = line.match(RE_CMD_LINE_TAIL);
  return m ? m[1] : null;
}

/**
 * Extrai slugs de comandos `/slug` de um bloco de texto (uma ou mais linhas).
 * Aceita linha só com o comando ou texto antes do comando no fim da linha.
 * Preserva ordem; remove duplicatas do mesmo slug.
 */
export function extractSlashCommandSlugsFromScriptBlock(block: string): string[] {
  const slugs: string[] = [];
  const seen = new Set<string>();
  for (const rawLine of String(block || "").split("\n")) {
    const slug = matchScriptCommandSlugFromLine(rawLine);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    slugs.push(slug);
  }
  return slugs;
}

/**
 * Linhas `/comando` que ficam após "EXEMPLO DE RESPOSTA" foram removidas do slice inicial (não são fala ao cliente).
 * Ainda assim precisam virar ações adiadas (agendamento, transferência, etc.) após a resposta do cliente.
 */
export function extractSlashCommandsFromTrainingTail(fullStepText: string): string[] {
  let s = String(fullStepText || "").replace(/\r\n/g, "\n");
  s = s.replace(RE_OBJEÇÕES_BLOCO, "").trimEnd();
  const cut = s.search(RE_EXEMPLO_RESPOSTA_CUT);
  if (cut < 0) return [];
  const tail = s.slice(cut);
  return extractSlashCommandSlugsFromScriptBlock(tail);
}

function slugLooksLikeAgendamento(slug: string): boolean {
  const l = String(slug || "").toLowerCase();
  return l === "agendamento" || l === "agendar" || l.includes("marcarhorario") || l.includes("marcar_horario");
}

/** Primeiro slug de comando no passo que parece agendamento (corpo ou tail após EXEMPLO). */
export function findAgendamentoSlugInStepScript(stepText: string): string | null {
  const raw = String(stepText || "");
  for (const s of extractSlashCommandSlugsFromScriptBlock(raw)) {
    if (slugLooksLikeAgendamento(s)) return s;
  }
  for (const s of extractSlashCommandsFromTrainingTail(raw)) {
    if (slugLooksLikeAgendamento(s)) return s;
  }
  return null;
}

export function stepScriptMentionsAgendamentoCommand(stepText: string): boolean {
  return findAgendamentoSlugInStepScript(stepText) != null;
}

function slugLooksLikeTransfer(slug: string): boolean {
  const l = String(slug || "").toLowerCase();
  return l.includes("transferir") || l.includes("transfer") || l === "transferirchamado" || l === "transferiratendimento";
}

/** Primeiro slug no passo que parece transferência (para inferir ação adiada perdida). */
export function findTransferSlugInStepScript(stepText: string): string | null {
  const raw = String(stepText || "");
  for (const s of extractSlashCommandSlugsFromScriptBlock(raw)) {
    if (slugLooksLikeTransfer(s)) return s;
  }
  for (const s of extractSlashCommandsFromTrainingTail(raw)) {
    if (slugLooksLikeTransfer(s)) return s;
  }
  return null;
}
