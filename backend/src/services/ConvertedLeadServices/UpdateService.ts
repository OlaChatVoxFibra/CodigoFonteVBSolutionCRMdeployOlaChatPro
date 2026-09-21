/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import ConvertedLead from "../../models/ConvertedLead";
import Contact from "../../models/Contact";
import User from "../../models/User";

interface Request {
  id: number | string;
  name?: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  document?: string;
  website?: string;
  sector?: string;
  contactId?: number | null;
  responsibleId?: number | null;
  date?: Date | string | null;
}

const UpdateService = async (data: Request): Promise<ConvertedLead> => {
  const record = await ConvertedLead.findByPk(data.id as any);
  if (!record) {
    throw new Error("Converted lead not found");
  }

  const payload: any = {};

  if (data.name !== undefined) payload.name = data.name;
  if (data.description !== undefined) payload.description = data.description;
  if (data.email !== undefined) payload.email = data.email;
  if (data.phone !== undefined) payload.phone = data.phone;
  if (data.address !== undefined) payload.address = data.address;
  if (data.city !== undefined) payload.city = data.city;
  if (data.state !== undefined) payload.state = data.state;
  if (data.document !== undefined) payload.document = data.document;
  if (data.website !== undefined) payload.website = data.website;
  if (data.sector !== undefined) payload.sector = data.sector;
  if (data.contactId !== undefined) payload.contactId = data.contactId;
  if (data.responsibleId !== undefined) payload.responsibleId = data.responsibleId;
  if (data.date !== undefined) payload.date = data.date ? new Date(data.date) : null;

  await record.update(payload);

  const updated = await ConvertedLead.findByPk(record.id, {
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name", "number", "channel", "profilePicUrl", "urlPicture"]
      },
      {
        model: User,
        as: "responsible",
        attributes: ["id", "name"]
      }
    ]
  });

  return updated!;
};

export default UpdateService;
