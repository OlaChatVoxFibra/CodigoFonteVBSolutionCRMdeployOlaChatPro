/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// src/services/ContactServices/CreateContactService.ts - CORRIGIDO
import AppError from "../../errors/AppError";
import CompaniesSettings from "../../models/CompaniesSettings";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import ContactWallet from "../../models/ContactWallet";

interface ExtraInfo {
  name: string;
  value: string;
}

interface Wallet {
  walletId: number | string;
  contactId: number | string;
  companyId: number | string;
}

interface Request {
  name: string;
  number: string;
  email?: string;
  profilePicUrl?: string;
  acceptAudioMessage?: boolean;
  active?: boolean;
  companyId: number;
  extraInfo?: ExtraInfo[];
  remoteJid?: string;
  wallets?: null | number[] | string[];
  birthDate?: Date | string; // 🎂 NOVO CAMPO ADICIONADO
}

const CreateContactService = async ({
  name,
  number,
  email = "",
  birthDate, // 🎂 INCLUIR NO DESTRUCTURING
  acceptAudioMessage,
  active,
  companyId,
  extraInfo = [],
  remoteJid = "",
  wallets
}: Request): Promise<Contact> => {

  console.log('number', number)
  console.log('remoteJid', remoteJid)


  const numberExists = await Contact.findOne({
    where: { number, companyId }
  });
  
  if (numberExists) {
    throw new AppError("ERR_DUPLICATED_CONTACT");
  }

  const settings = await CompaniesSettings.findOne({
    where: { companyId }
  });

  const acceptAudioMessageContact =
    settings?.acceptAudioMessageContact === "enabled";

  // 🎂 PROCESSAR DATA DE NASCIMENTO - CORREÇÃO DE TIMEZONE
  let processedBirthDate: Date | null = null;
  if (birthDate) {
    if (typeof birthDate === 'string') {
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

  const contact = await Contact.create(
    {
      name,
      number,
      email,
      birthDate: processedBirthDate, // 🎂 INCLUIR NO CREATE
      acceptAudioMessage: acceptAudioMessageContact,
      active,
      companyId,
      remoteJid
    },
    {
      include: ["extraInfo"]
    }
  );

  if (extraInfo && extraInfo.length > 0) {
    for (const info of extraInfo) {
      await ContactCustomField.create({
        name: info.name,
        value: info.value,
        contactId: contact.id
      });
    }
  }
  
  if (wallets) {
    await ContactWallet.destroy({
      where: {
        companyId,
        contactId: contact.id
      }
    });

    const contactWallets: Wallet[] = [];
    wallets.forEach((wallet: any) => {
      contactWallets.push({
        walletId: !wallet.id ? wallet : wallet.id,
        contactId: contact.id,
        companyId
      });
    });

    await ContactWallet.bulkCreate(contactWallets);
  }

  await contact.reload({
    include: ["extraInfo",
      {
        association: "wallets",
        attributes: ["id", "name"]
      },
    ]
  });

  return contact;
};

export default CreateContactService;