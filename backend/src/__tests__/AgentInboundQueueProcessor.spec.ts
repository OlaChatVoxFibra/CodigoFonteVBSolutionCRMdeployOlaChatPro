jest.mock("../services/TicketServices/ShowTicketService", () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock("../services/PromptServices/ShowPromptService", () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock("../services/WhatsappService/ShowWhatsAppService", () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock("../models/Whatsapp", () => ({
  __esModule: true,
  default: { findOne: jest.fn() }
}));
jest.mock("../helpers/GetWhatsappWbot", () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock("../helpers/syncTicketConnectionAgentContext", () => ({
  syncTicketConnectionAgentContext: jest.fn().mockResolvedValue({ historyAnchorAt: null })
}));
jest.mock("../providers/anthropic/services/resolveConnectionAgent", () => ({
  resolveConnectionAgentFromWhatsapp: jest.fn(),
  syntheticPromptIdForAnthropicAgent: (id: number) => 2_000_000_000 + id,
  whatsappHasConnectionAgent: jest.fn().mockReturnValue(true)
}));
jest.mock("../services/PromptServices/AgentProcessingStateService", () => ({
  markAgentProcessingStarted: jest.fn().mockResolvedValue(undefined),
  markAgentProcessingFinished: jest.fn().mockResolvedValue(undefined)
}));
jest.mock("../services/PromptServices/AgentOrchestratorService", () => ({
  runAgentOrchestrator: jest.fn(),
  runAnthropicWhatsappDirectReply: jest.fn().mockResolvedValue({ handled: false }),
  splitAgentReplyIntoSmartBlocks: jest.fn((text: string) => [text])
}));
jest.mock("../services/PromptServices/IntentTriggerEngine", () => ({
  classifyAgentOutbound: jest.fn().mockResolvedValue({ intents: [] }),
  registerPendingIntents: jest.fn().mockResolvedValue(undefined),
  shouldRunSmartActionTriggersForPrompt: jest.fn().mockResolvedValue(false),
  filterIntentsToEnabledSmartActions: jest.fn().mockResolvedValue([])
}));
jest.mock("../services/PromptServices/PendingIntentResolver", () => ({
  resolvePendingIntents: jest.fn().mockResolvedValue({
    handled: false,
    satisfiedKinds: [],
    remainingIntents: []
  })
}));
jest.mock("../services/PromptServices/AttendanceFlowTurnService", () => ({
  tryHandlePromptAttendanceFlowTurn: jest.fn().mockResolvedValue({
    handled: false,
    consumedReply: false,
    sentCount: 0,
    actionCount: 0,
    allowLlmFallback: false,
    source: "v1"
  })
}));
jest.mock("../services/PromptServices/AgentOutboundGuard", () => ({
  isAgentOutboundGuardEnabled: jest.fn().mockReturnValue(false),
  shouldSendOutbound: jest.fn(),
  recordSentOutbound: jest.fn()
}));
jest.mock("../services/WbotServices/wbotMessageListener", () => ({
  verifyMessage: jest.fn().mockResolvedValue(undefined)
}));

import ShowTicketService from "../services/TicketServices/ShowTicketService";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import { resolveConnectionAgentFromWhatsapp } from "../providers/anthropic/services/resolveConnectionAgent";
import Whatsapp from "../models/Whatsapp";
import GetWhatsappWbot from "../helpers/GetWhatsappWbot";
import { runAgentOrchestrator } from "../services/PromptServices/AgentOrchestratorService";
import { tryHandlePromptAttendanceFlowTurn } from "../services/PromptServices/AttendanceFlowTurnService";
import { handleAgentInboundMessage } from "../services/PromptServices/AgentInboundQueueProcessor";

describe("AgentInboundQueueProcessor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseJob = () => ({
    id: "j1",
    data: {
      companyId: 1,
      ticketId: 2,
      whatsappId: 9,
      promptId: 3,
      wid: "WID1",
      enqueuedAt: "2026-05-14T00:00:00.000Z",
      userText: "Olá",
      contactId: 5
    }
  });

  it("ignores invalid payload without throwing", async () => {
    await expect(handleAgentInboundMessage({ id: "x", data: null as any })).resolves.toBeUndefined();
    await expect(handleAgentInboundMessage({ id: "y", data: { ticketId: "n" } as any })).resolves.toBeUndefined();
  });

  it("aborts when ticket is missing", async () => {
    (ShowTicketService as jest.Mock).mockResolvedValue(null);
    await handleAgentInboundMessage(baseJob());
    expect(runAgentOrchestrator).not.toHaveBeenCalled();
  });

  it("runs orchestrator and sends when dependencies resolve", async () => {
    const ticket = {
      id: 2,
      companyId: 1,
      contact: { id: 5, remoteJid: "551199999@s.whatsapp.net", disableBot: false }
    };
    (ShowTicketService as jest.Mock).mockResolvedValue(ticket);
    (Whatsapp.findOne as jest.Mock).mockResolvedValue({ id: 9, companyId: 1 });
    (ShowWhatsAppService as jest.Mock).mockResolvedValue({
      getDataValue: (k: string) => (k === "promptId" ? 3 : null)
    });
    (resolveConnectionAgentFromWhatsapp as jest.Mock).mockResolvedValue({
      prompt: { id: 3, name: "Agent", apiKey: "sk-x" },
      ref: { kind: "prompt", promptId: 3 },
      llmProvider: "openai"
    });
    const sendMessage = jest.fn().mockResolvedValue({
      key: { id: "OUT1", remoteJid: "551199999@s.whatsapp.net", fromMe: true },
      messageTimestamp: Date.now() / 1000
    });
    (GetWhatsappWbot as jest.Mock).mockResolvedValue({ sendMessage });
    (runAgentOrchestrator as jest.Mock).mockResolvedValue({ handled: true, reply: "Resposta única" });

    await handleAgentInboundMessage(baseJob());

    expect(tryHandlePromptAttendanceFlowTurn).toHaveBeenCalled();
    expect(runAgentOrchestrator).toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalled();
  });
});
