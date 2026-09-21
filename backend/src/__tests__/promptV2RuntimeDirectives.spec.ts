import { WHATSAPP_AGENT_AGGREGATED_DOCUMENT_BRIDGE } from "../helpers/whatsappAgentConversationPolicy";
import {
  V2_RUNTIME_DIRECTIVES_PT,
  buildV2StructuredPromptText,
  buildAttendanceFlowStepsFromV2Script,
  splitAttendanceScriptIntoStepParts,
  expandPromptV2ToLegacy,
  resolveRuntimeAttendanceFlowStepRows,
  type PromptV2Body
} from "../helpers/promptV2Payload";

const minimalV2 = (): PromptV2Body => ({
  schemaVersion: 2,
  integration: { apiKey: "k" },
  agent: { name: "Teste", objective: "Atender" },
  generalRules: "Seja breve.",
  attendance: { script: "Pergunte o nome.\n/catalogo" },
  faq: [],
  faqEnabled: true,
  knowledge: { enabled: true, manualText: "", websites: [], sources: [] },
  knowledgeEnabled: true,
  smartActions: [],
  mediaLibrary: []
});

describe("V2 runtime directives in aggregated prompt", () => {
  it("exports non-empty Portuguese directives", () => {
    expect(V2_RUNTIME_DIRECTIVES_PT.length).toBeGreaterThan(200);
    expect(V2_RUNTIME_DIRECTIVES_PT).toContain("REGRAS GERAIS");
    expect(V2_RUNTIME_DIRECTIVES_PT).toContain("ROTEIRO");
    expect(V2_RUNTIME_DIRECTIVES_PT).toMatch(/Ordem|gatilhos|condições/i);
    expect(V2_RUNTIME_DIRECTIVES_PT).toMatch(/INTERRUPÇÕES/i);
  });

  it("exports aggregated document bridge for handleOpenAi", () => {
    expect(WHATSAPP_AGENT_AGGREGATED_DOCUMENT_BRIDGE.length).toBeGreaterThan(80);
    expect(WHATSAPP_AGENT_AGGREGATED_DOCUMENT_BRIDGE).toContain("Regras gerais");
    expect(WHATSAPP_AGENT_AGGREGATED_DOCUMENT_BRIDGE).toContain("/slug");
  });

  it("prepends directives to buildV2StructuredPromptText", () => {
    const text = buildV2StructuredPromptText(minimalV2(), 99);
    expect(text.startsWith("--- DIRETRIZES DE INTERPRETAÇÃO")).toBe(true);
    expect(text).toContain("## Identificação");
    expect(text).toContain("## Regras gerais — prioridade máxima");
    expect(text).toContain("## Roteiro — fluxo em linguagem natural");
    expect(text).toContain("Seja breve.");
    expect(text).toContain("/catalogo");
    expect(text.indexOf("--- DIRETRIZES")).toBeLessThan(text.indexOf("## Identificação"));
  });
});

describe("buildAttendanceFlowStepsFromV2Script", () => {
  it("returns one step when there is no blank-line paragraph break", () => {
    const steps = buildAttendanceFlowStepsFromV2Script("Linha a\nLinha b", "fb");
    expect(steps).toHaveLength(1);
    expect(steps[0].agentPrompt).toContain("Linha a");
  });

  it("does not split on double newline only (formatação dentro da mesma etapa)", () => {
    const steps = buildAttendanceFlowStepsFromV2Script(
      "Olá!\n\nQual data?\n\n/transferirchamado",
      "fb"
    );
    expect(steps).toHaveLength(1);
    expect(steps[0].agentPrompt).toContain("Qual data?");
  });

  it("splits on --- em linha própria", () => {
    const parts = splitAttendanceScriptIntoStepParts("A\n---\nB\n---\nC");
    expect(parts).toEqual(["A", "B", "C"]);
    const steps = buildAttendanceFlowStepsFromV2Script("A\n---\nB\n---\nC", "fb");
    expect(steps).toHaveLength(3);
    expect(steps[2].agentPrompt.trim()).toBe("C");
  });

  it("não divide etapa só por várias linhas em branco (formatação no mesmo passo)", () => {
    const steps = buildAttendanceFlowStepsFromV2Script("A\n\n\nB", "fb");
    expect(steps).toHaveLength(1);
    expect(steps[0].agentPrompt).toContain("A");
    expect(steps[0].agentPrompt).toContain("B");
  });

  it("divide em linha # PRÓXIMA ETAPA (sem usar espaço como separador)", () => {
    const parts = splitAttendanceScriptIntoStepParts("Intro\n# PRÓXIMA ETAPA\nCorpo");
    expect(parts).toEqual(["Intro", "Corpo"]);
    const steps = buildAttendanceFlowStepsFromV2Script("Intro\n# PRÓXIMA ETAPA\nCorpo", "fb");
    expect(steps).toHaveLength(2);
    expect(steps[1].agentPrompt.trim()).toBe("Corpo");
  });

  it("divide em linhas # ETAPA / # PASSO / # 1. Título", () => {
    expect(splitAttendanceScriptIntoStepParts("A\n# ETAPA 2\nB")).toEqual(["A", "B"]);
    expect(splitAttendanceScriptIntoStepParts("X\n# PASSO — confirmação\nY")).toEqual(["X", "Y"]);
    expect(splitAttendanceScriptIntoStepParts("Início\n# 1. Saudação\nOlá")).toEqual(["Início", "Olá"]);
  });

  it("expandPromptV2ToLegacy maps step numbers com separador ---", () => {
    const v2 = minimalV2();
    v2.attendance = { script: "A\n---\nB\n---\nC" };
    const legacy = expandPromptV2ToLegacy(v2, { promptId: 1 });
    expect(legacy.attendanceFlowSteps).toHaveLength(3);
    expect((legacy.attendanceFlowSteps as any[])[0].stepNumber).toBe(1);
    expect((legacy.attendanceFlowSteps as any[])[2].agentPrompt).toBe("C");
  });
});

