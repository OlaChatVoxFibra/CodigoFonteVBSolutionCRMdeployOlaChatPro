jest.mock("../models/PromptSmartAction", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn().mockResolvedValue([])
  }
}));

jest.mock("../utils/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));

import {
  classifyAgentOutboundHeuristic,
  classifyAgentOutbound,
  registerPendingIntents,
  isAgentIntentTriggerEnabled
} from "../services/PromptServices/IntentTriggerEngine";

describe("IntentTriggerEngine.classifyAgentOutboundHeuristic", () => {
  it("detects schedule from 'gostaria de agendar'", () => {
    const r = classifyAgentOutboundHeuristic("Gostaria de agendar um horário?");
    expect(r.some((i) => i.kind === "schedule")).toBe(true);
  });

  it("detects schedule from 'qual o melhor dia/horário?'", () => {
    const r = classifyAgentOutboundHeuristic("Qual o melhor dia para você?");
    expect(r.some((i) => i.kind === "schedule")).toBe(true);
  });

  it("detects transfer from 'vou te transferir'", () => {
    const r = classifyAgentOutboundHeuristic("Ok, vou te transferir para um atendente.");
    expect(r.some((i) => i.kind === "transfer")).toBe(true);
  });

  it("detects transfer from 'passar para um atendente'", () => {
    const r = classifyAgentOutboundHeuristic("Vou passar para um atendente humano.");
    expect(r.some((i) => i.kind === "transfer")).toBe(true);
  });

  it("does not detect create_lead from generic coleta (só gatilhos configurados na ação)", () => {
    const r = classifyAgentOutboundHeuristic("Me passe seu nome e e-mail, por favor.");
    expect(r.some((i) => i.kind === "create_lead")).toBe(false);
  });

  it("detects send_link", () => {
    const r = classifyAgentOutboundHeuristic("Aqui está o link para você acessar.");
    expect(r.some((i) => i.kind === "send_link")).toBe(true);
  });

  it("detects check_agenda", () => {
    const r = classifyAgentOutboundHeuristic("Vou verificar a agenda e te retorno.");
    expect(r.some((i) => i.kind === "check_agenda")).toBe(true);
  });

  it("ranks higher-confidence intents first", () => {
    const r = classifyAgentOutboundHeuristic(
      "Gostaria de agendar? Qual o melhor dia para você?"
    );
    expect(r[0].kind).toBe("schedule");
    expect(r[0].confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("returns empty for neutral text", () => {
    const r = classifyAgentOutboundHeuristic("Tudo certo por aí?");
    expect(r).toEqual([]);
  });

  it("does not duplicate same kind", () => {
    const r = classifyAgentOutboundHeuristic(
      "Gostaria de agendar? Vou marcar para você. Me passe o dia."
    );
    const scheduleCount = r.filter((i) => i.kind === "schedule").length;
    expect(scheduleCount).toBe(1);
  });
});

describe("IntentTriggerEngine.classifyAgentOutbound (with action resolution)", () => {
  it("classifies without prompt (graceful)", async () => {
    const ticket = { companyId: 1 } as any;
    const r = await classifyAgentOutbound("Gostaria de agendar?", null, ticket);
    expect(r.intents.length).toBe(1);
    expect(r.intents[0].kind).toBe("schedule");
    expect(r.source).toBe("heuristic");
  });
});

describe("IntentTriggerEngine.registerPendingIntents", () => {
  function makeTicket(initialDw: any = {}) {
    let dw = { ...initialDw };
    const t: any = {
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

  it("registers a fresh intent", async () => {
    const ticket = makeTicket();
    const pending = await registerPendingIntents(ticket as any, [
      {
        kind: "schedule",
        confidence: 0.9,
        satisfiedBy: "date",
        maxAgeMinutes: 30
      }
    ]);
    expect(pending.length).toBe(1);
    expect(pending[0].kind).toBe("schedule");
    expect(pending[0].registeredAt).toBeTruthy();
    expect(ticket.update).toHaveBeenCalledTimes(1);
  });

  it("does not duplicate same kind", async () => {
    const t = makeTicket();
    await registerPendingIntents(t as any, [
      { kind: "schedule", confidence: 0.7, satisfiedBy: "date", maxAgeMinutes: 30 }
    ]);
    const pending2 = await registerPendingIntents(t as any, [
      { kind: "schedule", confidence: 0.95, satisfiedBy: "date", maxAgeMinutes: 30 }
    ]);
    expect(pending2.length).toBe(1);
    expect(pending2[0].confidence).toBe(0.95);
  });

  it("expires stale intents past maxAge", async () => {
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const t = makeTicket({
      agentState: {
        pendingIntents: [
          {
            kind: "schedule",
            confidence: 0.8,
            satisfiedBy: "date",
            maxAgeMinutes: 30,
            registeredAt: past
          }
        ]
      }
    });
    const pending = await registerPendingIntents(t as any, []);
    expect(pending.length).toBe(0);
  });

  it("caps at 6 pending intents", async () => {
    const t = makeTicket();
    const kinds: any[] = [
      "schedule",
      "transfer",
      "create_lead",
      "send_link",
      "check_agenda",
      "consult_products",
      "passar_preco"
    ];
    await registerPendingIntents(
      t as any,
      kinds.map((k) => ({
        kind: k,
        confidence: 0.8,
        satisfiedBy: "any",
        maxAgeMinutes: 30
      }))
    );
    expect(t.dataWebhook.agentState.pendingIntents.length).toBeLessThanOrEqual(6);
  });
});

describe("IntentTriggerEngine.isAgentIntentTriggerEnabled", () => {
  const prev = process.env.AGENT_INTENT_TRIGGER_ENABLED;
  afterEach(() => {
    process.env.AGENT_INTENT_TRIGGER_ENABLED = prev;
  });

  it("returns false when env unset (gatilhos seguem switch da ação no agente)", () => {
    delete process.env.AGENT_INTENT_TRIGGER_ENABLED;
    expect(isAgentIntentTriggerEnabled()).toBe(false);
  });

  it("returns true when env explicitly enabled", () => {
    process.env.AGENT_INTENT_TRIGGER_ENABLED = "true";
    expect(isAgentIntentTriggerEnabled()).toBe(true);
  });
});
