/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AppError from "../../errors/AppError";
import Prompt from "../../models/Prompt";
import Queue from "../../models/Queue";
import AttendanceFlowStep from "../../models/AttendanceFlowStep";

interface Data {
  promptId: string | number;
  companyId: string | number;
}
const ShowPromptService = async ({ promptId, companyId }: Data): Promise<Prompt> => {
  const id = typeof promptId === "number" && Number.isFinite(promptId) ? promptId : Number.parseInt(String(promptId), 10);
  if (!Number.isFinite(id)) {
    throw new AppError("ERR_NO_PROMPT_FOUND", 404);
  }
  const company = typeof companyId === "number" && Number.isFinite(companyId) ? companyId : Number(companyId);
  if (!Number.isFinite(company)) {
    throw new AppError("ERR_NO_PROMPT_FOUND", 404);
  }

  const prompt = await Prompt.findOne({
    where: {
      id,
      companyId: company
    },
    include: [
      {
        model: Queue,
        as: "queue"
      },
      {
        model: AttendanceFlowStep,
        as: "attendanceFlowSteps",
        separate: true,
        order: [["stepNumber", "ASC"]]
      }
    ]
  });

  if (!prompt) {
    throw new AppError("ERR_NO_PROMPT_FOUND", 404);
  }

  return prompt;
};
export default ShowPromptService;
