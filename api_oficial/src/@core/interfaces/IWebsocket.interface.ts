/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export interface IReceivedWhatsppOficial {
  token: string;
  fromNumber: string;
  nameContact: string;
  companyId: number;
  message: IMessageReceived;
}

export interface IReceivedWhatsppOficialRead {
  messageId: string;
  companyId: number;
  token: string;
}

export interface IMessageReceived {
  type:
    | 'text'
    | 'image'
    | 'audio'
    | 'document'
    | 'video'
    | 'location'
    | 'contacts'
    | 'order'
    | 'interactive'
    | 'referral'
    | 'sticker';
  timestamp: number;
  idMessage: string;
  text?: string;
  file?: string;
  mimeType?: string;
  idFile?: string;
  quoteMessageId?: string;
  fileUrl?: string;
  fileSize?: number;
}
