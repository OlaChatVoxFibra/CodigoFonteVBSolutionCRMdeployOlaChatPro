/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export const DEFAULT_START_TIME = "09:00";
export const DEFAULT_END_TIME = "18:00";

/** Converte ISO/Date para input type="date" (YYYY-MM-DD). */
export const toDateInputValue = (value) => {
  if (!value) return "";
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
};

/** Converte ISO/Date para input type="time" (HH:mm). */
export const toTimeInputValue = (value, role = "start") => {
  const fallback = role === "end" ? DEFAULT_END_TIME : DEFAULT_START_TIME;
  if (!value) return fallback;
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return fallback;
    const h = d.getHours();
    const m = d.getMinutes();
    const s = d.getSeconds();
    const ms = d.getMilliseconds();
    if (role === "start" && h === 0 && m === 0 && s === 0 && ms === 0) {
      return DEFAULT_START_TIME;
    }
    if (role === "end" && h === 23 && m === 59 && s >= 59) {
      return DEFAULT_END_TIME;
    }
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  } catch {
    return fallback;
  }
};

export const combineDateAndTimeToISO = (yyyyMmDd, hhMm, fallbackTime = DEFAULT_START_TIME) => {
  if (!yyyyMmDd) return null;
  const time = hhMm || fallbackTime;
  const [y, mo, d] = yyyyMmDd.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi || 0, 0, 0).toISOString();
};

/** Data + horário de início. */
export const dateInputToStartISO = (yyyyMmDd, time) => {
  if (!yyyyMmDd) return null;
  if (time) {
    return combineDateAndTimeToISO(yyyyMmDd, time, DEFAULT_START_TIME);
  }
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
};

/** Data + horário de fim (prazo). */
export const dateInputToEndISO = (yyyyMmDd, time) => {
  if (!yyyyMmDd) return null;
  if (time) {
    return combineDateAndTimeToISO(yyyyMmDd, time, DEFAULT_END_TIME);
  }
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
};

export const validateDeadlineRange = (dateStart, dateEnd, timeStart, timeEnd) => {
  if (!dateStart || !dateEnd) {
    return "Preencha o prazo com data de início e fim.";
  }
  if (dateEnd < dateStart) {
    return "A data de fim deve ser igual ou posterior à data de início.";
  }
  if (timeStart && timeEnd) {
    const startIso = combineDateAndTimeToISO(dateStart, timeStart, DEFAULT_START_TIME);
    const endIso = combineDateAndTimeToISO(dateEnd, timeEnd, DEFAULT_END_TIME);
    if (startIso && endIso && new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      return "O horário de fim deve ser posterior ao horário de início.";
    }
  }
  return null;
};

export const formatDeadlineRangeLabel = (start, end, options = {}) => {
  const { showTime = false } = options;
  const fmtDate = (v) => {
    const s = toDateInputValue(v);
    if (!s) return "";
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  };
  const fmtTime = (v) => {
    if (!v) return "";
    try {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return "";
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } catch {
      return "";
    }
  };
  const a = fmtDate(start);
  const b = fmtDate(end);
  if (!a && !b) return "—";
  if (showTime) {
    const ta = fmtTime(start);
    const tb = fmtTime(end);
    if (a && b) {
      if (a === b) return ta && tb ? `${a} ${ta} – ${tb}` : a;
      return ta && tb ? `${a} ${ta} – ${b} ${tb}` : `${a} – ${b}`;
    }
    return a || b;
  }
  if (a && b) return a === b ? a : `${a} – ${b}`;
  return a || b || "—";
};

/** Rótulos em duas linhas para modais (evita overflow horizontal). */
export const formatDeadlineWhenLines = (start, end) => {
  const fmtDate = (v) => {
    const s = toDateInputValue(v);
    if (!s) return "";
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  };
  const fmtTime = (v) => {
    if (!v) return "";
    try {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return "";
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } catch {
      return "";
    }
  };
  const startDate = fmtDate(start);
  const endDate = fmtDate(end || start);
  const startTime = fmtTime(start);
  const endTime = fmtTime(end || start);
  return {
    startLabel: startDate
      ? startTime
        ? `${startDate} · ${startTime}`
        : startDate
      : "—",
    endLabel: endDate ? (endTime ? `${endDate} · ${endTime}` : endDate) : "—",
  };
};

/** Evento/atividade cujo prazo (dateEnd ou date) já passou. */
export const isDeadlineExpired = (item) => {
  if (!item) return false;
  const endRaw = item.dateEnd || item.date;
  if (!endRaw) return false;
  const end = new Date(endRaw);
  return !Number.isNaN(end.getTime()) && end.getTime() < Date.now();
};
