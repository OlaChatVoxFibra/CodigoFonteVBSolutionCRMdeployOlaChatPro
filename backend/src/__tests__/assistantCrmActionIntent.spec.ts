import {
  leadExecutionAuthorized,
  activityExecutionAuthorized,
  userProvidesLeadContactData,
  isSilentCustomerSmartActionSlug
} from "../helpers/assistantCrmActionIntent";

describe("assistantCrmActionIntent", () => {
  const userPatterns = ["tenho interesse", "quero conhecer"];
  const agentPatterns = ["me passe seu nome", "vou registrar seu cadastro"];

  it("authorizes lead when user trigger matches", () => {
    expect(
      leadExecutionAuthorized({
        userText: "tenho interesse na plataforma",
        lastAssistantText: "Olá!",
        userTriggerPatterns: userPatterns,
        agentTriggerPatterns: agentPatterns
      })
    ).toBe(true);
  });

  it("authorizes lead when agent collected data and user sent contact", () => {
    expect(
      leadExecutionAuthorized({
        userText: "João Silva, joao@gmail.com, 11999998888",
        lastAssistantText: "Me passe seu nome e telefone para registrar.",
        userTriggerPatterns: userPatterns,
        agentTriggerPatterns: agentPatterns
      })
    ).toBe(true);
  });

  it("blocks lead without configured context", () => {
    expect(
      leadExecutionAuthorized({
        userText: "ok",
        lastAssistantText: "Posso ajudar?",
        userTriggerPatterns: userPatterns,
        agentTriggerPatterns: agentPatterns
      })
    ).toBe(false);
  });

  it("authorizes activity when agent declares internal task", () => {
    expect(
      activityExecutionAuthorized({
        userText: "certo",
        lastAssistantText: "Vou registrar uma atividade para o responsável.",
        userTriggerPatterns: ["anota aí"],
        agentTriggerPatterns: ["vou registrar uma atividade"]
      })
    ).toBe(true);
  });

  it("detects lead contact data in message", () => {
    expect(userProvidesLeadContactData("meu email é teste@gmail.com")).toBe(true);
    expect(userProvidesLeadContactData("ok")).toBe(false);
  });

  it("marks CRM slugs as silent", () => {
    expect(isSilentCustomerSmartActionSlug("criarLead")).toBe(true);
    expect(isSilentCustomerSmartActionSlug("agendamento")).toBe(false);
  });
});
