/**
 * Mock do executor de smart actions ANTES de qualquer import para evitar inicialização
 * pesada (socket.io, sequelize models, etc.) durante a carga do módulo do bus.
 * Em `dryRun: true` o bus não chama, mas o `import` transitivo do executor faria
 * o jest sentar inicializando todo o sistema.
 */
jest.mock("../services/PromptServices/PromptSmartActionExecutorService", () => ({
  executeSmartAction: jest
    .fn()
    .mockResolvedValue({ success: true, message: "[mock] executed", data: null })
}));

import { triggerHook, computeHookKey, type TransitionHook } from "../services/PromptServices/HookTriggerBus";
import type { StepCommandIR } from "../helpers/compileAttendanceFlowIR";
import type { AttendanceFlowMemory } from "../helpers/agentAttendanceFlowMemory";
import { executeSmartAction } from "../services/PromptServices/PromptSmartActionExecutorService";

const mockedExecute = executeSmartAction as unknown as jest.MockedFunction<typeof executeSmartAction>;

const FAKE_CTX = {
  prompt: { id: 1 } as any,
  ticket: { id: 1, companyId: 1 } as any,
  contact: { id: 1 } as any
};

describe("HookTriggerBus", () => {
  describe("step-level hooks (commandsIR)", () => {
    it("fires step hooks whose `when` matches the moment", async () => {
      const cmds: StepCommandIR[] = [
        { slug: "agendamento", smartActionId: 10, when: "on_present" },
        { slug: "transferirchamado", smartActionId: 20, when: "after_reply", deferred: true }
      ];
      const out = await triggerHook({
        moment: "on_present",
        step: { stepNumber: 1, stepId: "s1", commandsIR: cmds },
        context: FAKE_CTX,
        dryRun: true
      });
      expect(out.results.length).toBe(1);
      expect(out.results[0].slug).toBe("agendamento");
      expect(out.results[0].moment).toBe("on_present");
      expect(out.results[0].success).toBe(true);
    });

    it("ignores step hooks whose `when` does not match", async () => {
      const cmds: StepCommandIR[] = [
        { slug: "agendamento", smartActionId: 10, when: "on_present" }
      ];
      const out = await triggerHook({
        moment: "after_reply",
        step: { stepNumber: 1, commandsIR: cmds },
        context: FAKE_CTX,
        dryRun: true
      });
      expect(out.results.length).toBe(0);
    });

    it("returns empty when step has no commandsIR (backwards-compat)", async () => {
      const out = await triggerHook({
        moment: "on_present",
        step: { stepNumber: 1, commandsIR: null },
        context: FAKE_CTX,
        dryRun: true
      });
      expect(out.results.length).toBe(0);
    });
  });

  describe("transitionHooks (global)", () => {
    it("matches `from='*' to='s2'` when going s1 -> s2", async () => {
      const hooks: TransitionHook[] = [
        { from: "*", to: "s2", action: { slug: "notify", smartActionId: 30 }, label: "ping" }
      ];
      const out = await triggerHook({
        moment: "on_transition",
        fromStep: { stepNumber: 1, stepId: "s1" },
        toStep: { stepNumber: 2, stepId: "s2" },
        transitionHooks: hooks,
        context: FAKE_CTX,
        dryRun: true
      });
      expect(out.results.length).toBe(1);
      expect(out.results[0].slug).toBe("notify");
    });

    it("matches by numeric stepNumber too (`from='1' to='2'`)", async () => {
      const hooks: TransitionHook[] = [
        { from: "1", to: "2", action: { slug: "notify", smartActionId: 30 } }
      ];
      const out = await triggerHook({
        moment: "on_transition",
        fromStep: { stepNumber: 1 },
        toStep: { stepNumber: 2 },
        transitionHooks: hooks,
        context: FAKE_CTX,
        dryRun: true
      });
      expect(out.results.length).toBe(1);
    });

    it("does NOT fire when `to` does not match", async () => {
      const hooks: TransitionHook[] = [
        { from: "*", to: "s9", action: { slug: "notify", smartActionId: 30 } }
      ];
      const out = await triggerHook({
        moment: "on_transition",
        fromStep: { stepNumber: 1, stepId: "s1" },
        toStep: { stepNumber: 2, stepId: "s2" },
        transitionHooks: hooks,
        context: FAKE_CTX,
        dryRun: true
      });
      expect(out.results.length).toBe(0);
    });

    it("`condition='on_match'` only fires when matched=true", async () => {
      const hooks: TransitionHook[] = [
        {
          from: "*",
          to: "*",
          action: { slug: "celebrate", smartActionId: 40 },
          condition: "on_match"
        }
      ];
      const noMatch = await triggerHook({
        moment: "on_transition",
        fromStep: { stepNumber: 1 },
        toStep: { stepNumber: 2 },
        transitionHooks: hooks,
        matched: false,
        context: FAKE_CTX,
        dryRun: true
      });
      expect(noMatch.results.length).toBe(0);

      const yesMatch = await triggerHook({
        moment: "on_transition",
        fromStep: { stepNumber: 1 },
        toStep: { stepNumber: 2 },
        transitionHooks: hooks,
        matched: true,
        context: FAKE_CTX,
        dryRun: true
      });
      expect(yesMatch.results.length).toBe(1);
    });

    it("`condition='on_correction'` only fires on the on_correction moment", async () => {
      const hooks: TransitionHook[] = [
        {
          from: "*",
          to: "*",
          action: { slug: "rollback", smartActionId: 50 },
          condition: "on_correction"
        }
      ];
      const wrongMoment = await triggerHook({
        moment: "on_transition",
        fromStep: { stepNumber: 1 },
        toStep: { stepNumber: 2 },
        transitionHooks: hooks,
        context: FAKE_CTX,
        dryRun: true
      });
      expect(wrongMoment.results.length).toBe(0);

      const rightMoment = await triggerHook({
        moment: "on_correction",
        fromStep: { stepNumber: 2 },
        toStep: { stepNumber: 1 },
        transitionHooks: hooks,
        isCorrection: true,
        context: FAKE_CTX,
        dryRun: true
      });
      expect(rightMoment.results.length).toBe(1);
      expect(rightMoment.results[0].slug).toBe("rollback");
    });

    it("on_flow_complete matches transitionHooks with to='end'", async () => {
      const hooks: TransitionHook[] = [
        { from: "*", to: "end", action: { slug: "thankyou", smartActionId: 60 } }
      ];
      const out = await triggerHook({
        moment: "on_flow_complete",
        fromStep: { stepNumber: 3 },
        transitionHooks: hooks,
        context: FAKE_CTX,
        dryRun: true
      });
      expect(out.results.length).toBe(1);
      expect(out.results[0].slug).toBe("thankyou");
    });
  });

  describe("dedup with memory.firedHookKeys", () => {
    it("does not refire a hook already in memory.firedHookKeys for the step", async () => {
      const cmds: StepCommandIR[] = [
        { slug: "agendamento", smartActionId: 10, when: "on_present" }
      ];
      const memory: AttendanceFlowMemory = {
        schemaVersion: 1,
        promptId: 1,
        lastPresentedStep: 1,
        firedHookKeys: {
          "1": [computeHookKey("on_present", "agendamento", 10)]
        }
      };
      const out = await triggerHook({
        moment: "on_present",
        step: { stepNumber: 1, commandsIR: cmds },
        context: FAKE_CTX,
        memory,
        dryRun: true
      });
      expect(out.results.length).toBe(1);
      expect(out.results[0].skipped).toBe("already_fired");
      /** memory snapshot didn't change ⇒ no patch. */
      expect(out.memoryPatch).toBeUndefined();
    });

    it("emits a memoryPatch on first fire", async () => {
      const cmds: StepCommandIR[] = [
        { slug: "agendamento", smartActionId: 10, when: "on_present" }
      ];
      const memory: AttendanceFlowMemory = {
        schemaVersion: 1,
        promptId: 1,
        lastPresentedStep: 1,
        firedHookKeys: {}
      };
      const out = await triggerHook({
        moment: "on_present",
        step: { stepNumber: 1, commandsIR: cmds },
        context: FAKE_CTX,
        memory,
        dryRun: true
      });
      expect(out.results.length).toBe(1);
      expect(out.results[0].skipped).toBeUndefined();
      expect(out.memoryPatch).toBeDefined();
      expect(out.memoryPatch!.firedHookKeys["1"]).toContain(
        computeHookKey("on_present", "agendamento", 10)
      );
    });
  });

  describe("edge cases", () => {
    it("returns empty when neither step nor transitionHooks provided", async () => {
      const out = await triggerHook({
        moment: "on_transition",
        context: FAKE_CTX,
        dryRun: true
      });
      expect(out.results).toEqual([]);
    });

    it("hook with missing slug AND smartActionId is skipped='missing_slug' silently when only one present", async () => {
      /** Quando slug está vazio mas smartActionId existe, NÃO é missing_slug — é candidato válido. */
      const hooks: TransitionHook[] = [
        { from: "*", to: "*", action: { smartActionId: 99 } }
      ];
      const out = await triggerHook({
        moment: "on_transition",
        fromStep: { stepNumber: 1 },
        toStep: { stepNumber: 2 },
        transitionHooks: hooks,
        context: FAKE_CTX,
        dryRun: true
      });
      expect(out.results.length).toBe(1);
      expect(out.results[0].smartActionId).toBe(99);
      expect(out.results[0].slug).toBe("");
    });

    it("non-dryRun path delegates to executeSmartAction with correct params", async () => {
      mockedExecute.mockClear();
      mockedExecute.mockResolvedValueOnce({ success: true, message: "ok", data: { ok: 1 } });

      const out = await triggerHook({
        moment: "on_transition",
        fromStep: { stepNumber: 1, stepId: "s1" },
        toStep: { stepNumber: 2, stepId: "s2" },
        transitionHooks: [
          { from: "*", to: "s2", action: { slug: "notify", smartActionId: 30, variables: { ping: 1 } } }
        ],
        context: FAKE_CTX
      });

      expect(out.results.length).toBe(1);
      expect(out.results[0].success).toBe(true);
      expect(out.results[0].slug).toBe("notify");
      expect(mockedExecute).toHaveBeenCalledTimes(1);
      const callArgs = mockedExecute.mock.calls[0];
      expect(callArgs[0]).toBe("notify");
      expect(callArgs[5]).toMatchObject({
        smartActionId: 30,
        scriptSlug: "notify",
        attendanceFlowStep: 2
      });
      const vars = callArgs[4] as Record<string, unknown>;
      expect(vars.ping).toBe(1);
      expect(vars.__hookMoment).toBe("on_transition");
      expect(vars.__hookSource).toBe("transition");
      expect(vars.__hookFromStep).toBe(1);
      expect(vars.__hookToStep).toBe(2);
    });

    it("marks skipped='no_action_found' when executor returns 'não encontrada'", async () => {
      mockedExecute.mockClear();
      mockedExecute.mockResolvedValueOnce({
        success: false,
        message: 'Ação "foo" não encontrada para este agente'
      });

      const out = await triggerHook({
        moment: "on_transition",
        fromStep: { stepNumber: 1 },
        toStep: { stepNumber: 2 },
        transitionHooks: [{ from: "*", to: "*", action: { slug: "foo" } }],
        context: FAKE_CTX
      });

      expect(out.results[0].success).toBe(false);
      expect(out.results[0].skipped).toBe("no_action_found");
    });

    it("does NOT mark fired in memory when executor returns success=false", async () => {
      mockedExecute.mockClear();
      mockedExecute.mockResolvedValueOnce({ success: false, message: "config faltando" });
      const memory: AttendanceFlowMemory = {
        schemaVersion: 1,
        promptId: 1,
        lastPresentedStep: 1,
        firedHookKeys: {}
      };
      const out = await triggerHook({
        moment: "on_transition",
        fromStep: { stepNumber: 1 },
        toStep: { stepNumber: 2 },
        transitionHooks: [{ from: "*", to: "*", action: { slug: "foo", smartActionId: 70 } }],
        context: FAKE_CTX,
        memory
      });
      expect(out.results[0].success).toBe(false);
      /** Falha → não deve marcar como fired (permite retry). */
      expect(out.memoryPatch).toBeUndefined();
    });

    it("step-level + transition hooks both fire and order: step first, transition second", async () => {
      const cmds: StepCommandIR[] = [
        { slug: "step_hook", smartActionId: 1, when: "on_exit" }
      ];
      const hooks: TransitionHook[] = [
        { from: "*", to: "*", action: { slug: "trans_hook", smartActionId: 2 } }
      ];
      const out = await triggerHook({
        moment: "on_exit",
        step: { stepNumber: 1, commandsIR: cmds },
        fromStep: { stepNumber: 1 },
        toStep: { stepNumber: 2 },
        transitionHooks: hooks,
        context: FAKE_CTX,
        dryRun: true
      });
      expect(out.results.length).toBe(2);
      expect(out.results[0].slug).toBe("step_hook");
      expect(out.results[1].slug).toBe("trans_hook");
    });
  });
});
