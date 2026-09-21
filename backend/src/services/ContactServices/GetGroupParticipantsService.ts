/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { GroupMetadata, GroupParticipant } from "baileys";
import { getWbot } from "../../libs/wbot";
import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import WhatsappLidMap from "../../models/WhatsapplidMap";
import AppError from "../../errors/AppError";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";

interface GroupParticipantResponse {
  id: string;
  name: string;
  number: string;
  profilePicUrl: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

interface GetGroupParticipantsRequest {
  contactId: number;
  companyId: number;
}

const GetGroupParticipantsService = async ({
  contactId,
  companyId
}: GetGroupParticipantsRequest): Promise<GroupParticipantResponse[]> => {
  console.log(`[GetGroupParticipantsService] Starting service for contactId: ${contactId}, companyId: ${companyId}`);

  // Buscar o contato do grupo incluindo o whatsapp
  console.log(`[GetGroupParticipantsService] Looking for contact with ID: ${contactId} and companyId: ${companyId}`);
  const contact = await Contact.findOne({
    where: {
      id: contactId,
      companyId,
      isGroup: true
    },
    include: [
      {
        model: Whatsapp,
        as: "whatsapp"
      }
    ]
  });

  if (!contact) {
    console.error(`[GetGroupParticipantsService] ERROR: Group contact not found for contactId: ${contactId}`);
    throw new AppError("Grupo não encontrado", 404);
  }

  if (!contact.isGroup) {
    console.error(`[GetGroupParticipantsService] ERROR: Contact is not a group. contactId: ${contactId}, isGroup: ${contact.isGroup}`);
    throw new AppError("Este contato não é um grupo", 400);
  }
 let remoteJid = contact.remoteJid;
  if (!remoteJid && contact.number) {
    console.log(`[GetGroupParticipantsService] Generating remoteJid from contact.number: ${contact.number}`);
    remoteJid = contact.number.includes('@g.us') ? contact.number : `${contact.number}@g.us`;
    console.log(`[GetGroupParticipantsService] Generated remoteJid: ${remoteJid}`);
  }

  if (!remoteJid) {
    console.error(`[GetGroupParticipantsService] ERROR: No remoteJid or valid number found for group contact`);
    throw new AppError("Identificador do grupo não encontrado", 400);
  }

  // Obter o wbot - usar o whatsapp do contato ou o padrão da empresa
  let wbot;
  try {
    if (contact.whatsappId) {
      console.log(`[GetGroupParticipantsService] Getting wbot for whatsappId: ${contact.whatsappId}`);
      wbot = await getWbot(contact.whatsappId);
    } else {
      console.log(`[GetGroupParticipantsService] No whatsappId on contact, getting default whatsapp for companyId: ${companyId}`);
      const defaultWhatsapp = await GetDefaultWhatsApp(companyId);
      console.log(`[GetGroupParticipantsService] Got default whatsapp: ${defaultWhatsapp.id}`);
      wbot = await getWbot(defaultWhatsapp.id);
    }
    console.log(`[GetGroupParticipantsService] Successfully obtained wbot instance`);
  } catch (error) {
    console.error(`[GetGroupParticipantsService] ERROR getting wbot: ${error.message}`, error.stack);
    throw new AppError("WhatsApp não encontrado ou desconectado", 500);
  }

  try {
    console.log(`[GetGroupParticipantsService] Fetching group metadata for remoteJid: ${contact.remoteJid}`);

    // Buscar metadados do grupo
    const groupMetadata: GroupMetadata = await wbot.groupMetadata(remoteJid);

    if (!groupMetadata) {
      console.error(`[GetGroupParticipantsService] ERROR: GroupMetadata not found for remoteJid: ${contact.remoteJid}`);
      return [];
    }

    if (!groupMetadata.participants || groupMetadata.participants.length === 0) {
      console.log(`[GetGroupParticipantsService] No participants found in group metadata for remoteJid: ${contact.remoteJid}`);
      return [];
    }

    console.log(`[GetGroupParticipantsService] Found ${groupMetadata.participants.length} participants in group`);

    // Processar cada participante
    const participantsPromises = groupMetadata.participants.map(async (participant: GroupParticipant) => {
      console.log(`[GetGroupParticipantsService] Processing participant: ${participant.id}`);
      
      // Declarar variáveis
      let participantName = participant.id;
      let profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
      let number = "";
      let actualNumber = "";
      
      try {
        console.log(`[GetGroupParticipantsService] Trying to get profile picture for participant: ${participant.id}`);
        // Buscar foto de perfil do participante (comentado para debug)
        // profilePicUrl = await wbot.profilePictureUrl(participant.id, "image");
        console.log(`[GetGroupParticipantsService] Got profile picture URL: ${profilePicUrl}`);
      } catch (error) {
        // Usar imagem padrão se não conseguir obter a foto
        console.log(`[GetGroupParticipantsService] Error getting profile picture for ${participant.id}: ${error.message}`);
        profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
      }

      // Extrair número do participante do ID (formato: 5521999999999@s.whatsapp.net ou 5521999999999@lid)
      // Primeiro, remover o sufixo @s.whatsapp.net ou @c.us
      let rawNumber = participant.id;
      
      // Verificar se é um LID (Linked Device ID)
      const isLid = participant.id.endsWith('@lid');
      
      if (isLid) {
        // Se é um LID, extrair apenas o número do LID (sem @lid)
        rawNumber = participant.id.replace('@lid', '');
        number = rawNumber.replace(/\D/g, "");
        console.log(`[GetGroupParticipantsService] Participant is LID: ${number}`);
        
        try {
          // Buscar mapeamento LID na tabela WhatsappLidMap
          const lidMap = await WhatsappLidMap.findOne({
            where: {
              lid: number,
              companyId
            }
          });

          console.log(`[GetGroupParticipantsService] LID Map search result: ${lidMap ? `Found contactId: ${lidMap.contactId}` : 'Not found'}`);

          if (lidMap && lidMap.contactId) {
            // Buscar o contato associado ao LID
            const contact = await Contact.findOne({
              where: {
                id: lidMap.contactId,
                companyId
              }
            });

            if (contact) {
              // Usar o número real do contato associado ao LID
              actualNumber = contact.number;
              participantName = contact.name;
              console.log(`[GetGroupParticipantsService] ✅ Found LID mapping: ${number} -> ${actualNumber} (${participantName})`);
            } else {
              console.log(`[GetGroupParticipantsService] ❌ Contact with ID ${lidMap.contactId} not found`);
              actualNumber = number;
              participantName = number;
            }
          } else {
            console.log(`[GetGroupParticipantsService] ⚠️ LID ${number} not found in mapping table, trying to find contact by number`);
            
            // Tentar buscar contato pelo campo LID na tabela Contacts
            const contactByLid = await Contact.findOne({
              where: {
                companyId,
                isGroup: false
              }
            });

            const allContacts = await Contact.findAll({
              where: {
                companyId,
                isGroup: false
              },
              limit: 1000
            });

            // Tentar encontrar contato pelo LID no campo lid ou por correspondência parcial
            const matchingContact = allContacts.find(c => {
              const contactLid = c.lid?.replace('@lid', '').replace(/\D/g, '') || '';
              return contactLid === number;
            }) || allContacts.find(c => {
              const contactNumber = c.number.replace(/\D/g, '');
              const last10Digits = number.slice(-10);
              const last11Digits = number.slice(-11);
              return contactNumber.endsWith(last10Digits) || contactNumber.endsWith(last11Digits);
            });

            if (matchingContact) {
              actualNumber = matchingContact.number;
              participantName = matchingContact.name;
              console.log(`[GetGroupParticipantsService] ✅ Found contact by alternative search: ${actualNumber} (${participantName})`);
            } else {
              actualNumber = number;
              participantName = number;
              console.log(`[GetGroupParticipantsService] ❌ No contact found, using LID as number`);
            }
          }
        } catch (error) {
          console.error(`[GetGroupParticipantsService] Error checking LID mapping: ${error.message}`);
          actualNumber = number;
          participantName = number;
        }
      } else {
        // Remover sufixos conhecidos do WhatsApp
        const whatsappSuffixes = ['@s.whatsapp.net', '@c.us', '@g.us'];
        for (const suffix of whatsappSuffixes) {
          if (rawNumber.endsWith(suffix)) {
            rawNumber = rawNumber.replace(suffix, '');
            break;
          }
        }
        
        // Extrair apenas os dígitos do número
        number = rawNumber.replace(/\D/g, "");
        actualNumber = number;
        console.log(`[GetGroupParticipantsService] Extracted number: ${number} from participant ID: ${participant.id}`);

        try {
          console.log(`[GetGroupParticipantsService] Checking if participant ${number} exists as contact in company ${companyId}`);
          
          // Primeiro, buscar contato com número exato
          let existingContact = await Contact.findOne({
            where: {
              number,
              companyId
            }
          });

          // Se não encontrou com número exato, tentar buscar por correspondência parcial
          // Removendo os primeiros dígitos do país/área (últimos 10-11 dígitos)
          if (!existingContact) {
            const last10Digits = number.slice(-10);
            const last11Digits = number.slice(-11);
            
            console.log(`[GetGroupParticipantsService] Trying to find contact with last 10 digits: ${last10Digits}`);
            
            // Buscar contatos que terminem com os últimos 10 ou 11 dígitos
            const contacts = await Contact.findAll({
              where: {
                companyId,
                isGroup: false
              }
            });

            // Filtrar contatos que correspondem parcialmente
            existingContact = contacts.find(contact => {
              const contactNumber = contact.number.replace(/\D/g, "");
              return contactNumber.endsWith(last10Digits) || contactNumber.endsWith(last11Digits);
            }) || null;

            if (existingContact) {
              console.log(`[GetGroupParticipantsService] Found contact with partial match: ${existingContact.name}`);
            }
          }

          // Usar nome e número formatado do contato existente
          if (existingContact && existingContact.name && existingContact.name !== number) {
            participantName = existingContact.name;
            actualNumber = existingContact.number;
            console.log(`[GetGroupParticipantsService] Using existing contact: ${participantName} - ${actualNumber}`);
          } else {
            // Tentar buscar perfil do WhatsApp para obter o nome
            try {
              const profileName = await wbot.getBusinessProfile(participant.id);
              if (profileName && profileName.business) {
                participantName = profileName.business.description || participantName;
              }
            } catch (profileError) {
              console.log(`[GetGroupParticipantsService] Could not get profile name: ${profileError.message}`);
            }
            
            if (participantName === participant.id || !participantName) {
              participantName = number;
            }
            
            console.log(`[GetGroupParticipantsService] Using participant name: ${participantName} for number: ${number}`);
          }
        } catch (error) {
          console.error(`[GetGroupParticipantsService] Error checking existing contact for ${number}: ${error.message}`);
          participantName = number;
        }
      }

      // Usar o número real se encontrado, senão usar o número extraído
      const displayNumber = actualNumber || number;
      
      const participantData = {
        id: participant.id,
        name: participantName,
        number: displayNumber,  // Retorna o número real do contato (ou LID se não encontrado)
        profilePicUrl,
        isAdmin: participant.admin === "admin",
        isSuperAdmin: participant.admin === "superadmin"
      };

      console.log(`[GetGroupParticipantsService] Processed participant data: ${JSON.stringify(participantData)}`);
      return participantData;
    });

    console.log(`[GetGroupParticipantsService] Awaiting all participant promises`);
    const participants = await Promise.all(participantsPromises);

    // Ordenar participantes: super admins primeiro, depois admins, depois membros normais
    console.log(`[GetGroupParticipantsService] Sorting participants`);
    participants.sort((a, b) => {
      if (a.isSuperAdmin && !b.isSuperAdmin) return -1;
      if (!a.isSuperAdmin && b.isSuperAdmin) return 1;
      if (a.isAdmin && !b.isAdmin) return -1;
      if (!a.isAdmin && b.isAdmin) return 1;
      return a.name.localeCompare(b.name);
    });

    console.log(`[GetGroupParticipantsService] Successfully processed ${participants.length} participants`);
    return participants;

  } catch (error) {
    console.error(`[GetGroupParticipantsService] ERROR in main try-catch: ${error.message}`, error.stack);

    // Verificar se o erro é relacionado ao grupo não existir mais
    if (error.message?.includes("not_found") || error.message?.includes("item-not-found")) {
      console.error(`[GetGroupParticipantsService] Group not found on WhatsApp: ${contact.remoteJid}`);
      throw new AppError("Grupo não encontrado no WhatsApp", 404);
    }

    // Verificar se o erro é de conexão
    if (error.message?.includes("Connection Closed") || error.message?.includes("not_connected")) {
      console.error(`[GetGroupParticipantsService] WhatsApp connection error: ${error.message}`);
      throw new AppError("WhatsApp desconectado", 503);
    }

    console.error(`[GetGroupParticipantsService] Unexpected error: ${error.message}`);
    throw new AppError(`Erro ao buscar participantes do grupo: ${error.message}`, 500);
  }
};

export default GetGroupParticipantsService;
