/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AppError from "../../errors/AppError";
import { FlowBuilderModel } from "../../models/FlowBuilder";

const DeleteFlowBuilderService = async (id: number): Promise<FlowBuilderModel> => {
  
  const flow = await FlowBuilderModel.findOne({
    where: { id: id }
  });

  if (!flow) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  await flow.destroy();

  return flow;
};

export default DeleteFlowBuilderService;

