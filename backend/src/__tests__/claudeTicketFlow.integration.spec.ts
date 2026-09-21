/**
 * Valida resolução Claude + orquestrador (mock API) — não envia WhatsApp real.
 */
import {
  resolvePromptWithLlmProvider,
  whatsappHasConnectionAgent
} from "../providers/anthropic/services/resolveConnectionAgent";
import { runAgentOrchestrator } from "../services/PromptServices/AgentOrchestratorService";

jest.mock("../providers/anthropic/runtime/AnthropicAgentResponseService", () => ({
  createAnthropicAgentResponse: jest.fn().mockResolvedValue({
    model: "claude-sonnet-4-6",
    content: JSON.stringify({
      understanding: {
        userIntent: "saudacao",
        currentObjective: "cumprimentar",
        currentStage: "inicio",
        collectedData: [],
        missingData: []
      },
      decision: {
        type: "reply_only",
        reason: "teste",
        nextQuestion: null,
        actionSlug: null,
        actionVariables: {}
      },
      reply: "Olá! Sou o assistente de vendas. Como posso ajudar?"
    }),
    api: "anthropic_messages"
  })
}));

jest.mock("../services/PromptServices/PromptSmartActionExecutorService", () => ({
  listPromptSmartActionToolsShared: jest.fn().mockResolvedValue([]),
  validatePromptSmartActionToolCall: jest.fn(),
  executeSmartAction: jest.fn()
}));

jest.mock("../models/Message", () => ({
  __esModule: true,
  default: { findAll: jest.fn().mockResolvedValue([]) }
}));

describe("Claude ticket flow (integration mock)", () => {
  it("resolvePromptWithLlmProvider marca anthropic e apiKey", async () => {
    jest.mock("../models/AnthropicIntegration", () => ({
      __esModule: true,
      default: {
        findOne: jest.fn().mockResolvedValue({
          enabled: true,
          apiKeyEncrypted: "enc",
          defaultModel: "claude-sonnet-4-6"
        })
      }
    }));

    const promptRow = {
      id: 11,
      name: "VBSolution Vendas",
      model: "claude-sonnet-4-6",
      prompt: "Você é assistente de vendas.",
      attendanceScript: "",
      companyId: 1,
      maxMessages: 20,
      maxTokens: 500,
      temperature: 1
    };

    jest.mock("../services/PromptServices/ShowPromptService", () => ({
      __esModule: true,
      default: jest.fn().mockResolvedValue(promptRow)
    }));

    jest.mock("../providers/anthropic/utils/anthropicApiKeyCrypto", () => ({
      decryptAnthropicApiKeySecret: jest.fn().mockReturnValue("sk-ant-test")
    }));

    const ShowPromptService = require("../services/PromptServices/ShowPromptService").default;
    (ShowPromptService as jest.Mock).mockResolvedValue(promptRow);

    const AnthropicIntegration = require("../models/AnthropicIntegration").default;
    (AnthropicIntegration.findOne as jest.Mock).mockResolvedValue({
      enabled: true,
      apiKeyEncrypted: "x",
      defaultModel: "claude-sonnet-4-6"
    });

    const resolved = await resolvePromptWithLlmProvider(1, 11);
    expect(resolved.llmProvider).toBe("anthropic");
    expect(resolved.prompt.__llmProvider).toBe("anthropic");
    expect(resolved.prompt.apiKey).toBeTruthy();
    expect(resolved.prompt.model).toBe("claude-sonnet-4-6");
  });

  it("whatsappHasConnectionAgent detecta promptId ou anthropicMultiAgentId", () => {
    const wa = {
      getDataValue: (k: string) =>
        k === "promptId" ? 11 : k === "anthropicMultiAgentId" ? null : k === "agentDisabled" ? false : null
    };
    expect(whatsappHasConnectionAgent(wa as any)).toBe(true);
  });

  it("runAgentOrchestrator responde com Claude mockado", async () => {
    const result = await runAgentOrchestrator({
      prompt: {
        id: 11,
        name: "Test",
        model: "claude-sonnet-4-6",
        apiKey: "sk-ant-test",
        prompt: "Assistente teste",
        attendanceScript: "Diga olá",
        maxMessages: 10,
        maxTokens: 400,
        __llmProvider: "anthropic"
      } as any,
      ticket: { id: 1, companyId: 1, dataWebhook: {} } as any,
      contact: { id: 1, name: "Cliente" } as any,
      userText: "Olá"
    });
    expect(result.handled).toBe(true);
    expect(String(result.reply || "")).toMatch(/ajudar|Olá/i);
  });
});
