/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Chatbot from "../../models/Chatbot";
import Queue from "../../models/Queue";
import Company from "../../models/Company";
import Plan from "../../models/Plan";

interface QueueData {
  name: string;
  color: string;
  companyId: number;
  greetingMessage?: string;
  outOfHoursMessage?: string;
  schedules?: any[];
  chatbots?: Chatbot[];
  orderQueue?: number;
  ativarRoteador?: boolean;
  tempoRoteador: number;
  integrationId?: number;
  fileListId?: number;
  closeTicket?: boolean;
  typeRandomMode?: string;
  randomizeImmediate?: boolean;
  tipoIntegracao?: string;
  sendQueueEntryMessage?: boolean;
  queueEntryMessage?: string;
  isSystem?: boolean;
}

const CreateQueueService = async (queueData: QueueData): Promise<Queue> => {
  const { color, name, companyId } = queueData;

  const company = await Company.findOne({
    where: {
      id: companyId
    },
    include: [{ model: Plan, as: "plan" }]
  });

  const isSystemQueue = Boolean((queueData as any).isSystem);

  if (company !== null && !isSystemQueue) {
    const queuesCount = await Queue.count({
      where: {
        companyId,
        isSystem: false
      }
    });

    if (queuesCount >= company.plan.queues) {
      throw new AppError(`Número máximo de filas já alcançado: ${queuesCount}`);
    }
  }

  const queueSchema = Yup.object().shape({
    name: Yup.string()
      .min(2, "ERR_QUEUE_INVALID_NAME")
      .required("ERR_QUEUE_INVALID_NAME")
      .test(
        "Check-unique-name",
        "ERR_QUEUE_NAME_ALREADY_EXISTS",
        async value => {
          if (value) {
            const queueWithSameName = await Queue.findOne({
              where: { name: value, companyId }
            });

            return !queueWithSameName;
          }
          return false;
        }
      ),
    color: Yup.string()
      .required("ERR_QUEUE_INVALID_COLOR")
      .test("Check-color", "ERR_QUEUE_INVALID_COLOR", async value => {
        if (value) {
          const colorTestRegex = /^#[0-9a-f]{3,6}$/i;
          return colorTestRegex.test(value);
        }
        return false;
      })
      .test(
        "Check-color-exists",
        "ERR_QUEUE_COLOR_ALREADY_EXISTS",
        async value => {
          if (value) {
            const queueWithSameColor = await Queue.findOne({
              where: { color: value, companyId, isSystem: false }
            });
            return !queueWithSameColor;
          }
          return false;
        }
      )
  });

  try {
    await queueSchema.validate({ color, name });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const { chatbots: _chatbots, ...scalarData } = queueData as QueueData & {
    chatbots?: Chatbot[];
  };

  // Remove undefined para não sobrescrever defaults com NULL (NOT NULL no Postgres).
  const cleaned: Record<string, unknown> = {};
  Object.entries(scalarData as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined) cleaned[key] = value;
  });

  const queue = await Queue.create({
    ativarRoteador: false,
    tempoRoteador: 0,
    closeTicket: false,
    randomizeImmediate: false,
    typeRandomMode: "RANDOM",
    sendQueueEntryMessage: true,
    queueEntryMessage: "Você está na fila *{{queue}}*. Em breve será atendido!",
    greetingMessage: "",
    outOfHoursMessage: "",
    isSystem: false,
    ...cleaned
  });

  return queue;
};

export default CreateQueueService;
