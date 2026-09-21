/**
 * E2E (PR 17) — fluxo completo dos PRs 12-15 sem WhatsApp real:
 *  1. Agente diz "Gostaria de agendar?" → intent `schedule` registrada.
 *  2. Cliente responde "amanhã 14h" → resolver dispara `executeSmartAction('agendamento')`.
 *  3. Agente diz "Vou te transferir" → intent `transfer` registrada.
 *  4. Cliente responde "ok" → resolver dispara transferência.
 *  5. Outbound guard bloqueia duplicata exata.
 */

jest.mock("../utils/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));

const mockExecuteSmartAction = jest.fn();
jest.mock("../services/PromptServices/PromptSmartActionExecutorService", () => ({
  executeSmartAction: (...args: any[]) => mockExecuteSmartAction(...args)
}));

const mockApplyTransfer = jest.fn();
jest.mock("../services/IntegrationsServices/OpenAiService", () => ({
  applyPromptIntegrationAgentTransfer: (...args: any[]) => mockApplyTransfer(...args)
}));

jest.mock("../models/PromptSmartAction", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn().mockResolvedValue([
      { id: 11, type: "agendamento", slug: "agendamento" },
      { id: 12, type: "transferir", slug: "transferir" }
    ])
  }
}));

import {
  classifyAgentOutbound,
  registerPendingIntents
} from "../services/PromptServices/IntentTriggerEngine";
import { resolvePendingIntents } from "../services/PromptServices/PendingIntentResolver";
import {
  shouldSendOutbound,
  recordSentOutbound
} from "../services/PromptServices/AgentOutboundGuard";
import { normalizeTicketDataWebhook } from "../services/AgentProactiveServices/agentProactiveTicketState";

function makeTicket() {
  let dw: any = {};
  const t: any = {
    id: 999,
    companyId: 1,
    dataWebhook: dw,
    update: jest.fn(async ({ dataWebhook }: any) => {
      dw = dataWebhook;
      t.dataWebhook = dw;
    }),
    setDataValue: jest.fn((k: string, v: any) => {
      t[k] = v;
    })
  };
  return t;
}

