/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import ListFlowBuilderService from "../services/FlowBuilderService/ListFlowBuilderService";
import CreateFlowBuilderService from "../services/FlowBuilderService/CreateFlowBuilderService";
import UpdateFlowBuilderService from "../services/FlowBuilderService/UpdateFlowBuilderService";
import DeleteFlowBuilderService from "../services/FlowBuilderService/DeleteFlowBuilderService";
import CreateFlowDefaultService from "../services/FlowDefaultService/CreateFlowDefaultService";
import UpdateFlowDefaultService from "../services/FlowDefaultService/UpdateFlowDefaultService";
import FlowsDefaultGetDataService from "../services/FlowDefaultService/FlowsDefaultGetDataService";
// import { handleMessage } from "../services/FacebookServices/facebookMessageListener";

export const createFlowDefault = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { flowIdWelcome, flowIdPhrase, flowIdInactiveTime } = req.body;
  const userId = parseInt(req.user.id);
  const { companyId } = req.user;

  const flow = await CreateFlowDefaultService({
    userId,
    companyId,
    flowIdWelcome,
    flowIdPhrase,
    flowIdInactiveTime
  });

  return res.status(200).json(flow);
};

export const updateFlow = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { flowIdWelcome, flowIdPhrase, flowIdInactiveTime } = req.body;

  const flow = await UpdateFlowDefaultService({ companyId, flowIdWelcome, flowIdPhrase, flowIdInactiveTime });

  return res.status(200).json(flow);
};

export const getFlows = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;

  console.log("getFlows")
  const flows = await FlowsDefaultGetDataService({
    companyId
  });

  return res.status(200).json(flows);
};