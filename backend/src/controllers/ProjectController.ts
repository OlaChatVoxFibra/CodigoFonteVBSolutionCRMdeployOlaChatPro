/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import * as Yup from "yup";
import Project from "../models/Project";
import Activity from "../models/Activity";
import AppError from "../errors/AppError";
import User from "../models/User";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { pageNumber, searchParam } = req.query;

  const whereCondition = {
    companyId
  };

  if (searchParam) {
    // Add search logic if needed
  }

  const limit = 20;
  const page = Math.max(Number(pageNumber) || 1, 1);
  const offset = limit * (page - 1);

  let count = 0;
  let projects: Project[] = [];

  try {
    const result = await Project.findAndCountAll({
      where: whereCondition,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      include: [
        { model: Activity, as: "activities" },
        { model: User, as: "user", attributes: ["id", "name", "email"] }
      ]
    });
    count = result.count;
    projects = result.rows;
  } catch (err: any) {
    const code = err?.original?.code;
    const message = String(err?.message || "").toLowerCase();
    const missingRelation =
      code === "42P01" ||
      message.includes("no such table") ||
      message.includes("does not exist") ||
      message.includes("projectid");

    if (!missingRelation) {
      throw err;
    }

    const result = await Project.findAndCountAll({
      where: whereCondition,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      include: [{ model: User, as: "user", attributes: ["id", "name", "email"] }]
    });
    count = result.count;
    projects = result.rows;
  }

  const hasMore = count > offset + projects.length;

  return res.json({ projects, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: currentUserId } = req.user;
  const data = req.body;

  const schema = Yup.object().shape({
    name: Yup.string().required()
  });

  try {
    await schema.validate(data);
  } catch (err) {
    throw new AppError(err.message);
  }

  const project = await Project.create({
    name: data.name,
    description: data.description,
    status: data.status || "active",
    progress: data.progress,
    date: data.date ? new Date(data.date) : null,
    dateEnd: data.dateEnd ? new Date(data.dateEnd) : null,
    companyId,
    userId: data.userId || currentUserId
  });

  // Se houver atividades para vincular
  if (data.activityIds && data.activityIds.length > 0) {
    try {
      await Activity.update(
        { projectId: project.id },
        { where: { id: data.activityIds, companyId } }
      );
    } catch {
      // projectId em Activities pode não existir se migrações estiverem pendentes
    }
  }

  return res.status(200).json(project);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const data = req.body;
  const { projectId } = req.params;

  const project = await Project.findOne({
    where: { id: projectId, companyId }
  });

  if (!project) {
    throw new AppError("ERR_NO_PROJECT_FOUND", 404);
  }

  const updatePayload: Record<string, unknown> = {};
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.progress !== undefined) updatePayload.progress = data.progress;
  if (data.userId !== undefined) updatePayload.userId = data.userId;
  if (data.date !== undefined) {
    updatePayload.date = data.date ? new Date(data.date) : null;
  }
  if (data.dateEnd !== undefined) {
    updatePayload.dateEnd = data.dateEnd ? new Date(data.dateEnd) : null;
  }

  if (Object.keys(updatePayload).length > 0) {
    await project.update(updatePayload);
  }

  // Atualizar atividades vinculadas
  if (data.activityIds) {
    // Primeiro desvincula todas (opcional, dependendo da lógica de negócio)
    // await Activity.update({ projectId: null }, { where: { projectId: project.id } });
    
    // Vincula as novas
    if (data.activityIds.length > 0) {
        await Activity.update(
            { projectId: project.id },
            { where: { id: data.activityIds, companyId } }
        );
    }
  }

  await project.reload({
      include: [
        { model: Activity, as: "activities" },
        { model: User, as: "user", attributes: ["id", "name", "email"] }
      ]
  });

  return res.status(200).json(project);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { projectId } = req.params;

  const project = await Project.findOne({
    where: { id: projectId, companyId }
  });

  if (!project) {
    throw new AppError("ERR_NO_PROJECT_FOUND", 404);
  }

  await project.destroy();

  return res.status(200).json({ message: "Project deleted" });
};
