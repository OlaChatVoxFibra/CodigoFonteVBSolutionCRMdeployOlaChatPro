import {
  markAgentProcessingFinished,
  markAgentProcessingStarted
} from "../services/PromptServices/AgentProcessingStateService";

function makeTicket(dataWebhook: Record<string, any> = {}) {
  return {
    id: 77,
    status: "open",
    useIntegration: true,
    isBot: true,
    dataWebhook,
    update: jest.fn(async function update(this: any, patch: any) {
      this.dataWebhook = patch.dataWebhook;
    }),
    setDataValue: jest.fn(function setDataValue(this: any, key: string, value: any) {
      if (key === "dataWebhook") this.dataWebhook = value;
    })
  } as any;
}

describe("AgentProcessingStateService", () => {
  it("records processing state inside dataWebhook without touching ticket operational fields", async () => {
    const ticket = makeTicket({ existing: true, agentState: { previous: "ok" } });

    await markAgentProcessingStarted({
      ticket,
      promptId: 10,
      wid: "ABC123",
      userText: "Mensagem atual do cliente"
    });

    expect(ticket.status).toBe("open");
    expect(ticket.useIntegration).toBe(true);
    expect(ticket.isBot).toBe(true);
    expect(ticket.dataWebhook.existing).toBe(true);
    expect(ticket.dataWebhook.agentState.previous).toBe("ok");
    expect(ticket.dataWebhook.agentState.processing).toMatchObject({
      active: true,
      status: "processing",
      promptId: 10,
      wid: "ABC123"
    });

    await markAgentProcessingFinished({
      ticket,
      promptId: 10,
      wid: "ABC123",
      ok: true
    });

    expect(ticket.dataWebhook.agentState.processing).toMatchObject({
      active: false,
      status: "completed",
      promptId: 10,
      wid: "ABC123",
      error: null
    });
  });
});