describe("resolveRuntimeAttendanceFlowStepRows", () => {
  it("mescla script quando banco tem menos etapas que o roteiro salvo", () => {
    const rows = resolveRuntimeAttendanceFlowStepRows({
      attendanceFlowSteps: [{ stepNumber: 1, agentPrompt: "Fala, tudo bem?" }],
      attendanceScript: "Fala, tudo bem?\n---\nQual seu nome?\n---\nObrigado!",
      prompt: ""
    });
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows[0].agentPrompt).toContain("Fala");
    expect(rows[1].agentPrompt).toContain("nome");
  });

  it("expande linha única do banco quando agentPrompt contém ---", () => {
    const rows = resolveRuntimeAttendanceFlowStepRows({
      attendanceFlowSteps: [
        { stepNumber: 1, agentPrompt: "Fala, tudo bem?\n---\nQual seu nome?" }
      ],
      attendanceScript: "",
      prompt: ""
    });
    expect(rows.length).toBe(2);
    expect(rows[1].agentPrompt).toContain("nome");
  });

  it("prefere banco quando já cobre todas as etapas", () => {
    const rows = resolveRuntimeAttendanceFlowStepRows({
      attendanceFlowSteps: [
        { stepNumber: 1, agentPrompt: "Um" },
        { stepNumber: 2, agentPrompt: "Dois" }
      ],
      attendanceScript: "texto ignorado\n---\nextra",
      prompt: "x"
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].agentPrompt).toBe("Um");
    expect(rows[1].agentPrompt).toBe("Dois");
  });

  it("deriva etapas do attendanceScript quando tabela vazia", () => {
    const rows = resolveRuntimeAttendanceFlowStepRows({
      attendanceFlowSteps: [],
      attendanceScript: "A\n---\nB",
      prompt: ""
    });
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows[0].stepNumber).toBe(1);
    expect(rows[1].agentPrompt.trim()).toBe("B");
  });

  it("deriva do prompt quando há # ETAPA e script vazio", () => {
    const rows = resolveRuntimeAttendanceFlowStepRows({
      attendanceFlowSteps: [],
      attendanceScript: "",
      prompt: "Intro\n# ETAPA 2\nPergunta?"
    });
    expect(rows.length).toBe(2);
    expect(rows[1].agentPrompt).toContain("Pergunta");
  });

  it("divide roteiro VB Solution (ETAPA N — sem #) em múltiplas etapas", () => {
    const vbScript = `ETAPA 1 — Boas-vindas e início da conversa

Mensagem:

Fala, tudo bem? 😄

Aqui é o Leonardo Sena, Co-Founder da VBSolution CRM.

EXEMPLO DE RESPOSTA DO LEAD: "tráfego pago"

ETAPA 2 — Conexão com a realidade do lead

RESPOSTA:

Boa, faz total sentido 😄

EXEMPLO DE RESPOSTA DO LEAD: "sim"

ETAPA 3 — Descobrir como o lead trabalha hoje

RESPOSTA:

Entendi.`;

    const parts = splitAttendanceScriptIntoStepParts(vbScript);
    expect(parts.length).toBe(3);
    expect(parts[0]).toContain("Leonardo Sena");

    const rows = resolveRuntimeAttendanceFlowStepRows({
      attendanceFlowSteps: [{ stepNumber: 1, agentPrompt: "Fala, tudo bem?" }],
      attendanceScript: vbScript,
      prompt: ""
    });
    expect(rows.length).toBe(3);
    expect(rows[0].agentPrompt).toContain("Leonardo Sena");
    expect(rows[1].agentPrompt).toContain("total sentido");
  });
});
