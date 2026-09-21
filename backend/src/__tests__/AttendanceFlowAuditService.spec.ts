/**
 * Tests do AttendanceFlowAuditService (PR 7) — emissor de timeline.
 */
import {
  appendTimelineEvent,
  buildTimelineEventFromDecision,
  logTimelineEvent,
  type TimelineEvent
} from "../services/PromptServices/AttendanceFlowAuditService";

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    ts: new Date().toISOString(),
    ticketId: 10,
    promptId: 20,
    intent: "advance",
    fromStepId: "s1",
    toStepId: "s2",
    confidence: 0.9,
    reasoning: "ok",
    source: "fallback",
    ...overrides
  };
}

describe("appendTimelineEvent", () => {
  it("appends to empty list", () => {
    const list = appendTimelineEvent(undefined, makeEvent());
    expect(list).toHaveLength(1);
  });

  it("preserves existing events", () => {
    const e1 = makeEvent({ intent: "noise" });
    const e2 = makeEvent({ intent: "advance" });
    const list = appendTimelineEvent([e1], e2);
    expect(list).toHaveLength(2);
    expect(list[0].intent).toBe("noise");
    expect(list[1].intent).toBe("advance");
  });

  it("caps timeline at 50 entries (bounded)", () => {
    const existing = Array.from({ length: 50 }, (_, i) =>
      makeEvent({ intent: "advance", reasoning: `e${i}` })
    );
    const list = appendTimelineEvent(existing, makeEvent({ reasoning: "novo" }));
    expect(list).toHaveLength(50);
    expect(list[0].reasoning).toBe("e1");
    expect(list[49].reasoning).toBe("novo");
  });

  it("ignores invalid prev (string/number)", () => {
    const list = appendTimelineEvent("oops" as any, makeEvent());
    expect(list).toHaveLength(1);
  });
});

describe("buildTimelineEventFromDecision", () => {
  it("converts decision audit + hooks into a stable TimelineEvent", () => {
    const ev = buildTimelineEventFromDecision({
      ticketId: 99,
      promptId: 123,
      audit: {
        intent: "correction",
        fromStepId: "s3",
        toStepId: "s2",
        confidence: 0.8,
        reasoning: "Cliente corrigiu data",
        source: "llm",
        filledSlot: { name: "preferredDate", type: "date", value: "2026-05-21T00:00:00.000Z" }
      },
      matchedBranch: { matcher: "semantic", label: "agendar agora", nextStepId: "s4" },
      hookFires: [
        { moment: "on_correction", step: { stepId: "s2" }, matched: false },
        { moment: "on_enter", step: { stepId: "s2" } }
      ]
    });
    expect(ev.ticketId).toBe(99);
    expect(ev.intent).toBe("correction");
    expect(ev.matchedBranch?.label).toBe("agendar agora");
    expect(ev.hookFires).toEqual([
      { moment: "on_correction", stepId: "s2", matched: false },
      { moment: "on_enter", stepId: "s2", matched: undefined }
    ]);
    expect(ev.filledSlot?.value).toMatch(/2026-05-21/);
  });

  it("handles missing matchedBranch / hooks / filledSlot gracefully", () => {
    const ev = buildTimelineEventFromDecision({
      ticketId: 1,
      promptId: 2,
      audit: {
        intent: "noise",
        fromStepId: "s1",
        toStepId: "s1",
        confidence: 0.95,
        reasoning: "emoji",
        source: "fallback"
      }
    });
    expect(ev.matchedBranch).toBeNull();
    expect(ev.hookFires).toEqual([]);
    expect(ev.filledSlot).toBeNull();
  });
});

describe("logTimelineEvent", () => {
  it("does not throw on event", () => {
    expect(() => logTimelineEvent(makeEvent())).not.toThrow();
  });
});
