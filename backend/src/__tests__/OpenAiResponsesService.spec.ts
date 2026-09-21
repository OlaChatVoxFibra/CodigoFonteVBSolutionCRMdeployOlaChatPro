import { createOpenAiAgentResponse } from "../services/OpenAI/OpenAiResponsesService";

describe("OpenAiResponsesService", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    delete process.env.OPENAI_RESPONSES_RUNTIME_ENABLED;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("prefers responses.create when client exposes it", async () => {
    const responsesCreate = jest.fn().mockResolvedValue({ output_text: "  ok  " });
    const chatCreate = jest.fn();
    const out = await createOpenAiAgentResponse({
      client: {
        responses: { create: responsesCreate },
        chat: { completions: { create: chatCreate } }
      },
      models: ["gpt-5.5"],
      messages: [{ role: "user", content: "hi" }],
      maxTokens: 64,
      timeoutMs: 8000
    });
    expect(out.api).toBe("responses");
    expect(out.model).toBe("gpt-5.5");
    expect(out.content).toBe("ok");
    expect(responsesCreate).toHaveBeenCalled();
    expect(chatCreate).not.toHaveBeenCalled();
  });

  it("uses chat.completions when OPENAI_RESPONSES_RUNTIME_ENABLED is off", async () => {
    process.env.OPENAI_RESPONSES_RUNTIME_ENABLED = "false";
    const responsesCreate = jest.fn();
    const chatCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: "from-chat" } }]
    });
    const out = await createOpenAiAgentResponse({
      client: {
        responses: { create: responsesCreate },
        chat: { completions: { create: chatCreate } }
      },
      models: ["gpt-4.1"],
      messages: [{ role: "user", content: "x" }],
      maxTokens: 32,
      timeoutMs: 8000
    });
    expect(out.api).toBe("chat_completions");
    expect(out.content).toBe("from-chat");
    expect(responsesCreate).not.toHaveBeenCalled();
    expect(chatCreate).toHaveBeenCalled();
  });

  it("uses chat when responses API is missing on client", async () => {
    const chatCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: "chat-only" } }]
    });
    const out = await createOpenAiAgentResponse({
      client: { chat: { completions: { create: chatCreate } } },
      models: ["gpt-4.1"],
      messages: [{ role: "user", content: "x" }],
      maxTokens: 32,
      timeoutMs: 8000
    });
    expect(out.api).toBe("chat_completions");
    expect(out.content).toBe("chat-only");
  });

  it("extracts text from responses output array when output_text is absent", async () => {
    const responsesCreate = jest.fn().mockResolvedValue({
      output: [{ content: [{ text: "line-a" }, { text: "line-b" }] }]
    });
    const out = await createOpenAiAgentResponse({
      client: { responses: { create: responsesCreate }, chat: { completions: { create: jest.fn() } } },
      models: ["gpt-5.5"],
      messages: [{ role: "user", content: "hi" }],
      maxTokens: 32,
      timeoutMs: 8000
    });
    expect(out.content).toBe("line-a\nline-b");
  });
});
