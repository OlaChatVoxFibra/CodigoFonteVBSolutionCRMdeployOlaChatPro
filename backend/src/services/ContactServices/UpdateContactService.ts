/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// src/services/ContactServices/UpdateContactService.ts - CORRIGIDO
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import DeleteContactWalletService from "./DeleteContactWalletService";
import UpdateContactWalletsService from "./UpdateContactWalletsService";
import User from "../../models/User";

interface ExtraInfo {
  id?: number;
  name: string;
  value: string;
}

interface ContactData {
  email?: string;
  number?: string;
  name?: string;
  acceptAudioMessage?: boolean;
  active?: boolean;
  extraInfo?: ExtraInfo[];
  disableBot?: boolean;
  remoteJid?: string;
  contactWallets?: null | number[] | string[];
  birthDate?: Date | string; // 🎂 NOVO CAMPO ADICIONADO
}

interface Request {
  contactData: ContactData;
  contactId: string;
  companyId: number;
  requestUserId?: number;
}

const updateCustomFields = async (
  contactId: number,
  extraInfo: ExtraInfo[]
) => {
  const currentFields = await ContactCustomField.findAll({
    where: { contactId }
  });

  await Promise.all(
    extraInfo.map(async (info: ExtraInfo) => {
      const existingField = currentFields.find(
        field => field.name === info.name
      );
      if (existingField) {
        await existingField.update({ value: info.value });
      } else {
        await ContactCustomField.create({ ...info, contactId });
      }
    })
  );

  await Promise.all(
    currentFields.map(async oldInfo => {
      const stillExists = extraInfo.find(info => info.name === oldInfo.name);
      if (!stillExists) {
        await ContactCustomField.destroy({ where: { id: oldInfo.id } });
      }
    })
  );
};

const UpdateContactService = async ({
  contactData,
  contactId,
  companyId,
  requestUserId
}: Request): Promise<Contact> => {
  const {
    email,
    name,
    number,
    extraInfo,
    acceptAudioMessage,
    active,
    disableBot,
    remoteJid,
    contactWallets,
    birthDate // 🎂 INCLUIR NO DESTRUCTURING
  } = contactData;

  const contact = await Contact.findOne({
    where: { id: contactId },
    include: ["extraInfo"]
  });

  if (!contact) {
    throw new AppError("Contato não encontrado", 404);
  }

  let requestUser: User | null = null;
  if (requestUserId) {
    requestUser = await User.findByPk(requestUserId);
  }

  if (!requestUser?.super && contact.companyId !== companyId) {
    throw new AppError("Não é possível alterar registros de outra empresa");
  }

  if (extraInfo) {
    await updateCustomFields(contact.id, extraInfo);
  }

  if (contactWallets) {
    await DeleteContactWalletService({
      contactId,
      companyId
    });

    contactWallets.forEach(async (wallet: any) => {
      await UpdateContactWalletsService({
        userId: wallet.walletId,
        queueId: wallet.queueId,
        contactId,
        companyId
      });
    });
  }

  // 🎂 PROCESSAR DATA DE NASCIMENTO - CORREÇÃO DE TIMEZONE
  let processedBirthDate: Date | null = contact.birthDate;
  if (birthDate !== undefined) {
    if (birthDate === null || birthDate === '') {
      processedBirthDate = null;
    } else if (typeof birthDate === 'string') {
      // Se vier no formato ISO, extrair apenas a parte da data
      const dateOnly = birthDate.split('T')[0];
      // Criar data local com meio-dia para evitar problemas de timezone
      const [year, month, day] = dateOnly.split('-').map(Number);
      processedBirthDate = new Date(year, month - 1, day, 12, 0, 0);
    } else if (birthDate instanceof Date) {
      // Se for objeto Date, criar nova data local com meio-dia
      const year = birthDate.getFullYear();
      const month = birthDate.getMonth();
      const day = birthDate.getDate();
      processedBirthDate = new Date(year, month, day, 12, 0, 0);
    }
  }

  await contact.update({
    name,
    number,
    email,
    acceptAudioMessage,
    active,
    disableBot,
    remoteJid,
    birthDate: processedBirthDate // 🎂 INCLUIR NO UPDATE
  });

  await contact.reload({
    include: ["extraInfo"]
  });

  return contact;
};

export default UpdateContactService;