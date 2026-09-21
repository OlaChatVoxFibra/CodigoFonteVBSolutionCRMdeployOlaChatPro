import {
  assistantTextImpliesSchedulingOffer,
  userMessageMatchesSchedulingTriggers,
  userProvidesScheduleDateTime,
  userRequestsScheduling
} from "../helpers/assistantScheduleIntent";

describe("assistantScheduleIntent", () => {
  it("detecta oferta de agendamento pelo agente", () => {
    expect(assistantTextImpliesSchedulingOffer("Gostaria de agendar um horário?")).toBe(true);
    expect(assistantTextImpliesSchedulingOffer("Qual o melhor dia para você?")).toBe(true);
    expect(assistantTextImpliesSchedulingOffer("Vou consultar a agenda e já retorno.")).toBe(true);
  });

  it("detecta pedido do cliente", () => {
    expect(userRequestsScheduling("Quero agendar uma visita")).toBe(true);
    expect(userRequestsScheduling("oi")).toBe(false);
  });

  it("extrai data do texto do cliente", () => {
    const r = userProvidesScheduleDateTime("amanhã às 14h");
    expect(r.matched).toBe(true);
    expect(r.date).toBeTruthy();
  });

  it("bate gatilhos configurados do usuário", () => {
    expect(
      userMessageMatchesSchedulingTriggers("quero agendar", ["quero agendar", "amanhã"])
    ).toBe(true);
    expect(userMessageMatchesSchedulingTriggers("bom dia", ["amanhã"])).toBe(false);
  });
});
