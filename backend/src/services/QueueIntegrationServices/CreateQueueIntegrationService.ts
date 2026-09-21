/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import * as Yup from "yup";

import AppError from "../../errors/AppError";
import QueueIntegrations from "../../models/QueueIntegrations";


interface Request {
  type: string;
  name: string;
  projectName: string;
  jsonContent: string;
  language: string;
  urlN8N?: string;
  companyId: number;
  typebotSlug?: string;
  typebotExpires?: number;
  typebotKeywordFinish?: string;
  typebotUnknownMessage?: string;
  typebotDelayMessage?: number;
  typebotKeywordRestart?: string;
  typebotRestartMessage?: string;
}

const CreateQueueIntegrationService = async ({
  type,
  name,
  projectName,
  jsonContent,
  language,
  urlN8N,
  companyId,
  typebotExpires,
  typebotKeywordFinish,
  typebotSlug,
  typebotUnknownMessage,
  typebotDelayMessage,
  typebotKeywordRestart,
  typebotRestartMessage 
}: Request): Promise<QueueIntegrations> => {
  const schema = Yup.object().shape({
    name: Yup.string()
      .required()
      .min(2)
      .test(
        "Check-name",
        "This integration name is already used.",
        async value => {
          if (!value) return false;
          const nameExists = await QueueIntegrations.findOne({
            where: { name: value, companyId }
          });
          return !nameExists;
        }
      )
  });

  try {
    await schema.validate({ type, name, projectName, jsonContent, language, urlN8N, companyId });
  } catch (err) {
    throw new AppError(err.message);
  }

  // Se for typebot, garante que jsonContent seja vazio para evitar conflito com SGP
  const finalJsonContent = type === "typebot" ? "{}" : jsonContent;

  const queueIntegration = await QueueIntegrations.create(
    {
      type,
      name,
      projectName,
      jsonContent: finalJsonContent,
      language,
      urlN8N,
      companyId,
      typebotExpires,
      typebotKeywordFinish,
      typebotSlug,
      typebotUnknownMessage,
      typebotDelayMessage,
      typebotKeywordRestart,
      typebotRestartMessage 
    }
  );

  return queueIntegration;
};

export default CreateQueueIntegrationService;
