/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { head } from "lodash";
import XLSX from "xlsx";
import { has } from "lodash";
import ContactListItem from "../../models/ContactListItem";
import logger from "../../utils/logger";
import Whatsapp from "../../models/Whatsapp";
import { getWbot } from "../../libs/wbot";
import { getIO } from "../../libs/socket";

export async function ImportContacts(
  contactListId: number,
  companyId: number,
  file: Express.Multer.File | undefined
) {
  const workbook = XLSX.readFile(file?.path as string);
  const worksheet = head(Object.values(workbook.Sheets)) as any;
  const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 0 });
  const contacts = rows.map(row => {
    let name = "";
    let number = "";
    let email = "";

    if (has(row, "nome") || has(row, "Nome")) {
      name = row["nome"] || row["Nome"];
    }

    if (
      has(row, "numero") ||
      has(row, "número") ||
      has(row, "Numero") ||
      has(row, "Número") ||
      has(row, "telefone") ||
      has(row, "Telefone")
    ) {
      number = row["numero"] || row["número"] || row["Numero"] || row["Número"] || row["telefone"] || row["Telefone"];
      number = `${number}`.replace(/\D/g, "");
    }

    if (
      has(row, "email") ||
      has(row, "e-mail") ||
      has(row, "Email") ||
      has(row, "E-mail")
    ) {
      email = row["email"] || row["e-mail"] || row["Email"] || row["E-mail"];
    }

    return { name, number, email, contactListId, companyId };
  });
  const contactList: ContactListItem[] = [];
  for (const contact of contacts) {
    const [newContact, created] = await ContactListItem.findOrCreate({
      where: {
        number: `${contact.number}`,
        contactListId: contact.contactListId,
        companyId: contact.companyId
      },
      defaults: contact
    });
    if (created) {
      contactList.push(newContact);
    }
  }

  if (contactList) {
    for (let newContact of contactList) {
      try {
        const whatsapp = await Whatsapp.findOne({ where: { companyId, status: 'CONNECTED', channel: 'whatsapp' }, limit: 1 });
        const wbot = await getWbot(whatsapp.id);
        const response = await wbot.onWhatsApp(`${newContact.number}@s.whatsapp.net`);
       
        newContact.isWhatsappValid = response[0]?.exists ? true : false;
        newContact.number = response[0]?.exists ? response[0]?.jid.split("@")[0] : newContact.number;

        await newContact.save();
      } catch (e) {
        console.log(e)
        logger.error(`Número de contato inválido1: ${newContact.number}`);
      }
      const io = getIO();

      io.of(String(companyId))
        .emit(`company-${companyId}-ContactListItem-${+contactListId}`, {
          action: "reload",
          records: [newContact]
        });
    }
  }

  return contactList;
}
