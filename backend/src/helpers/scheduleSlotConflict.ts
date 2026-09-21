/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op } from "sequelize";
import Schedule from "../models/Schedule";

const ACTIVE_STATUSES = ["PENDENTE", "AGUARDANDO_LEMBRETE"];

function parseSlotMinutes(v: unknown): number {
  const n = Number(v);
  if (Number.isFinite(n) && n > 0 && n <= 24 * 60) return Math.floor(n);
  return 30;
}

function intervalOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  return a0 < b1 && b0 < a1;
}

/**
 * Retorna um agendamento ativo que conflita com [at, at + slotMinutes], assumindo a mesma duração para compromissos existentes.
 */
export async function findConflictingScheduleSlot(
  companyId: number,
  at: Date,
  slotMinutes?: unknown
): Promise<Schedule | null> {
  const dur = parseSlotMinutes(slotMinutes);
  const reqStart = at.getTime();
  const reqEnd = reqStart + dur * 60 * 1000;

  const rows = await Schedule.findAll({
    where: {
      companyId,
      status: { [Op.in]: ACTIVE_STATUSES }
    },
    attributes: ["id", "sendAt", "status", "companyId"]
  });

  for (const row of rows) {
    const raw = row.getDataValue("sendAt") as Date | string | null | undefined;
    if (raw == null) continue;
    const ex = raw instanceof Date ? raw : new Date(raw);
    const exTime = ex.getTime();
    if (Number.isNaN(exTime)) continue;
    const exEnd = exTime + dur * 60 * 1000;
    if (intervalOverlap(reqStart, reqEnd, exTime, exEnd)) {
      return row;
    }
  }
  return null;
}
