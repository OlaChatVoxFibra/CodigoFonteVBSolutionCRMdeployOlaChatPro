/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import { Op } from "sequelize";
import ActivityStage from "../models/ActivityStage";
import AppError from "../errors/AppError";

export default {
  async list(req: Request, res: Response): Promise<Response> {
    const { companyId } = req.user;
    const stages = await ActivityStage.findAll({ where: { companyId }, order: [["order", "ASC"], ["id", "ASC"]] });
    return res.json(stages.map(s => ({ id: s.id, key: s.key, label: s.label, color: s.color, order: s.order })));
  },

  async bulkSave(req: Request, res: Response): Promise<Response> {
    const { companyId, profile, super: isSuper } = req.user;
    if (profile !== "admin" && !isSuper) throw new AppError("ERR_NO_PERMISSION", 403);

    const { stages } = req.body as { stages: Array<{ id?: any; key: string; label: string; color: string; order?: number }> };
    if (!Array.isArray(stages)) throw new AppError("ERR_INVALID_PARAM", 400);

    const existing = await ActivityStage.findAll({ where: { companyId } });
    const existingIds = new Set(existing.map(s => s.id));
    const incomingIds: number[] = [];

    let order = 0;
    for (const st of stages) {
      order += 1;
      const parsedId = typeof st.id === "number" ? st.id : Number(st.id);
      const hasValidId = Number.isInteger(parsedId) && parsedId > 0;
      if (hasValidId) {
        const m = await ActivityStage.findOne({ where: { id: parsedId, companyId } });
        if (m) {
          m.key = st.key.toLowerCase();
          m.label = st.label;
          m.color = st.color;
          m.order = order;
          await m.save();
          incomingIds.push(m.id);
        } else {
          const created = await ActivityStage.create({
            id: parsedId,
            key: st.key.toLowerCase(),
            label: st.label,
            color: st.color,
            order,
            companyId
          } as any);
          incomingIds.push(created.id);
        }
      } else {
        const created = await ActivityStage.create({
          key: st.key.toLowerCase(),
          label: st.label,
          color: st.color,
          order,
          companyId
        });
        incomingIds.push(created.id);
      }
    }

    const toRemove = [...existingIds].filter(id => !incomingIds.includes(id));
    if (toRemove.length) {
      await ActivityStage.destroy({ where: { id: { [Op.in]: toRemove }, companyId } });
    }

    const list = await ActivityStage.findAll({ where: { companyId }, order: [["order", "ASC"], ["id", "ASC"]] });
    return res.status(200).json(list.map(s => ({ id: s.id, key: s.key, label: s.label, color: s.color, order: s.order })));
  }
};
