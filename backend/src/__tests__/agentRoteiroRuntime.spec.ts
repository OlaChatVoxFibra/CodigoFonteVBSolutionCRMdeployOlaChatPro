import {
  isAgentFluxoEnabled,
  hasMeaningfulAgentRoteiroContent,
  isAgentRoteiroRuntimeActive,
  AGENT_CONSULTIVE_MODE_DIRECTIVE_PT
} from "../helpers/agentRoteiroRuntime";

describe("agentRoteiroRuntime", () => {
  it("isAgentFluxoEnabled defaults true when flag absent", () => {
    expect(isAgentFluxoEnabled({ cargo: {} })).toBe(true);
    expect(isAgentFluxoEnabled({ cargo: { sectionFlags: {} } })).toBe(true);
  });

  it("isAgentFluxoEnabled false when fluxoEnabled=false", () => {
    expect(
      isAgentFluxoEnabled({ cargo: { sectionFlags: { fluxoEnabled: false } } })
    ).toBe(false);
  });

  it("hasMeaningfulAgentRoteiroContent detects flow steps", () => {
    expect(
      hasMeaningfulAgentRoteiroContent({
        attendanceFlowSteps: [{ agentPrompt: "Fala, tudo bem? Como posso ajudar hoje na sua viagem?" }]
      })
    ).toBe(true);
  });

  it("hasMeaningfulAgentRoteiroContent rejects empty script", () => {
    expect(hasMeaningfulAgentRoteiroContent({ attendanceScript: "", prompt: "" })).toBe(false);
  });

  it("isAgentRoteiroRuntimeActive requires fluxo + content", () => {
    expect(
      isAgentRoteiroRuntimeActive({
        cargo: { sectionFlags: { fluxoEnabled: false } },
        attendanceFlowSteps: [{ agentPrompt: "Etapa longa com conteúdo suficiente para ativar o fluxo visual." }]
      })
    ).toBe(false);
    expect(
      isAgentRoteiroRuntimeActive({
        cargo: { sectionFlags: { fluxoEnabled: true } },
        attendanceFlowSteps: [{ agentPrompt: "Etapa longa com conteúdo suficiente para ativar o fluxo visual." }]
      })
    ).toBe(true);
  });

  it("AGENT_CONSULTIVE_MODE_DIRECTIVE_PT mentions modo consultivo", () => {
    expect(AGENT_CONSULTIVE_MODE_DIRECTIVE_PT).toMatch(/modo consultivo/i);
    expect(AGENT_CONSULTIVE_MODE_DIRECTIVE_PT).toMatch(/FAQ/i);
  });
});
