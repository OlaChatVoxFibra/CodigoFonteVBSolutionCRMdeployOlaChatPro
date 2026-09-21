import { isClaudeModelId, normalizeAgentModelId } from "../providers/anthropic/utils/isClaudeModel";
import {
  listConnectionAgentOptions,
  parseConnectionAgentValue
} from "../providers/anthropic/services/resolveConnectionAgent";

jest.mock("../models/Prompt", () => ({
  __esModule: true,
  default: { findAll: jest.fn() }
}));
jest.mock("../models/AnthropicMultiAgent", () => ({
  __esModule: true,
  default: { findAll: jest.fn() }
}));

import Prompt from "../models/Prompt";
import AnthropicMultiAgent from "../models/AnthropicMultiAgent";

describe("resolveConnectionAgent Claude routing", () => {
  it("normalizeAgentModelId remove prefixo anthropic:", () => {
    expect(normalizeAgentModelId("anthropic:claude-sonnet-4-6")).toBe("claude-sonnet-4-6");
    expect(isClaudeModelId("anthropic:claude-sonnet-4-6")).toBe(true);
    expect(normalizeAgentModelId("anthropic:claude-fable-5")).toBe("claude-fable-5");
    expect(isClaudeModelId("claude-fable-5")).toBe(true);
    expect(isClaudeModelId("gpt-5.5")).toBe(false);
  });

  it("parseConnectionAgentValue aceita prompt e anthropic", () => {
    expect(parseConnectionAgentValue("prompt:42")).toEqual({
      promptId: 42,
      anthropicMultiAgentId: null
    });
    expect(parseConnectionAgentValue("anthropic:7")).toEqual({
      promptId: null,
      anthropicMultiAgentId: 7
    });
  });

  it("listConnectionAgentOptions classifica prompts Claude em claudeAgents", async () => {
    (Prompt.findAll as jest.Mock).mockResolvedValue([
      { id: 1, name: "GPT Agent", model: "gpt-5.5" },
      { id: 2, name: "TESTE API CLAUDE", model: "anthropic:claude-sonnet-4-6" }
    ]);
    (AnthropicMultiAgent.findAll as jest.Mock).mockResolvedValue([]);

    const { openAiAgents, claudeAgents } = await listConnectionAgentOptions(1);
    expect(openAiAgents).toHaveLength(1);
    expect(openAiAgents[0].connectionValue).toBe("prompt:1");
    expect(claudeAgents).toHaveLength(1);
    expect(claudeAgents[0].connectionValue).toBe("prompt:2");
    expect(claudeAgents[0].provider).toBe("anthropic");
  });

  it("listConnectionAgentOptions inclui prompts Gemini em openAiAgents", async () => {
    (Prompt.findAll as jest.Mock).mockResolvedValue([
      { id: 3, name: "Marketing Gemini", model: "gemini-2.5-flash" },
      { id: 4, name: "Suporte GPT", model: "gpt-4o-mini" }
    ]);
    (AnthropicMultiAgent.findAll as jest.Mock).mockResolvedValue([]);

    const { openAiAgents, claudeAgents } = await listConnectionAgentOptions(1);
    expect(claudeAgents).toHaveLength(0);
    expect(openAiAgents).toHaveLength(2);
    expect(openAiAgents[0]).toMatchObject({
      id: 3,
      connectionValue: "prompt:3",
      provider: "gemini",
      model: "gemini-2.5-flash"
    });
    expect(openAiAgents[1]).toMatchObject({
      id: 4,
      provider: "openai"
    });
  });
});
