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
      {
        id: 11,
        type: "agendamento",
        slug: "agendamento",
        enabled: true,
        userTriggerPatterns: ["quero agendar", "amanhã", "às 10h"]
      },
      {
        id: 12,
        type: "transferir",
        slug: "transferirchamado",
        enabled: true
      }
    ])
  }
}));

import { resolvePendingIntents } from "../services/PromptServices/PendingIntentResolver";

function makeTicket(pendingIntents: any[] = [], extraAgentState: any = {}) {
  let dw: any = { agentState: { pendingIntents, ...extraAgentState } };
  const t: any = {
    id: 100,
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

const FRESH_TS = () => new Date().toISOString();

describe("PendingIntentResolver", () => {
  beforeEach(() => {
    mockExecuteSmartAction.mockReset();
    mockApplyTransfer.mockReset();
  });

  it("returns handled=false when no pending intents", async () => {
    const ticket = makeTicket([]);
    const r = await resolvePendingIntents(ticket, {} as any, { id: 1, queueId: 5 } as any, "oi");
    expect(r.handled).toBe(false);
    expect(r.satisfiedKinds).toEqual([]);
  });

  it("resolves schedule when user passes concrete date", async () => {
    mockExecuteSmartAction.mockResolvedValue({ success: true, message: "Agendado para 15/05 14h" });
    const ticket = makeTicket([
      {
        kind: "schedule",
        confidence: 0.9,
        satisfiedBy: "date",
        maxAgeMinutes: 30,
        registeredAt: FRESH_TS(),
        smartActionId: 7
      }
    ]);
    const r = await resolvePendingIntents(
      ticket,
      {} as any,
      { id: 1, queueId: 5 } as any,
      "15/05 às 14h30"
    );
    expect(r.handled).toBe(true);
    expect(r.satisfiedKinds).toEqual(["schedule"]);
    expect(r.message).toMatch(/Agendado/);
    expect(mockExecuteSmartAction).toHaveBeenCalledTimes(1);
  });

  it("does NOT resolve schedule with vague period (keeps pending)", async () => {
    const ticket = makeTicket([
      {
        kind: "schedule",
        confidence: 0.9,
        satisfiedBy: "date",
        maxAgeMinutes: 30,
        registeredAt: FRESH_TS()
      }
    ]);
    const r = await resolvePendingIntents(
      ticket,
      {} as any,
      { id: 1, queueId: 5 } as any,
      "semana que vem"
    );
    expect(r.handled).toBe(false);
    expect(r.remainingIntents.length).toBe(1);
    expect(mockExecuteSmartAction).not.toHaveBeenCalled();
  });

  it("resolves transfer on positive confirmation after agent declared transfer", async () => {
    mockExecuteSmartAction.mockResolvedValue({ success: true, message: "" });
    const ticket = makeTicket(
      [
        {
          kind: "transfer",
          confidence: 0.95,
          satisfiedBy: "confirmation",
          maxAgeMinutes: 10,
          registeredAt: FRESH_TS()
        }
      ],
      {
        conversationalMemory: {
          promptId: 1,
          lastAssistantQuestion: "Vou te transferir para um atendente humano agora."
        }
      }
    );
    const r = await resolvePendingIntents(
      ticket,
      {} as any,
      { id: 1, queueId: 5 } as any,
      "sim, pode transferir"
    );
    expect(r.handled).toBe(true);
    expect(r.satisfiedKinds).toEqual(["transfer"]);
    expect(mockExecuteSmartAction).toHaveBeenCalledTimes(1);
    expect(mockApplyTransfer).not.toHaveBeenCalled();
  });

  it("does not transfer on generic sim without agent transfer offer", async () => {
    const ticket = makeTicket([
      {
        kind: "transfer",
        confidence: 0.95,
        satisfiedBy: "confirmation",
        maxAgeMinutes: 10,
        registeredAt: FRESH_TS()
      }
    ]);
    const r = await resolvePendingIntents(
      ticket,
      {} as any,
      { id: 1, queueId: 5 } as any,
      "sim"
    );
    expect(r.handled).toBe(false);
    expect(mockExecuteSmartAction).not.toHaveBeenCalled();
    expect(mockApplyTransfer).not.toHaveBeenCalled();
  });

  it("executes schedule when user asks with date without pending intent", async () => {
    mockExecuteSmartAction.mockResolvedValue({ success: true, message: "Agendado para amanhã 14h" });
    const ticket = makeTicket([]);
    const r = await resolvePendingIntents(
      ticket,
      {} as any,
      { id: 1, queueId: 5 } as any,
      "quero agendar amanhã às 14h"
    );
    expect(r.handled).toBe(true);
    expect(r.satisfiedKinds).toEqual(["schedule"]);
    expect(mockExecuteSmartAction).toHaveBeenCalledTimes(1);
    expect(mockExecuteSmartAction.mock.calls[0][0]).toBe("agendamento");
    expect(mockExecuteSmartAction.mock.calls[0][4].scheduleAuthorized).toBe(true);
  });

  it("transfers when user explicitly asks for human", async () => {
    mockExecuteSmartAction.mockResolvedValue({ success: true, message: "" });
    const ticket = makeTicket([]);
    const r = await resolvePendingIntents(
      ticket,
      {} as any,
      { id: 1, queueId: 5 } as any,
      "quero falar com um atendente humano"
    );
    expect(r.handled).toBe(true);
    expect(r.satisfiedKinds).toEqual(["transfer"]);
    expect(mockExecuteSmartAction).toHaveBeenCalledTimes(1);
  });

  it("does not transfer on negative reply", async () => {
    const ticket = makeTicket([
      {
        kind: "transfer",
        confidence: 0.95,
        satisfiedBy: "confirmation",
        maxAgeMinutes: 10,
        registeredAt: FRESH_TS()
      }
    ]);
    const r = await resolvePendingIntents(
      ticket,
      {} as any,
      { id: 1, queueId: 5 } as any,
      "não quero falar com atendente"
    );
    expect(r.handled).toBe(false);
    expect(mockApplyTransfer).not.toHaveBeenCalled();
  });

  it("does NOT re-dispatch schedule already handled by script in last 2 minutes", async () => {
    mockExecuteSmartAction.mockResolvedValue({ success: true });
    const ticket = makeTicket(
      [
        {
          kind: "schedule",
          confidence: 0.9,
          satisfiedBy: "date",
          maxAgeMinutes: 30,
          registeredAt: FRESH_TS(),
          smartActionId: 7
        }
      ],
      {
        lastHandledAction: "7:agendamento:s2:agendamento",
        lastHandledAt: new Date(Date.now() - 30 * 1000).toISOString(),
        lastHandledOutcome: "success"
      }
    );
    const r = await resolvePendingIntents(
      ticket,
      {} as any,
      { id: 1, queueId: 5 } as any,
      "15/05 às 14h"
    );
    expect(mockExecuteSmartAction).not.toHaveBeenCalled();
    expect(r.satisfiedKinds).toEqual(["schedule"]);
  });

  it("drops intent after 4 failed attempts", async () => {
    mockExecuteSmartAction.mockResolvedValue({ success: false, message: "falhou" });
    const ticket = makeTicket([
      {
        kind: "schedule",
        confidence: 0.9,
        satisfiedBy: "date",
        maxAgeMinutes: 30,
        registeredAt: FRESH_TS(),
        attempts: 3,
        smartActionId: 7
      }
    ]);
    const r = await resolvePendingIntents(
      ticket,
      {} as any,
      { id: 1, queueId: 5 } as any,
      "amanhã 10h"
    );
    expect(r.remainingIntents.length).toBe(0);
  });

  it("removes expired intents", async () => {
    const old = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const ticket = makeTicket([
      {
        kind: "transfer",
        confidence: 0.95,
        satisfiedBy: "confirmation",
        maxAgeMinutes: 10,
        registeredAt: old
      }
    ]);
    const r = await resolvePendingIntents(
      ticket,
      {} as any,
      { id: 1, queueId: 5 } as any,
      "sim"
    );
    expect(r.handled).toBe(false);
    expect(r.remainingIntents.length).toBe(0);
  });
});
