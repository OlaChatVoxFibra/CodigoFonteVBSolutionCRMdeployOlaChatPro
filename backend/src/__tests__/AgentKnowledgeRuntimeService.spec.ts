jest.mock("../models/PromptKnowledgeSource", () => ({
  __esModule: true,
  default: { findAll: jest.fn() }
}));

import PromptKnowledgeSource from "../models/PromptKnowledgeSource";
import { buildAgentKnowledgeRuntime } from "../services/PromptServices/AgentKnowledgeRuntimeService";

describe("AgentKnowledgeRuntimeService", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    delete process.env.AGENT_FILE_SEARCH_ENABLED;
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("does not query DB when file_search flag is off", async () => {
    const r = await buildAgentKnowledgeRuntime({ companyId: 1, promptId: 2 });
    expect(r.enabled).toBe(false);
    expect(r.tools).toEqual([]);
    expect(PromptKnowledgeSource.findAll).not.toHaveBeenCalled();
  });

  it("builds file_search tools for ready vector stores when flag is on", async () => {
    process.env.AGENT_FILE_SEARCH_ENABLED = "true";
    (PromptKnowledgeSource.findAll as jest.Mock).mockResolvedValue([
      { id: 1, openAiVectorStoreId: "vs_a", indexStatus: "ready" },
      { id: 2, openAiVectorStoreId: "vs_a", indexStatus: "ready" },
      { id: 3, openAiVectorStoreId: "", indexStatus: "pending" }
    ]);
    const r = await buildAgentKnowledgeRuntime({ companyId: 10, promptId: 20 });
    expect(r.enabled).toBe(true);
    expect(r.sourceCount).toBe(3);
    expect(r.vectorStoreIds).toEqual(["vs_a"]);
    expect(r.tools).toEqual([{ type: "file_search", vector_store_ids: ["vs_a"] }]);
    expect(PromptKnowledgeSource.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 10, promptId: 20 }
      })
    );
  });

  it("returns disabled when no ready rows", async () => {
    process.env.AGENT_FILE_SEARCH_ENABLED = "true";
    (PromptKnowledgeSource.findAll as jest.Mock).mockResolvedValue([
      { id: 1, openAiVectorStoreId: "vs_x", indexStatus: "indexing" }
    ]);
    const r = await buildAgentKnowledgeRuntime({ companyId: 1, promptId: 2 });
    expect(r.enabled).toBe(false);
    expect(r.tools).toEqual([]);
  });
});
