import {
  bodyLooksLikeDateOrPeriodReply,
  looksLikePeriodWithoutExactDate
} from "../helpers/agentAttendanceFlowMemory";
import { parseDateTimeFromText } from "../helpers/parseDateTimeFromText";

describe("schedule smart action resilience (PR 11)", () => {
  describe("bodyLooksLikeDateOrPeriodReply", () => {
    it("accepts natural language periods like 'semana que vem'", () => {
      expect(bodyLooksLikeDateOrPeriodReply("semana que vem")).toBe(true);
      expect(bodyLooksLikeDateOrPeriodReply("Pode ser na próxima semana")).toBe(true);
    });

    it("accepts vague periods like 'qualquer dia'", () => {
      expect(bodyLooksLikeDateOrPeriodReply("qualquer dia")).toBe(true);
      expect(bodyLooksLikeDateOrPeriodReply("tanto faz")).toBe(true);
    });

    it("accepts 'depois do almoço' / 'pela manhã'", () => {
      expect(bodyLooksLikeDateOrPeriodReply("depois do almoço")).toBe(true);
      expect(bodyLooksLikeDateOrPeriodReply("de manhã cedo")).toBe(true);
    });

    it("accepts 'feriado' / 'próximo feriado'", () => {
      expect(bodyLooksLikeDateOrPeriodReply("próximo feriado")).toBe(true);
    });

    it("accepts concrete dates like 'amanhã 10h'", () => {
      expect(bodyLooksLikeDateOrPeriodReply("amanhã 10h")).toBe(true);
    });

    it("rejects pure greetings", () => {
      expect(bodyLooksLikeDateOrPeriodReply("oi tudo bem")).toBe(false);
      expect(bodyLooksLikeDateOrPeriodReply("obrigado")).toBe(false);
    });

    it("rejects pricing/off-topic", () => {
      expect(bodyLooksLikeDateOrPeriodReply("qual o valor da diária?")).toBe(false);
    });
  });

  describe("looksLikePeriodWithoutExactDate", () => {
    it("identifies 'semana que vem' as next_week", () => {
      expect(looksLikePeriodWithoutExactDate("semana que vem")).toBe("next_week");
      expect(looksLikePeriodWithoutExactDate("na próxima semana")).toBe("next_week");
    });

    it("identifies 'mês que vem' as next_month", () => {
      expect(looksLikePeriodWithoutExactDate("mês que vem")).toBe("next_month");
      expect(looksLikePeriodWithoutExactDate("próximo mês")).toBe("next_month");
    });

    it("identifies weekend / fds", () => {
      expect(looksLikePeriodWithoutExactDate("fim de semana")).toBe("weekend");
      expect(looksLikePeriodWithoutExactDate("fds")).toBe("weekend");
      expect(looksLikePeriodWithoutExactDate("sabado")).toBe("weekend");
    });

    it("identifies 'qualquer dia' / 'tanto faz'", () => {
      expect(looksLikePeriodWithoutExactDate("qualquer dia")).toBe("any_day");
      expect(looksLikePeriodWithoutExactDate("tanto faz")).toBe("any_day");
    });

    it("identifies time-of-day", () => {
      expect(looksLikePeriodWithoutExactDate("de manhã")).toBe("morning");
      expect(looksLikePeriodWithoutExactDate("à tarde")).toBe("afternoon");
      expect(looksLikePeriodWithoutExactDate("à noite")).toBe("evening");
      expect(looksLikePeriodWithoutExactDate("depois do almoço")).toBe("after_lunch");
    });

    it("returns null for concrete date", () => {
      expect(looksLikePeriodWithoutExactDate("15/05 às 14h")).toBeNull();
    });

    it("returns null for unrelated text", () => {
      expect(looksLikePeriodWithoutExactDate("qual o preço?")).toBeNull();
    });
  });

  describe("parseDateTimeFromText behavior used by scheduling fallback", () => {
    it("matches concrete date+time", () => {
      const r = parseDateTimeFromText("15/05 às 14h30");
      expect(r.matched).toBe(true);
      expect(r.date).toBeTruthy();
    });

    it("does NOT match 'semana que vem' alone — period hint takes over", () => {
      const r = parseDateTimeFromText("semana que vem");
      expect(r.matched).toBe(false);
      expect(looksLikePeriodWithoutExactDate("semana que vem")).toBe("next_week");
    });
  });
});
