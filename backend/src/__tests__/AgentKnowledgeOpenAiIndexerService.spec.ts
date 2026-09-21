jest.mock("axios", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn()
  }
}));

jest.mock("../models/Prompt", () => ({
  __esModule: true,
  default: { findOne: jest.fn() }
}));

jest.mock("../models/PromptKnowledgeSource", () => ({
  __esModule: true,
  default: { findAll: jest.fn() }
}));

import axios from "axios";
import Prompt from "../models/Prompt";
import {
  indexAllPromptKnowledgeSourcesForOpenAi,
  indexPromptKnowledgeSourceRow
} from "../services/PromptServices/AgentKnowledgeOpenAiIndexerService";

describe("AgentKnowledgeOpenAiIndexerService", () => {
  const OLD = process.env;

  beforeEach(() => {
    process.env = { ...OLD };
    delete process.env.AGENT_OPENAI_KNOWLEDGE_INDEXING;
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = OLD;
  });

  it("no-op when AGENT_OPENAI_KNOWLEDGE_INDEXING is off", async () => {
    process.env.AGENT_OPENAI_KNOWLEDGE_INDEXING = "false";
    await indexAllPromptKnowledgeSourcesForOpenAi({ promptId: 1, companyId: 1 });
    expect(Prompt.findOne).not.toHaveBeenCalled();
  });

  it("marks website rows as skipped", async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const row = {
      id: 9,
      promptId: 1,
      companyId: 1,
      sourceType: "website",
      title: "https://x.com",
      content: null,
      fileUrl: "https://x.com",
      metadata: {},
      indexStatus: "pending",
      openAiVectorStoreId: null,
      update
    } as any;
    await indexPromptKnowledgeSourceRow(row, "sk-test");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        indexStatus: "skipped"
      })
    );
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("marks empty manual rows as failed", async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const row = {
      id: 10,
      promptId: 1,
      companyId: 1,
      sourceType: "manual",
      title: "t",
      content: "   ",
      fileUrl: null,
      metadata: {},
      indexStatus: "pending",
      openAiVectorStoreId: null,
      update
    } as any;
    await indexPromptKnowledgeSourceRow(row, "sk-test");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        indexStatus: "failed",
        indexError: "empty_knowledge_payload"
      })
    );
  });
});
