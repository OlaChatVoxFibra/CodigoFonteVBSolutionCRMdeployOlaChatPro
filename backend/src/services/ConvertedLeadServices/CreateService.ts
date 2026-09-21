/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import ConvertedLead from "../../models/ConvertedLead";
import Contact from "../../models/Contact";
import User from "../../models/User";

interface Request {
  name: string;
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
  companyId: number;
}

const CreateService = async (data: Request): Promise<ConvertedLead> => {
  const payload: any = {
    name: data.name,
    description: data.description || null,
    email: data.email || null,
    phone: data.phone || null,
    address: data.address || null,
    city: data.city || null,
    state: data.state || null,
    document: data.document || null,
    website: data.website || null,
    sector: data.sector || null,
    contactId: data.contactId || null,
    responsibleId: data.responsibleId || null,
    date: data.date ? new Date(data.date) : new Date(),
    companyId: data.companyId
  };

  const record = await ConvertedLead.create(payload);

  const full = await ConvertedLead.findByPk(record.id, {
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

  return full!;
};

export default CreateService;
