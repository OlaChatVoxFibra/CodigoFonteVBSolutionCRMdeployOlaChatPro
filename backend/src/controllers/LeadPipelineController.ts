/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import { Op, Transaction } from "sequelize";
import LeadPipeline from "../models/LeadPipeline";
import LeadPipelineStage from "../models/LeadPipelineStage";
import LeadSale from "../models/LeadSale";
import AppError from "../errors/AppError";
import sequelize from "../database";
import logger from "../utils/logger";

/** IDs vindos do JSON ou do driver podem ser string — normaliza para comparação e [Op.in] */
const numId = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const companyIdNum = (req: Request): number => {
  const raw = (req.user as any)?.companyId;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
  return n;
};

export default {
  async list(req: Request, res: Response): Promise<Response> {
    const companyId = companyIdNum(req);
    const pipelines = await LeadPipeline.findAll({
      where: { companyId },
      include: [{ model: LeadPipelineStage, as: "stages", separate: true, order: [["order", "ASC"]] }],
      order: [["id", "ASC"]]
    });
    return res.json(pipelines.map(p => ({
      id: p.id,
      name: p.name,
      stages: (p.stages || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map(s => ({
        id: s.id, key: s.key, label: s.label, color: s.color, order: s.order
      }))
    })));
  },

  async bulkSave(req: Request, res: Response): Promise<Response> {
    const companyId = companyIdNum(req);

    const { pipelines } = req.body as {
      pipelines: Array<{ id?: any; name: string; stages: Array<{ id?: any; key: string; label: string; color: string; order?: number }> }>;
    };
    if (!Array.isArray(pipelines)) throw new AppError("ERR_INVALID_PARAM", 400);
    if (pipelines.length === 0) {
      throw new AppError("ERR_INVALID_PARAM", 400);
    }

    try {
      await sequelize.transaction(async (t: Transaction) => {
      const existing = await LeadPipeline.findAll({ where: { companyId }, transaction: t });
      const existingIds = new Set<number>();
      for (const row of existing) {
        const n = numId(row.id);
        if (n != null) existingIds.add(n);
      }

      const incomingIds = new Set<number>();

      for (const raw of pipelines) {
        const name = (raw?.name != null ? String(raw.name) : "").trim() || "Pipeline";
        const p = { ...raw, name };
        if (!Array.isArray(p.stages)) p.stages = [];

        const parsedId = numId(p.id);
        const hasValidId = parsedId != null;

        let model: LeadPipeline;
        if (hasValidId) {
          model = (await LeadPipeline.findOne({
            where: { id: parsedId, companyId },
            transaction: t
          })) as LeadPipeline;
          if (model) {
            model.name = p.name;
            await model.save({ transaction: t });
          } else {
            /** ID enviado não existe nesta empresa — cria nova linha sem forçar PK (evita conflito / FK estranho). */
            model = await LeadPipeline.create({ name: p.name, companyId }, { transaction: t });
          }
          incomingIds.add(numId(model.id) as number);
        } else {
          model = await LeadPipeline.create(
            { name: p.name, companyId },
            { transaction: t }
          );
          incomingIds.add(numId(model.id) as number);
        }

        const stagesExisting = await LeadPipelineStage.findAll({
          where: { pipelineId: model.id, companyId },
          transaction: t
        });
        const stageExistingIds = new Set<number>();
        for (const se of stagesExisting) {
          const sid = numId(se.id);
          if (sid != null) stageExistingIds.add(sid);
        }
        const stageIncomingIds: number[] = [];

        let order = 0;
        for (const st of p.stages || []) {
          order += 1;
          const key = String(st.key || "etapa").toLowerCase();
          const label = String(st.label != null ? st.label : "Etapa").slice(0, 500);
          const color = String(st.color || "#3B82F6").slice(0, 32);
          const parsedStageId = numId(st.id);
          const stageHasValidId = parsedStageId != null;
          if (stageHasValidId) {
            const m = await LeadPipelineStage.findOne({
              where: { id: parsedStageId, pipelineId: model.id, companyId },
              transaction: t
            });
            if (m) {
              m.key = key;
              m.label = label;
              m.color = color;
              m.order = order;
              await m.save({ transaction: t });
              stageIncomingIds.push(numId(m.id) as number);
            } else {
              const created = await LeadPipelineStage.create(
                {
                  pipelineId: model.id,
                  key,
                  label,
                  color,
                  order,
                  companyId
                },
                { transaction: t }
              );
              stageIncomingIds.push(numId(created.id) as number);
            }
          } else {
            const created = await LeadPipelineStage.create(
              {
                pipelineId: model.id,
                key,
                label,
                color,
                order,
                companyId
              },
              { transaction: t }
            );
            stageIncomingIds.push(numId(created.id) as number);
          }
        }

        const toRemove = [...stageExistingIds].filter(id => !stageIncomingIds.includes(id));
        if (toRemove.length) {
          await LeadPipelineStage.destroy({
            where: { id: { [Op.in]: toRemove }, pipelineId: model.id, companyId },
            transaction: t
          });
        }
      }

      const toRemovePipelines = [...existingIds].filter(id => !incomingIds.has(id));
      if (toRemovePipelines.length) {
        const incomingArr = [...incomingIds];
        if (!incomingArr.length) {
          throw new AppError("ERR_INVALID_PARAM", 400);
        }
        /**
         * Reatribui leads que ainda apontam para pipelines removidas para uma pipeline que permanece.
         * Mais seguro que só NULL: alguns bancos/configs podem rejeitar NULL ou o Sequelize omitir null no update.
         */
        const fallbackPipelineId = Math.min(...incomingArr);
        const [nLeads] = await LeadSale.update(
          { pipelineId: fallbackPipelineId },
          {
            where: { companyId, pipelineId: { [Op.in]: toRemovePipelines } },
            transaction: t,
            hooks: false
          }
        );
        const nStages = await LeadPipelineStage.destroy({
          where: { pipelineId: { [Op.in]: toRemovePipelines }, companyId },
          transaction: t,
          hooks: false
        });
        const nPipes = await LeadPipeline.destroy({
          where: { id: { [Op.in]: toRemovePipelines }, companyId },
          transaction: t,
          hooks: false
        });
        logger.info("[LeadPipeline] bulkSave removidos", {
          companyId,
          toRemovePipelines,
          leadsReassigned: nLeads,
          stagesDeleted: nStages,
          pipelinesDeleted: nPipes,
          fallbackPipelineId
        });
      }
      });

      const out = await LeadPipeline.findAll({
        where: { companyId },
        include: [{ model: LeadPipelineStage, as: "stages", separate: true, order: [["order", "ASC"]] }],
        order: [["id", "ASC"]]
      });

      return res.status(200).json(out.map(p => ({
        id: p.id,
        name: p.name,
        stages: (p.stages || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map(s => ({
          id: s.id, key: s.key, label: s.label, color: s.color, order: s.order
        }))
      })));
    } catch (e: any) {
      if (e instanceof AppError) throw e;
      const msg =
        typeof e?.message === "string" && e.message.trim()
          ? e.message.trim().slice(0, 500)
          : "ERR_LEAD_PIPELINE_SAVE";
      logger.error("[LeadPipeline] bulkSave falhou", { companyId, err: e });
      throw new AppError(msg, 500);
    }
  }
};
