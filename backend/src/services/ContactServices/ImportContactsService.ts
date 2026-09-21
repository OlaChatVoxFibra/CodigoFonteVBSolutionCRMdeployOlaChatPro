/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { head } from "lodash";
import XLSX from "xlsx";
import { has } from "lodash";
import ContactListItem from "../../models/ContactListItem";
import CheckContactNumber from "../WbotServices/CheckNumber";
import logger from "../../utils/logger";
import Contact from "../../models/Contact";

export async function ImportContactsService(
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
    let birthDate = null;

    if (has(row, "nome") || has(row, "Nome")) {
      name = row["nome"] || row["Nome"];
    }

    if (
      has(row, "numero") ||
      has(row, "número") ||
      has(row, "Numero") ||
      has(row, "Número")
    ) {
      number = row["numero"] || row["número"] || row["Numero"] || row["Número"];
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

    // Processar data de nascimento - Suporta múltiplos formatos de cabeçalho
    if (
      has(row, "birthdate") ||
      has(row, "birthDate") ||
      has(row, "data_nascimento") ||
      has(row, "data_nasc") ||
      has(row, "nascimento") ||
      has(row, "Dt Nasc") ||
      has(row, "Data de Nascimento") ||
      has(row, "Data Nascimento")
    ) {
      const birthDateStr = row["birthdate"] || row["birthDate"] || 
                           row["data_nascimento"] || row["data_nasc"] || 
                           row["nascimento"] || row["Dt Nasc"] || 
                           row["Data de Nascimento"] || row["Data Nascimento"];
      
      if (birthDateStr) {
        try {
          const parsedDate = new Date(birthDateStr);
          
          // Validar que é data válida e não futura
          if (!isNaN(parsedDate.getTime()) && parsedDate <= new Date()) {
            birthDate = parsedDate.toISOString().split('T')[0]; // YYYY-MM-DD
          } else {
            logger.warn(`Data de nascimento inválida ou futura: ${birthDateStr}`);
          }
        } catch (error) {
          logger.warn(`Erro ao processar data de nascimento: ${birthDateStr}`, error);
        }
      }
    }

    return { name, number, email, birthDate, companyId };
  });


  const contactList: Contact[] = [];

  for (const contact of contacts) {
    const [newContact, created] = await Contact.findOrCreate({
      where: {
        number: `${contact.number}`,
        companyId: contact.companyId
      },
      defaults: contact
    });
    if (created) {
      contactList.push(newContact);
    }
  }

  // Verifica se existe os contatos
  // if (contactList) {
  //   for (let newContact of contactList) {
  //     try {
  //       const response = await CheckContactNumber(newContact.number, companyId);
  //       const number = response;
  //       newContact.number = number;
  //       console.log('number', number)
  //       await newContact.save();
  //     } catch (e) {
  //       logger.error(`Número de contato inválido: ${newContact.number}`);
  //     }
  //   }
  // }

  return contactList;
}
