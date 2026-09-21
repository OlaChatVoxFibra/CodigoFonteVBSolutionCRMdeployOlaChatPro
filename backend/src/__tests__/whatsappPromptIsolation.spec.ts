import fs from "fs";
import path from "path";
import {
  attachPromptOwnerToPromptRow,
  resolveOwnedPromptBlobsForRuntime,
  auditPromptBlobField,
  PROMPT_JSON_OWNER_KEY
} from "../helpers/promptJsonOwner";
import { buildWhatsappPromptScopePreamble } from "../helpers/whatsappPromptPreamble";
import { syncTicketConnectionAiContext } from "../helpers/syncTicketConnectionAiContext";
import { pickAttendanceFlowStepRow } from "../helpers/pickAttendanceFlowStepRow";

describe("Isolamento Prompt / WhatsApp", () => {
  it("attachPromptOwnerToPromptRow injeta promptId nos três blobs", () => {
    const r = attachPromptOwnerToPromptRow(44, {
      cargo: { funcao: "Suporte" },
      cerebro: { qna: [] },
      produtividade: { actions: {} }
    });
    expect((r.cargo as Record<string, unknown>)[PROMPT_JSON_OWNER_KEY]).toBe(
      44
    );
    expect((r.cerebro as Record<string, unknown>)[PROMPT_JSON_OWNER_KEY]).toBe(
      44
    );
    expect(
      (r.produtividade as Record<string, unknown>)[PROMPT_JSON_OWNER_KEY]
    ).toBe(44);
  });

  it("resolveOwnedPromptBlobsForRuntime ignora cerebro com promptId divergente", () => {
    const r = resolveOwnedPromptBlobsForRuntime(
      44,
      {},
      { [PROMPT_JSON_OWNER_KEY]: 99, qna: [{ pergunta: "a", resposta: "b" }] },
      {},
      () => {}
    );
    expect(r.cerebro).toEqual({});
  });

  it("resolveOwnedPromptBlobsForRuntime mantém cerebro quando promptId coincide", () => {
    const r = resolveOwnedPromptBlobsForRuntime(
      44,
      {},
      { [PROMPT_JSON_OWNER_KEY]: 44, qna: [{ pergunta: "a", resposta: "b" }] },
      {},
      () => {}
    );
    expect(Array.isArray(r.cerebro.qna)).toBe(true);
    expect(r.cerebro.qna.length).toBe(1);
  });

  it("buildWhatsappPromptScopePreamble inclui id e nome do agente", () => {
    const s = buildWhatsappPromptScopePreamble({
      id: 44,
      name: "Agente Vendas"
    });
    expect(s).toContain("44");
    expect(s).toContain("Agente Vendas");
  });

  it("wbotMessageListener não usa getAgentPromptExtensionsForChat (caminho IA por conexão)", () => {
    const f = path.join(
      __dirname,
      "../services/WbotServices/wbotMessageListener.ts"
    );
    const src = fs.readFileSync(f, "utf8");
    expect(src.includes("getAgentPromptExtensionsForChat")).toBe(false);
  });

  it("dois agentes (ex.: vendas vs RH) produzem préâmbulos distintos com IDs corretos", () => {
    const vendas = buildWhatsappPromptScopePreamble({ id: 10, name: "Vendas" });
    const rh = buildWhatsappPromptScopePreamble({ id: 20, name: "RH" });
    expect(vendas).toContain("ID do agente (prompt): 10");
    expect(rh).toContain("ID do agente (prompt): 20");
    expect(vendas).not.toEqual(rh);
  });

  it("snapshot: préâmbulo do agente 44 (estabilidade do texto de isolamento)", () => {
    expect(buildWhatsappPromptScopePreamble({ id: 44, name: "Agente Teste" }))
      .toMatchInlineSnapshot(`
      "--- Agente ativo (exclusivo desta conexão) ---
      ID do agente (prompt): 44
      Nome: Agente Teste
      Regras de isolamento (obrigatório):
      - Use somente o texto deste agente: Regras Gerais, roteiro (etapas/script), cérebro/base, actions e file_search quando existir para ESTE promptId.
      - Não invente preços, prazos, políticas, nomes de produtos, nem dados de outra empresa, outro agente ou conhecimento genérico que não apareça nesses blocos.
      - Se algo não estiver escrito aqui, diga que não tem essa informação no material do agente ou faça uma pergunta neutra para seguir o roteiro — não preencha lacunas com suposições.
      ---
      "
    `);
  });
});

describe("syncTicketConnectionAiContext (política de histórico ao trocar agente)", () => {
  it("sem contexto gravado apenas define promptId da conexão", async () => {
    const ticket: any = {
      id: 1,
      dataWebhook: {},
      update: jest.fn().mockResolvedValue(undefined),
      setDataValue: jest.fn()
    };
    const r = await syncTicketConnectionAiContext(ticket, 44);
    expect(r.historyAnchorAt).toBeNull();
    expect(ticket.update).toHaveBeenCalledTimes(1);
    const next = ticket.update.mock.calls[0][0].dataWebhook;
    expect(next.connectionAiContext.promptId).toBe(44);
  });

  it("troca de promptId na conexão ancora histórico e remove attendanceFlow", async () => {
    const ticket: any = {
      id: 2,
      dataWebhook: {
        connectionAiContext: { promptId: 10 },
        attendanceFlow: { promptId: 10, lastPresentedStep: 2 }
      },
      update: jest.fn().mockResolvedValue(undefined),
      setDataValue: jest.fn()
    };
    const r = await syncTicketConnectionAiContext(ticket, 99);
    expect(r.historyAnchorAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const next = ticket.update.mock.calls[0][0].dataWebhook;
    expect(next.connectionAiContext.promptId).toBe(99);
    expect(next.connectionAiContext.historyAnchorAt).toBe(r.historyAnchorAt);
    expect(next.attendanceFlow).toBeUndefined();
  });
});

describe("Fluxo visual — metadado por agente no passo", () => {
  it("pickAttendanceFlowStepRow grava _agentPromptId em conditions quando conditions é objeto", () => {
    const row = pickAttendanceFlowStepRow(
      { stepNumber: 1, agentPrompt: "Olá", conditions: {} },
      44
    );
    expect((row.conditions as Record<string, unknown>)._agentPromptId).toBe(44);
  });
});

describe("auditPromptBlobField (script de verificação)", () => {
  it("classifica mismatch, ok, vazio e legado sem dono", () => {
    expect(auditPromptBlobField(10, { promptId: 99, funcao: "x" })).toBe(
      "mismatch"
    );
    expect(auditPromptBlobField(10, { promptId: 10, funcao: "x" })).toBe("ok");
    expect(auditPromptBlobField(10, {})).toBe("empty");
    expect(auditPromptBlobField(10, { actions: {} })).toBe("legacy_no_owner");
  });
});
