import {
  buildAgentInboundJobId,
  enqueueAgentInboundJob,
  isAgentInboundQueueEnabled
} from "../services/PromptServices/AgentInboundQueueService";

describe("AgentInboundQueueService", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    delete process.env.AI_INBOUND_QUEUE_ENABLED;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("builds deterministic job ids from company ticket prompt and WhatsApp wid", () => {
    const a = buildAgentInboundJobId({ companyId: 1, ticketId: 2, promptId: 3, wid: "ABC-123" });
    const b = buildAgentInboundJobId({ companyId: 1, ticketId: 2, promptId: 3, wid: "ABC-123" });
    const c = buildAgentInboundJobId({ companyId: 1, ticketId: 2, promptId: 4, wid: "ABC-123" });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toBe("agent-inbound:1:2:3:ABC-123");
  });

  it("keeps the queue disabled unless explicitly enabled", () => {
    expect(isAgentInboundQueueEnabled()).toBe(false);
    process.env.AI_INBOUND_QUEUE_ENABLED = "true";
    expect(isAgentInboundQueueEnabled()).toBe(true);
  });

  it("enqueues with deterministic jobId and retry policy", async () => {
    const add = jest.fn().mockResolvedValue({});
    const ok = await enqueueAgentInboundJob(
      { add },
      {
        companyId: 1,
        ticketId: 2,
        whatsappId: 9,
        promptId: 3,
        wid: "ABC-123",
        enqueuedAt: "2026-05-14T00:00:00.000Z",
        userText: "oi",
        contactId: 44
      }
    );

    expect(ok).toBe(true);
    expect(add).toHaveBeenCalledWith(
      "AgentInboundMessage",
      expect.objectContaining({
        companyId: 1,
        ticketId: 2,
        promptId: 3,
        wid: "ABC-123",
        userText: "oi",
        contactId: 44
      }),
      expect.objectContaining({
        jobId: "agent-inbound:1:2:3:ABC-123",
        attempts: 2
      })
    );
  });
});

