/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import LeadSale from "../../models/LeadSale";

interface Request {
  id: number | string;
  name?: string;
  description?: string;
  status?: string;
  value?: number;
  pipelineId?: number | null;
  companyName?: string;
  phone?: string;
  email?: string;
  site?: string;
  origin?: string;
  document?: string;
  birthDate?: string | Date | null;
  address?: any;
  tags?: string[];
  contactId?: number;
  responsibleId?: number;
  date?: string | Date | null;
  dateEnd?: string | Date | null;
}

const UpdateService = async ({
  id,
  name,
  description,
  status,
  value,
  companyName,
  phone,
  email,
  site,
  origin,
  document,
  birthDate,
  address,
  tags,
  contactId,
  responsibleId,
  pipelineId,
  date,
  dateEnd
}: Request): Promise<LeadSale> => {
  const record = await LeadSale.findByPk(id as any);
  if (!record) {
    throw new Error("Lead sale not found");
  }

  const parsedValue =
    (typeof value === "string" ? Number(value) : value);
  const parsedResponsibleId =
    (responsibleId as any) === "" ? undefined : responsibleId;
  const parsedContactId =
    (contactId as any) === "" ? undefined : contactId;
  const parsedDate =
    typeof date === "string"
      ? (date.trim() ? new Date(date) : undefined)
      : date;
  const parsedDateEnd =
    typeof dateEnd === "string"
      ? (dateEnd.trim() ? new Date(dateEnd) : null)
      : dateEnd;
  const parsedBirthDate =
    typeof birthDate === "string"
      ? (birthDate.trim() ? new Date(birthDate) : null)
      : birthDate;

  await record.update({
    name: name ?? record.name,
    description: description ?? record.description,
    status: status ?? record.status,
    value: parsedValue ?? record.value,
    companyName: companyName ?? record.companyName,
    phone: phone ?? record.phone,
    email: email !== undefined ? email : (record as any).email,
    site: site ?? record.site,
    origin: origin ?? record.origin,
    document: document ?? record.document,
    birthDate: parsedBirthDate ?? record.birthDate,
    address: address ?? record.address,
    tags: tags ?? record.tags,
    contactId: parsedContactId ?? record.contactId,
    responsibleId: parsedResponsibleId ?? record.responsibleId,
    pipelineId: pipelineId !== undefined ? pipelineId : (record as any).pipelineId,
    date: parsedDate ?? record.date,
    dateEnd: parsedDateEnd !== undefined ? parsedDateEnd : (record as any).dateEnd
  } as any);

  return record;
};

export default UpdateService;