describe("E2E: intent triggers + outbound guard", () => {
  beforeEach(() => {
    mockExecuteSmartAction.mockReset();
    mockApplyTransfer.mockReset();
  });

  it("schedule lifecycle: detect → register → resolve on customer date", async () => {
    const ticket = makeTicket();
    const prompt = { id: 1, queueId: 5 } as any;
    const contact = {} as any;

    // 1. Agente fala
    const cls1 = await classifyAgentOutbound(
      "Gostaria de agendar um horário?",
      prompt,
      ticket
    );
    expect(cls1.intents.find((i) => i.kind === "schedule")).toBeTruthy();

    // 2. Registra como pendente
    await registerPendingIntents(ticket, cls1.intents);
    expect(ticket.dataWebhook.agentState.pendingIntents[0].kind).toBe("schedule");
    expect(ticket.dataWebhook.agentState.pendingIntents[0].smartActionId).toBe(11);

    // 3. Cliente responde com data → resolver dispara executeSmartAction
    mockExecuteSmartAction.mockResolvedValue({ success: true, message: "Agendado" });
    const r = await resolvePendingIntents(ticket, contact, prompt, "amanhã 14h");
    expect(r.handled).toBe(true);
    expect(r.satisfiedKinds).toContain("schedule");
    expect(mockExecuteSmartAction).toHaveBeenCalledTimes(1);
    expect(mockExecuteSmartAction.mock.calls[0][0]).toBe("agendamento");
  });

  it("passes consolidated memory facts into resolved smart actions", async () => {
    const ticket = makeTicket();
    ticket.dataWebhook = {
      agentState: {
        conversationalMemory: {
          promptId: 1,
          knownFacts: {
            name: "Ana",
            email: "ana@exemplo.com",
            city: "Recife",
            preferredTime: "amanhã depois do almoço"
          },
          lastAssistantQuestion: "Qual melhor horário?",
          lastUserAnswer: "amanhã depois do almoço"
        }
      }
    };
    const prompt = { id: 1, queueId: 5 } as any;
    const contact = {} as any;

    const cls = await classifyAgentOutbound("Gostaria de agendar um horário?", prompt, ticket);
    await registerPendingIntents(ticket, cls.intents);
    mockExecuteSmartAction.mockResolvedValue({ success: true, message: "Agendado" });

    await resolvePendingIntents(ticket, contact, prompt, "amanhã depois do almoço");
    const variables = mockExecuteSmartAction.mock.calls[0][4];
    expect(variables.name).toBe("Ana");
    expect(variables.email).toBe("ana@exemplo.com");
    expect(variables.city).toBe("Recife");
    expect(variables.preferredTime).toBe("amanhã depois do almoço");
    expect(variables.date.getHours()).toBe(14);
  });

  it("schedule lifecycle: user asks with date in one message", async () => {
    const ticket = makeTicket();
    const prompt = { id: 1, queueId: 5 } as any;
    const contact = {} as any;

    mockExecuteSmartAction.mockResolvedValue({ success: true, message: "Agendado" });
    const r = await resolvePendingIntents(ticket, contact, prompt, "quero agendar amanhã às 10h");
    expect(r.handled).toBe(true);
    expect(r.satisfiedKinds).toContain("schedule");
    expect(mockExecuteSmartAction).toHaveBeenCalledWith(
      "agendamento",
      prompt,
      ticket,
      contact,
      expect.objectContaining({ scheduleAuthorized: true }),
      expect.any(Object)
    );
  });

  it("transfer lifecycle: detect → register → resolve on positive confirmation", async () => {
    const ticket = makeTicket();
    const prompt = { id: 1, queueId: 5 } as any;
    const contact = {} as any;

    const cls = await classifyAgentOutbound(
      "Vou te transferir para um atendente humano.",
      prompt,
      ticket
    );
    expect(cls.intents.find((i) => i.kind === "transfer")).toBeTruthy();
    await registerPendingIntents(ticket, cls.intents);

    mockExecuteSmartAction.mockResolvedValue({ success: true, message: "" });
    const dw = normalizeTicketDataWebhook(ticket.dataWebhook) as Record<string, any>;
    dw.agentState = {
      ...(dw.agentState || {}),
      conversationalMemory: {
        promptId: 1,
        lastAssistantQuestion: "Vou te transferir para um atendente humano."
      }
    };
    await ticket.update({ dataWebhook: dw });
    const r = await resolvePendingIntents(ticket, contact, prompt, "ok, pode transferir");
    expect(r.handled).toBe(true);
    expect(r.satisfiedKinds).toContain("transfer");
    expect(mockExecuteSmartAction).toHaveBeenCalled();
    expect(mockApplyTransfer).not.toHaveBeenCalled();
  });

  it("outbound guard blocks exact duplicate after recording", async () => {
    const ticket = makeTicket();
    await recordSentOutbound("Olá! Como posso ajudar?", ticket, 1);
    const r = shouldSendOutbound("Olá! Como posso ajudar?", ticket, 1);
    expect(r.send).toBe(false);
    expect(r.reason).toBe("duplicate-hash");
  });

  it("does not duplicate intent action via PendingIntent when script also fired", async () => {
    const ticket = makeTicket();
    const prompt = { id: 1, queueId: 5 } as any;
    const contact = {} as any;

    const cls = await classifyAgentOutbound("Gostaria de agendar?", prompt, ticket);
    await registerPendingIntents(ticket, cls.intents);

    // Simula roteiro disparando /agendamento agora há ~30s
    const dw = ticket.dataWebhook as any;
    dw.agentState = {
      ...(dw.agentState || {}),
      lastHandledAction: "11:agendamento:s3:agendamento",
      lastHandledAt: new Date(Date.now() - 30 * 1000).toISOString(),
      lastHandledOutcome: "success"
    };
    ticket.dataWebhook = dw;

    const r = await resolvePendingIntents(ticket, contact, prompt, "amanhã 10h");
    expect(mockExecuteSmartAction).not.toHaveBeenCalled();
    expect(r.satisfiedKinds).toContain("schedule");
  });

  it("never sends an intent twice (idempotent register)", async () => {
    const ticket = makeTicket();
    const prompt = { id: 1, queueId: 5 } as any;

    const c1 = await classifyAgentOutbound("Gostaria de agendar?", prompt, ticket);
    await registerPendingIntents(ticket, c1.intents);
    const c2 = await classifyAgentOutbound("Quer mesmo agendar?", prompt, ticket);
    await registerPendingIntents(ticket, c2.intents);
    const pi = ticket.dataWebhook.agentState.pendingIntents;
    expect(pi.length).toBe(1);
    expect(pi[0].kind).toBe("schedule");
  });
});
