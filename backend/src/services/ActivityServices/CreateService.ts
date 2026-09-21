/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Activity from "../../models/Activity";
import Project from "../../models/Project";

interface Data {
  title: string;
  description?: string;
  type?: string;
  status?: string;
  date: Date;
  dateEnd?: Date;
  owner?: string;
  location?: string;
  address?: string;
  phone?: string;
  link?: string;
  eventColor?: string;
  companyId: number;
  userId?: number;
  projectId?: number | null;
  contactId?: number | null;
  leadId?: number | null;
}

const isMissingActivitiesTable = (err: any): boolean => {
  const code = err?.original?.code;
  const message = String(err?.message || err?.original?.message || "").toLowerCase();
  return (
    code === "42P01" ||
    (message.includes("no such table") && message.includes("activities")) ||
    (message.includes("relation") && message.includes("activities") && message.includes("does not exist"))
  );
};

const CreateService = async (data: Data): Promise<Activity> => {
  const schema = Yup.object().shape({
    title: Yup.string()
      .min(3, "ERR_ACTIVITY_INVALID_TITLE")
      .required("ERR_ACTIVITY_REQUIRED_TITLE"),
    date: Yup.date().required("ERR_ACTIVITY_REQUIRED_DATE"),
    status: Yup.string()
  });

  try {
    await schema.validate(data);
  } catch (err) {
    throw new AppError(err.message);
  }

  const payload: any = {
    title: data.title,
    description: data.description,
    type: data.type,
    status: data.status || "pending",
    date: data.date,
    dateEnd: data.dateEnd,
    owner: data.owner,
    location: data.location,
    address: data.address,
    phone: data.phone,
    link: data.link,
    eventColor: data.eventColor,
    companyId: data.companyId
  };
  if (typeof data.userId !== "undefined") {
    payload.userId = data.userId;
  }
  if (data.projectId !== undefined) {
    payload.projectId = data.projectId;
  }
  if (data.contactId !== undefined) {
    payload.contactId = data.contactId;
  }
  if (data.leadId !== undefined) {
    payload.leadId = data.leadId;
  }

  let record: Activity;
  try {
    record = await Activity.create(payload);
  } catch (err: any) {
    if (isMissingActivitiesTable(err)) {
      throw new AppError("ERR_ACTIVITIES_TABLE_MISSING", 400);
    }
    throw err;
  }

  try {
    await record.reload({
      include: [{ model: Project, as: "project", attributes: ["id", "name"] }]
    });
  } catch {
    // Coluna projectId ou tabela Projects pode não existir se migrações estiverem pendentes
  }

  return record;
};

export default CreateService;

