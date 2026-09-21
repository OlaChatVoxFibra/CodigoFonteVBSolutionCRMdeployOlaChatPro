/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

const WON_PATTERN = /(fech|fechado|fechamento|won|convert|ganho|conclu)/i;

export function isWonStatusLabelOrKey(key, label) {
  return WON_PATTERN.test(`${String(key || "")} ${String(label || "")}`);
}

/** Chaves de etapa que contam como venda no dashboard (alinha com o backend). */
export function collectWonStatusKeys(columns) {
  const keys = new Set(
    ["fechado", "won", "ganho", "convertido", "converted", "concluido"].map((k) =>
      k.toLowerCase()
    )
  );
  const cols = Array.isArray(columns) ? columns : [];
  for (const c of cols) {
    const key = String(c.key || "").toLowerCase();
    if (!key) continue;
    if (isWonStatusLabelOrKey(c.key, c.label)) keys.add(key);
  }
  if (cols.length) {
    const last = cols[cols.length - 1];
    const lastKey = String(last.key || "").toLowerCase();
    if (lastKey) keys.add(lastKey);
  }
  return keys;
}

export function isLeadSaleWon(status, columns) {
  const s = String(status || "").toLowerCase();
  if (!s) return false;
  const wonKeys = collectWonStatusKeys(columns);
  if (wonKeys.has(s)) return true;
  return WON_PATTERN.test(s);
}

/** Etapa de conclusão (última etapa de ganho ou última coluna do pipeline). */
export function resolveWonStageKey(columns) {
  const cols = Array.isArray(columns) ? columns : [];
  if (!cols.length) return "fechado";
  const won = cols.find((c) => isWonStatusLabelOrKey(c.key, c.label));
  if (won?.key) return String(won.key).toLowerCase();
  return String(cols[cols.length - 1].key || "fechado").toLowerCase();
}

export function getWonStageLabel(columns, stageKey) {
  const cols = Array.isArray(columns) ? columns : [];
  const key = String(stageKey || "").toLowerCase();
  const col = cols.find((c) => String(c.key || "").toLowerCase() === key);
  return col?.label || "Concluído";
}

function formatAddress(addr) {
  if (!addr) return "";
  if (typeof addr === "string") return addr;
  if (typeof addr === "object") {
    return [
      addr.street,
      addr.number,
      addr.neighborhood,
      addr.city,
      addr.state,
      addr.zipCode || addr.cep,
    ]
      .filter(Boolean)
      .join(", ");
  }
  return "";
}

/** Mapeia lead de vendas → formulário de empresa (leads convertidos). */
export function leadToConvertedCompanyInitialValues(lead, contact) {
  const c = lead?.contact || contact;
  const phone = lead?.phone || c?.number || "";
  const baseDesc = lead?.description || "";
  const descParts = [baseDesc, phone ? `Telefone: ${phone}` : ""].filter(Boolean);

  let dateStr = "";
  if (lead?.date) {
    try {
      const d = new Date(lead.date);
      if (!Number.isNaN(d.getTime())) {
        dateStr = d.toISOString().slice(0, 10);
      }
    } catch {
      dateStr = "";
    }
  }

  return {
    name: (lead?.companyName || lead?.name || "").trim(),
    description: descParts.join("\n"),
    email: c?.email || "",
    phone,
    address: formatAddress(lead?.address),
    sector:
      lead?.sector ||
      (Array.isArray(lead?.tags) && lead.tags[0] ? lead.tags[0] : "") ||
      lead?.origin ||
      "",
    contactId: lead?.contactId || c?.id || null,
    responsibleId: lead?.responsibleId || null,
    date: dateStr || new Date().toISOString().slice(0, 10),
  };
}
