import { matchAttendanceFlowResponseOption } from "../helpers/attendanceFlowMatchResponse";

describe("matchAttendanceFlowResponseOption (fluxo visual)", () => {
  it("três opções flex: mensagem sem sobreposição não casa e retorna null", () => {
    const options = [
      { text: "vendas", matchMode: "flex", nextStep: 2 },
      { text: "suporte", matchMode: "flex", nextStep: 3 },
      { text: "financeiro", matchMode: "flex", nextStep: 4 }
    ];
    expect(matchAttendanceFlowResponseOption("outro assunto totalmente diferente", options)).toBeNull();
  });

  it("opção flex casa por substring bidirecional", () => {
    const options = [{ text: "vendas", matchMode: "flex", nextStep: 2 }];
    const hit = matchAttendanceFlowResponseOption("quero falar de vendas por favor", options);
    expect(hit?.nextStep).toBe(2);
  });

  it("modo equals exige igualdade normalizada", () => {
    const options = [{ text: "Sim", matchMode: "equals", nextStep: "end" }];
    expect(matchAttendanceFlowResponseOption("sim", options)?.nextStep).toBe("end");
    expect(matchAttendanceFlowResponseOption("sim talvez", options)).toBeNull();
  });

  it("após ramo sem match, caller não deve avançar passo (contrato do fluxo)", () => {
    const options = [{ text: "A", matchMode: "flex", nextStep: 2 }];
    expect(matchAttendanceFlowResponseOption("B", options)).toBeNull();
  });

  it("modo open ignora cumprimento trivial (não avança etapa como se fosse resposta)", () => {
    const options = [{ text: "", matchMode: "open", nextStep: 2 }];
    expect(matchAttendanceFlowResponseOption("Oi", options)).toBeNull();
    expect(matchAttendanceFlowResponseOption("20 de agosto", options)?.nextStep).toBe(2);
  });

  it("modo any ignora cumprimento trivial", () => {
    const options = [{ text: "-", matchMode: "any", nextStep: 3 }];
    expect(matchAttendanceFlowResponseOption("Olá!", options)).toBeNull();
    expect(matchAttendanceFlowResponseOption("Preciso de ajuda com reserva", options)?.nextStep).toBe(3);
  });
});
