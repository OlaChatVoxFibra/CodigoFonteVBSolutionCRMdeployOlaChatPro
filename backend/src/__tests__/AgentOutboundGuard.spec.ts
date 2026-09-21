jest.mock("../utils/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));

import {
  hashOutboundText,
  normalizeOutboundText,
  shouldSendOutbound,
  recordSentOutbound,
  isAgentOutboundGuardEnabled
} from "../services/PromptServices/AgentOutboundGuard";

function makeTicket(initial: any = {}) {
  let dw = { ...initial };
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

describe("AgentOutboundGuard.normalizeOutboundText", () => {
  it("lowercases and collapses whitespace", () => {
    expect(normalizeOutboundText("  Hello   WORLD\n  ")).toBe("hello world");
  });
});

describe("AgentOutboundGuard.hashOutboundText", () => {
  it("same normalized input yields same hash", () => {
    expect(hashOutboundText("Olá!")).toBe(hashOutboundText("  ola!  ".replace("ola", "Olá")));
  });
});

describe("AgentOutboundGuard.shouldSendOutbound", () => {
  it("allows first send", () => {
    const t = makeTicket();
    const r = shouldSendOutbound("Bom dia, como posso ajudar?", t);
    expect(r.send).toBe(true);
  });

  it("blocks exact duplicate within window", async () => {
    const t = makeTicket();
    await recordSentOutbound("Bom dia, como posso ajudar?", t, 1);
    const r = shouldSendOutbound("Bom dia, como posso ajudar?", t);
    expect(r.send).toBe(false);
    expect(r.reason).toBe("duplicate-hash");
  });

  it("blocks near-duplicate (extra whitespace + punctuation)", async () => {
    const t = makeTicket();
    await recordSentOutbound("Bom dia, como posso te ajudar hoje?", t, 1);
    const r = shouldSendOutbound("Bom dia,  como posso te ajudar hoje!?", t);
    expect(r.send).toBe(false);
  });

  it("allows distinct messages", async () => {
    const t = makeTicket();
    await recordSentOutbound("Bom dia, como posso ajudar?", t, 1);
    const r = shouldSendOutbound(
      "Para registrar o agendamento, envie o dia e o horário.",
      t
    );
    expect(r.send).toBe(true);
  });

  it("blocks semantically repeated question even when the text changes", async () => {
    const t = makeTicket();
    await recordSentOutbound("Com quantos meses ou semanas de gestação você está?", t, 1);
    const r = shouldSendOutbound("Agora, com quantas semanas de gestação você está?", t, 1);
    expect(r.send).toBe(false);
    expect(r.reason).toBe("repeated-question");
  });

  it("does not block duplicates recorded for another prompt", async () => {
    const t = makeTicket();
    await recordSentOutbound("Qual é a maior dificuldade hoje?", t, 1);
    const r = shouldSendOutbound("Qual é a maior dificuldade hoje?", t, 2);
    expect(r.send).toBe(true);
  });

  it("ignores repeated-question history from another prompt", () => {
    const t = makeTicket({
      agentState: {
        llmFirstState: {
          promptId: 1,
          askedQuestions: ["Com quantos meses ou semanas de gestação você está?"],
          lastAssistantQuestion: "Com quantos meses ou semanas de gestação você está?"
        }
      }
    });
    const r = shouldSendOutbound("Agora, com quantas semanas de gestação você está?", t, 2);
    expect(r.send).toBe(true);
  });

  it("allows after window expires", async () => {
    const t = makeTicket({
      agentState: {
        lastOutboundHashes: [
          {
            hash: hashOutboundText("Boa tarde!"),
            text: "boa tarde!",
            ts: new Date(Date.now() - 60 * 60 * 1000).toISOString()
          }
        ]
      }
    });
    const r = shouldSendOutbound("Boa tarde!", t, null, { windowMinutes: 10 });
    expect(r.send).toBe(true);
  });

  it("respects bypass flag", async () => {
    const t = makeTicket();
    await recordSentOutbound("Mensagem crítica", t, 1);
    const r = shouldSendOutbound("Mensagem crítica", t, null, { bypass: true });
    expect(r.send).toBe(true);
  });

  it("caps history at 5 entries", async () => {
    const t = makeTicket();
    for (let i = 0; i < 8; i++) {
      await recordSentOutbound(`mensagem unica numero ${i}`, t, 1);
    }
    expect(t.dataWebhook.agentState.lastOutboundHashes.length).toBe(5);
  });
});

describe("AgentOutboundGuard.isAgentOutboundGuardEnabled", () => {
  const prev = process.env.AGENT_OUTBOUND_GUARD_ENABLED;
  afterEach(() => {
    process.env.AGENT_OUTBOUND_GUARD_ENABLED = prev;
  });

  it("default ON", () => {
    delete process.env.AGENT_OUTBOUND_GUARD_ENABLED;
    expect(isAgentOutboundGuardEnabled()).toBe(true);
  });

  it("can be disabled", () => {
    process.env.AGENT_OUTBOUND_GUARD_ENABLED = "false";
    expect(isAgentOutboundGuardEnabled()).toBe(false);
  });
});
