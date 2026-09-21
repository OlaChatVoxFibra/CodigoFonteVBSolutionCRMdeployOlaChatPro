import { loadRuntimeFlowStepsForAgent } from "../helpers/loadRuntimeFlowStepsForAgent";
import AttendanceFlowStep from "../models/AttendanceFlowStep";

jest.mock("../models/AttendanceFlowStep", () => ({
  __esModule: true,
  default: { findAll: jest.fn() }
}));

describe("loadRuntimeFlowStepsForAgent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("usa compilador IR quando banco/script resolvem só 1 etapa mas roteiro tem ---", async () => {
    (AttendanceFlowStep.findAll as jest.Mock).mockResolvedValue([
      { toJSON: () => ({ stepNumber: 1, agentPrompt: "Fala, tudo bem?" }) }
    ]);

    const steps = await loadRuntimeFlowStepsForAgent({
      fullPrompt: {
        attendanceFlowSteps: [],
        attendanceScript: "Fala, tudo bem?\n---\nQual seu nome?\n---\nObrigado!",
        prompt: ""
      },
      promptId: 1,
      companyId: 1
    });

    expect(steps.length).toBeGreaterThanOrEqual(3);
    expect(steps[1].agentPrompt).toContain("nome");
  });

  it("carrega 16+ etapas do roteiro VB Solution (ETAPA N — sem #)", async () => {
    const vbScript = `ETAPA 1 — Boas-vindas

Mensagem:

Fala, tudo bem? 😄

Leonardo Sena VBSolution

EXEMPLO DE RESPOSTA DO LEAD: "sim"

ETAPA 2 — Conexão

RESPOSTA:

Boa, faz total sentido 😄

EXEMPLO DE RESPOSTA DO LEAD: "sim"

ETAPA 3 — Descobrir

RESPOSTA:

Entendi.`;

    (AttendanceFlowStep.findAll as jest.Mock).mockResolvedValue([
      { toJSON: () => ({ stepNumber: 1, agentPrompt: "Fala, tudo bem?" }) }
    ]);

    const steps = await loadRuntimeFlowStepsForAgent({
      fullPrompt: {
        attendanceFlowSteps: [],
        attendanceScript: vbScript,
        prompt: ""
      },
      promptId: 1,
      companyId: 1
    });

    expect(steps.length).toBeGreaterThanOrEqual(3);
    expect(steps[0].agentPrompt).toContain("Leonardo");
    expect(steps[1].agentPrompt).toContain("total sentido");
  });
});
