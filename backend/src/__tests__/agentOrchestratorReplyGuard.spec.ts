import {
  looksLikeAgentOrchestratorJsonLeak,
  recoverCustomerReplyFromOrchestratorLeak,
  sanitizeAgentOutboundReply,
  sanitizeOrchestratorCustomerReply,
  tryBuildDecisionFromLeakedOrchestratorContent
} from "../helpers/agentOrchestratorReplyGuard";
import { sanitizeAgentCustomerVisibleText } from "../helpers/sanitizeAgentCustomerVisibleText";

describe("agentOrchestratorReplyGuard", () => {
  const leakedJson = `\`\`\`json
{
  "understanding": {
    "userIntent": "O cliente enviou um sticker",
    "currentObjective": "Obter resposta sobre o tipo de serviço",
    "currentStage": "Etapa 1",
    "collectedData": [],
    "missingData": ["tipo de serviço"]
  },
  "decision": {
    "type": "ask_missing_info",
    "reason": "sticker sem resposta",
    "nextQuestion": null,
    "actionSlug": null,
    "actionVariables": {}
  },
  "reply": "Sem problemas! Me conta: sua empresa atua com tráfego, social media ou consultoria?"
}
\`\`\``;

  it("detecta vazamento de JSON interno do orquestrador", () => {
    expect(looksLikeAgentOrchestratorJsonLeak(leakedJson)).toBe(true);
    expect(looksLikeAgentOrchestratorJsonLeak('"userIntent": "teste"')).toBe(true);
    expect(looksLikeAgentOrchestratorJsonLeak("Olá! Qual serviço sua empresa oferece?")).toBe(false);
  });

  it("recupera apenas o campo reply do JSON vazado", () => {
    expect(recoverCustomerReplyFromOrchestratorLeak(leakedJson)).toBe(
      "Sem problemas! Me conta: sua empresa atua com tráfego, social media ou consultoria?"
    );
  });

  it("sanitizeOrchestratorCustomerReply descarta JSON sem reply utilizável", () => {
    const partial = `\`\`\`json
{
  "understanding": {
    "userIntent": "sticker",
    "currentObjective": "qualificar",
    "currentStage": "Etapa 1",
    "collectedData": [],
    "missingData": ["nicho"]
  },
`;
    expect(sanitizeOrchestratorCustomerReply(partial)).toBe("");
  });

  it("sanitizeAgentCustomerVisibleText bloqueia JSON interno antes do envio", () => {
    expect(sanitizeAgentCustomerVisibleText(leakedJson)).toBe(
      "Sem problemas! Me conta: sua empresa atua com tráfego, social media ou consultoria?"
    );
  });

  it("tryBuildDecisionFromLeakedOrchestratorContent extrai reply válida", () => {
    const built = tryBuildDecisionFromLeakedOrchestratorContent(leakedJson);
    expect(built?.reply).toMatch(/tráfego|social media|consultoria/i);
  });

  it("sanitizeAgentOutboundReply descarta linha isolada de userIntent", () => {
    expect(sanitizeAgentOutboundReply('"userIntent": "sticker"')).toBe("");
  });
});
