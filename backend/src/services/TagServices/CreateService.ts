/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import * as Yup from "yup";

import AppError from "../../errors/AppError";
import Tag from "../../models/Tag";

interface Request {
  name: string;
  color: string;
  kanban: string;
  companyId: number;
  timeLane?: number;
  nextLaneId?: number;
  greetingMessageLane?: string;
  rollbackLaneId?: number;
  mediaFiles?: string;
}

const CreateService = async ({
  name,
  color = "#A4CCCC",
  kanban,
  companyId,
  timeLane = null,
  nextLaneId = null,
  greetingMessageLane = "",
  rollbackLaneId = null,
  mediaFiles = null
}: Request): Promise<Tag> => {
  const schema = Yup.object().shape({
    name: Yup.string().required().min(3)
  });

  try {
    await schema.validate({ name });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const [tag] = await Tag.findOrCreate({
    where: { name, color, kanban, companyId },
    defaults: {
      name, color, kanban, companyId,
      timeLane,
      nextLaneId: String(nextLaneId) === "" ? null : nextLaneId,
      greetingMessageLane,
      rollbackLaneId: String(rollbackLaneId) === "" ? null : rollbackLaneId,
      mediaFiles
    }
  });

  await tag.reload();

  return tag;
};

export default CreateService;
