/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op } from "sequelize";
import LeadPipelineStage from "../models/LeadPipelineStage";

const WON_PATTERN = /(fech|fechado|fechamento|won|convert|ganho|conclu)/i;

export const isWonStatusLabelOrKey = (key?: string, label?: string): boolean =>
  WON_PATTERN.test(`${String(key || "")} ${String(label || "")}`);

/** Status reconhecido por regex (legado e padrão). */
export const isWonStatusByPattern = (status?: string): boolean =>
  WON_PATTERN.test(String(status || ""));

export const isLostStatus = (status?: string): boolean =>
  /^(perdido|lost|cancelado|rejeitado)$/i.test(String(status || ""));

type StageRow = { key?: string; label?: string; order?: number; pipelineId?: number };

/** Chaves de etapa que contam como venda (última coluna + etapas com nome de ganho). */
export function collectWonStatusKeysFromStages(stages: StageRow[]): Set<string> {
  const keys = new Set<string>();
  ["fechado", "won", "ganho", "convertido", "converted", "concluido"].forEach((k) =>
    keys.add(k.toLowerCase())
  );

  const byPipeline = new Map<number, StageRow[]>();
  for (const st of stages || []) {
    const pid = Number(st.pipelineId ?? 0);
    if (!byPipeline.has(pid)) byPipeline.set(pid, []);
    byPipeline.get(pid)!.push(st);
  }

  for (const list of byPipeline.values()) {
    const sorted = [...list].sort(
      (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)
    );
    for (const st of sorted) {
      const key = String(st.key || "").toLowerCase();
      if (!key) continue;
      if (isWonStatusLabelOrKey(st.key, st.label)) keys.add(key);
    }
    if (sorted.length) {
      const last = sorted[sorted.length - 1];
      const lastKey = String(last.key || "").toLowerCase();
      if (lastKey) keys.add(lastKey);
    }
  }

  return keys;
}

export async function loadWonStatusKeysForCompany(
  companyId: number,
  pipelineId?: number | string
): Promise<Set<string>> {
  const where: any = { companyId };
  if (pipelineId != null && pipelineId !== "") {
    const pid = Number(pipelineId);
    if (Number.isFinite(pid)) where.pipelineId = pid;
  }

  const stages = await LeadPipelineStage.findAll({
    where,
    attributes: ["key", "label", "order", "pipelineId"],
    raw: true
  });

  return collectWonStatusKeysFromStages(stages as StageRow[]);
}

export function isLeadSaleWon(
  status?: string,
  wonKeys?: Set<string>
): boolean {
  const s = String(status || "").toLowerCase();
  if (!s) return false;
  if (wonKeys?.size && wonKeys.has(s)) return true;
  return isWonStatusByPattern(s);
}

/** Filtro Sequelize: status considerado venda. */
export function mergeWhereWithWonFilter(baseWhere: any, wonFilter: any): any {
  const result = { ...baseWhere };
  if (result[Op.or]) {
    const prevOr = result[Op.or];
    delete result[Op.or];
    result[Op.and] = [...(result[Op.and] || []), { [Op.or]: prevOr }, wonFilter];
  } else {
    result[Op.and] = [...(result[Op.and] || []), wonFilter];
  }
  return result;
}

export function buildWonStatusWhere(wonKeys: Set<string>) {
  const keys = Array.from(wonKeys).filter(Boolean);
  const ors: any[] = [
    { status: { [Op.iLike]: "%fech%" } },
    { status: { [Op.iLike]: "%won%" } },
    { status: { [Op.iLike]: "%convert%" } },
    { status: { [Op.iLike]: "%ganho%" } },
    { status: { [Op.iLike]: "%conclu%" } }
  ];
  if (keys.length) {
    ors.push({ status: { [Op.in]: keys } });
  }
  return { [Op.or]: ors };
}
