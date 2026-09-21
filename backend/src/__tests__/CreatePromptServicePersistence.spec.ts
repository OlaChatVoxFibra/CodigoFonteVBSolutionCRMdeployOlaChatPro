/**
 * Garante que CreatePromptService persiste Prompt + update com blobs do dono
 * e delega fluxo compilado quando há script (mock de persist).
 */
jest.mock("../database", () => ({
  __esModule: true,
  default: {
    transaction: (fn: (t: unknown) => Promise<unknown>) => fn({})
  }
}));

jest.mock("../models/Prompt", () => ({
  __esModule: true,
  default: { create: jest.fn() }
}));

jest.mock("../models/AttendanceFlowStep", () => ({
  __esModule: true,
  default: { create: jest.fn() }
}));

jest.mock("../helpers/assertPromptUniqueInCompany", () => ({
  assertPromptUniqueInCompany: jest.fn().mockResolvedValue(undefined)
}));
jest.mock("../services/PromptServices/persistCompiledAttendanceFlow", () => ({
  persistCompiledAttendanceFlow: jest.fn().mockResolvedValue({
    steps: [],
    definition: {},
    warnings: [],
    persisted: false
  })
}));

jest.mock("../services/PromptServices/ShowPromptService", () => ({
  __esModule: true,
  default: jest.fn()
}));

import Prompt from "../models/Prompt";
import CreatePromptService from "../services/PromptServices/CreatePromptService";
import ShowPromptService from "../services/PromptServices/ShowPromptService";
import { persistCompiledAttendanceFlow } from "../services/PromptServices/persistCompiledAttendanceFlow";
import { expandPromptV2ToLegacy } from "../helpers/promptV2Payload";
import type { PromptV2Body } from "../helpers/promptV2Payload";

const v2Payload = (): PromptV2Body => ({
  schemaVersion: 2,
  integration: {
    apiKey: "sk-test-key-for-jest-min-16chars",
    model: "gpt-5.5",
    queueId: null,
    maxMessages: 10,
    maxTokens: 200,
    temperature: 0.8
  },
  agent: {
    name: "Agente Jest Persist",
    objective: "Responder clientes",
    language: "pt-BR",
    emojisEnabled: true,
    messages: {
      initial: "Olá!",
      fallback: "Desculpe.",
      afterHours: "",
      transferHuman: ""
    }
  },
  generalRules: "Seja cordial. Não invente preços.",
  attendance: {
    script: "Pergunte o nome do cliente.\n---\nOfereça ajuda.",
    settings: { serviceType: "consultivo" }
  },
  faq: [],
  faqEnabled: true,
  knowledge: { enabled: true, manualText: "", websites: [], sources: [] },
  knowledgeEnabled: true,
  smartActions: [],
  mediaLibrary: []
});

describe("CreatePromptService — persistência v2", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const mockRow: any = {
      id: 901,
      update: jest.fn().mockResolvedValue(undefined)
    };
    (Prompt.create as jest.Mock).mockResolvedValue(mockRow);
    (ShowPromptService as jest.Mock).mockResolvedValue({
      id: 901,
      name: "Agente Jest Persist",
      get: () => ({ id: 901 })
    });
  });

  it("cria Prompt com campos expandidos do v2 e chama persistCompiledAttendanceFlow quando há roteiro", async () => {
    const v2 = v2Payload();
    const expanded = expandPromptV2ToLegacy(v2, { promptId: null });
    const out = await CreatePromptService({
      ...(expanded as any),
      companyId: 1
    });

    expect(Prompt.create).toHaveBeenCalled();
    const createArg = (Prompt.create as jest.Mock).mock.calls[0][0];
    expect(createArg.name).toBe("Agente Jest Persist");
    expect(createArg.apiKey).toBe("sk-test-key-for-jest-min-16chars");
    expect(String(createArg.prompt).length).toBeGreaterThan(100);
    expect(createArg.attendanceScript).toContain("Pergunte o nome");

    expect(persistCompiledAttendanceFlow).toHaveBeenCalled();
    const persistArg = (persistCompiledAttendanceFlow as jest.Mock).mock.calls[0][0];
    expect(persistArg.promptId).toBe(901);
    expect(persistArg.companyId).toBe(1);
    expect(String(persistArg.compilerInput?.script || "")).toContain("Pergunte o nome");

    expect(ShowPromptService).toHaveBeenCalledWith({ promptId: 901, companyId: 1 });
    expect(out?.id).toBe(901);
  });
});
