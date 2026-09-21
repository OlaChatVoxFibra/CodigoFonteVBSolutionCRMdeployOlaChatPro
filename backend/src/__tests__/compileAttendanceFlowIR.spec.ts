import { compileAttendanceFlowIR, FLOW_COMPILER_VERSION } from "../helpers/compileAttendanceFlowIR";

describe("compileAttendanceFlowIR", () => {
  it("returns 1 step with fallback when script is empty", () => {
    const res = compileAttendanceFlowIR({ script: "", fallbackAgentPrompt: "fallback X" });
    expect(res.steps.length).toBe(1);
    expect(res.steps[0].agentPrompt).toBe("fallback X");
    expect(res.steps[0].stepId).toBe("s1");
    expect(res.steps[0].stepNumber).toBe(1);
    expect(res.definition.entryStepId).toBe("s1");
    expect(res.definition.fallbackStepId).toBe("s1");
    expect(res.definition.compilerVersion).toBe(FLOW_COMPILER_VERSION);
    expect(res.definition.policy.semanticSplit).toBe(true);
  });

  it("splits by --- and assigns sequential stepIds", () => {
    const res = compileAttendanceFlowIR({
      script: "Etapa A\n---\nEtapa B\n---\nEtapa C"
    });
    expect(res.steps.map((s) => s.stepId)).toEqual(["s1", "s2", "s3"]);
    expect(res.steps.map((s) => s.stepNumber)).toEqual([1, 2, 3]);
    expect(res.steps[0].agentPrompt).toContain("Etapa A");
  });

  it("splits by # ETAPA headers", () => {
    const res = compileAttendanceFlowIR({
      script: "# ETAPA 1 — Abertura\nOlá!\n\n# ETAPA 2 — Pergunta\nPosso saber seu nome?"
    });
    expect(res.steps.length).toBe(2);
    expect(res.steps[0].title.toLowerCase()).toContain("abertura");
    expect(res.steps[1].title.toLowerCase()).toContain("pergunta");
  });

  it("never splits on blank lines alone (3+ blank lines stays one step)", () => {
    const res = compileAttendanceFlowIR({ script: "Linha 1\n\n\nLinha 2" });
    expect(res.steps.length).toBe(1);
  });

  it("infers expectedReply=date when last question asks for a date or period", () => {
    const res = compileAttendanceFlowIR({
      script: "# ETAPA 1\nLegal! Qual data você imagina para a viagem?"
    });
    expect(res.steps[0].expectedReply).toBe("date");
    expect(res.steps[0].slotName).toBe("preferredDate");
  });

  it("infers expectedReply=number when last question asks for quantity (groupSize)", () => {
    const res = compileAttendanceFlowIR({
      script: "# ETAPA 1\nQuantas pessoas vão viajar com você?"
    });
    expect(res.steps[0].expectedReply).toBe("number");
    expect(res.steps[0].slotName).toBe("groupSize");
  });

  it("infers expectedReply=choice on numbered menu", () => {
    const res = compileAttendanceFlowIR({
      script: "# ETAPA 1\n1️⃣ Plano A\n2️⃣ Plano B\nQual opção?"
    });
    expect(res.steps[0].expectedReply).toBe("choice");
  });

  it("infers natural A, B ou C questions as semantic choices", () => {
    const res = compileAttendanceFlowIR({
      script: [
        "# ETAPA 1",
        "Você procura mais organização interna, automação de atendimento ou crescimento nas vendas?",
        "---",
        "# ETAPA 2",
        "Entendi. Qual é a maior dificuldade hoje?"
      ].join("\n")
    });
    expect(res.steps[0].expectedReply).toBe("choice");
    expect(res.steps[0].slotName).toBe("interest");
    const labels = res.steps[0].branchesIR.map((b) => b.label.toLowerCase());
    expect(labels).toEqual(expect.arrayContaining([
      "organização interna",
      "automação de atendimento",
      "crescimento nas vendas"
    ]));
    expect(res.steps[0].branchesIR.find((b) => b.label === "organização interna")?.nextStepId).toBe("s2");
  });

  it("infers expectedReply=yes_no when question is sim/não", () => {
    const res = compileAttendanceFlowIR({
      script: "# ETAPA 1\nVocê aceita o agendamento (sim/não)?"
    });
    expect(res.steps[0].expectedReply).toBe("yes_no");
  });

  it("infers expectedReply=none when step has only /comando and no visible question", () => {
    const res = compileAttendanceFlowIR({
      script: "# ETAPA 1\n/transferirchamado",
      smartActions: [{ id: 10, slug: "transferirchamado", type: "transferir", name: "Transferir" }]
    });
    expect(res.steps[0].expectedReply).toBe("none");
    expect(res.steps[0].commandsIR.length).toBe(1);
    expect(res.steps[0].commandsIR[0]).toMatchObject({
      slug: "transferirchamado",
      when: "on_present",
      kind: "transferir",
      smartActionId: 10
    });
  });

  it("classifies tail /comando after EXEMPLO as after_reply (deferred)", () => {
    const script = [
      "# ETAPA 1",
      "Quando quer marcar?",
      "EXEMPLO DE RESPOSTA DO LEAD:",
      "20/05 às 14h",
      "RESPOSTA:",
      "Perfeito! Vou agendar.",
      "/agendamento"
    ].join("\n");
    const res = compileAttendanceFlowIR({
      script,
      smartActions: [{ id: 5, slug: "agendamento", type: "agendamento", name: "Agendar" }]
    });
    expect(res.steps.length).toBe(1);
    const cmd = res.steps[0].commandsIR[0];
    expect(cmd.when).toBe("after_reply");
    expect(cmd.deferred).toBe(true);
    expect(cmd.kind).toBe("agendamento");
    expect(cmd.smartActionId).toBe(5);
  });

  it("warns when /comando in script has no matching smart action", () => {
    const res = compileAttendanceFlowIR({
      script: "# ETAPA 1\nFinalizado.\n/comandoFantasma"
    });
    const w = res.warnings.join("\n");
    expect(w).toMatch(/comandoFantasma/);
  });

  it("does not emit commandIR when slug matches a media library entry", () => {
    const res = compileAttendanceFlowIR({
      script: "# ETAPA 1\nOlha o catálogo:\n/catalogo",
      mediaLibrary: [{ slug: "catalogo" }]
    });
    expect(res.steps[0].commandsIR.length).toBe(0);
  });

  it("adds linear always branch between consecutive steps when no semantic branch exists", () => {
    const res = compileAttendanceFlowIR({
      script: "# ETAPA 1\nOlá!\n\n# ETAPA 2\nObrigado."
    });
    expect(res.steps[0].branchesIR.length).toBe(1);
    expect(res.steps[0].branchesIR[0].matcher).toBe("always");
    expect(res.steps[0].branchesIR[0].nextStepId).toBe("s2");
    /** Última etapa não recebe always (não tem próxima). */
    expect(res.steps[1].branchesIR.length).toBe(0);
  });

  it("derives semantic branch from EXEMPLO DE RESPOSTA blocks", () => {
    const script = [
      "# ETAPA 1",
      "Você quer agendar agora ou depois?",
      "EXEMPLO DE RESPOSTA DO LEAD:",
      "agendar agora",
      "RESPOSTA:",
      "Perfeito, vamos agendar.",
      "---",
      "# ETAPA 2",
      "Qual data?"
    ].join("\n");
    const res = compileAttendanceFlowIR({ script });
    const sem = res.steps[0].branchesIR.find((b) => b.matcher === "semantic");
    expect(sem).toBeTruthy();
    expect(sem!.label.toLowerCase()).toContain("agendar");
    expect(sem!.nextStepId).toBe("s2");
  });

  it("extracts trainingMarkers.examples and objections", () => {
    const script = [
      "# ETAPA 1",
      "Como posso ajudar?",
      "EXEMPLO DE RESPOSTA DO LEAD:",
      "quero saber valor",
      "RESPOSTA:",
      "Sobre valores, depende.",
      "",
      "# OBJEÇÕES",
      "EXEMPLO: 'está caro'",
      "RESPOSTA: pode parecer, mas..."
    ].join("\n");
    const res = compileAttendanceFlowIR({ script });
    expect(res.steps[0].trainingMarkers.examples[0].toLowerCase()).toContain("valor");
    expect(res.steps[0].trainingMarkers.objections.length).toBeGreaterThanOrEqual(1);
    /** customerVisibleText nunca pode conter "EXEMPLO" ou bloco de objeções. */
    expect(res.steps[0].customerVisibleText).not.toMatch(/EXEMPLO\s+DE\s+RESPOSTA/i);
    expect(res.steps[0].customerVisibleText).not.toMatch(/OBJE/i);
  });

  it("auto-split heuristic kicks in when no markers and content looks structured", () => {
    const script = [
      "Mensagem:",
      "Olá, como vai?",
      "",
      "Mensagem:",
      "Posso te ajudar com algo?"
    ].join("\n");
    const res = compileAttendanceFlowIR({ script });
    expect(res.steps.length).toBeGreaterThanOrEqual(2);
    /** Deve incluir warning sobre auto-split. */
    expect(res.warnings.join(" ")).toMatch(/auto-split|marcadores/i);
  });

  it("populates definition.entryStepId and fallbackStepId with first step", () => {
    const res = compileAttendanceFlowIR({ script: "A\n---\nB" });
    expect(res.definition.entryStepId).toBe("s1");
    expect(res.definition.fallbackStepId).toBe("s1");
  });

  it("respects custom policy override", () => {
    const res = compileAttendanceFlowIR({
      script: "A",
      policy: { maxTurnsPerStep: 99, strictMode: true }
    });
    expect(res.definition.policy.maxTurnsPerStep).toBe(99);
    expect(res.definition.policy.strictMode).toBe(true);
    /** Mantém defaults dos outros campos. */
    expect(res.definition.policy.allowCorrection).toBe(true);
  });

  it("propagates attachments by index from the input", () => {
    const res = compileAttendanceFlowIR({
      script: "A\n---\nB",
      stepAttachmentsByIndex: [[{ url: "/a.pdf" }], undefined]
    });
    expect(res.steps[0].attachments).toEqual([{ url: "/a.pdf" }]);
    expect(res.steps[1].attachments).toEqual([]);
  });

  it("is idempotent: compiling the same script twice yields equivalent IR", () => {
    const script = "# ETAPA 1\nOlá!\n\n# ETAPA 2\nQual a data?";
    const a = compileAttendanceFlowIR({ script });
    const b = compileAttendanceFlowIR({ script });
    expect(a.steps.length).toBe(b.steps.length);
    for (let i = 0; i < a.steps.length; i += 1) {
      expect(a.steps[i].stepId).toBe(b.steps[i].stepId);
      expect(a.steps[i].expectedReply).toBe(b.steps[i].expectedReply);
      expect(a.steps[i].title).toBe(b.steps[i].title);
      expect(a.steps[i].customerVisibleText).toBe(b.steps[i].customerVisibleText);
    }
  });
});
