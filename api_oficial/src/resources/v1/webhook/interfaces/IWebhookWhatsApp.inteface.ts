/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export interface IWebhookWhatsApp {
  object: string;
  entry: IEntry[];
}

export interface IEntry {
  id: string;
  changes: IChange[];
}

export interface IChange {
  value: IValue;
  field: string;
}

export interface IValue {
  messaging_product: string;
  metadata: IMetadata;
  contacts?: IContact[];
  messages?: IMessage[];
  statuses?: IStatus[];
  errors?: IError[];
}

export interface IMetadata {
  display_phone_number: string;
  phone_number_id: string;
}

export interface IContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface IMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: ITextMessage;
  image?: IMediaMessage;
  audio?: IMediaMessage;
  video?: IMediaMessage;
  document?: IDocumentMessage;
  sticker?: IMediaMessage;
  location?: ILocationMessage;
  contacts?: IContactMessage[];
  interactive?: IInteractiveMessage;
  button?: IButtonMessage;
  reaction?: IReactionMessage;
  context?: IContext;
  referral?: IReferral;
}

export interface ITextMessage {
  body: string;
}

export interface IMediaMessage {
  id: string;
  mime_type: string;
  sha256?: string;
  caption?: string;
}

export interface IDocumentMessage {
  id: string;
  mime_type: string;
  sha256?: string;
  caption?: string;
  filename?: string;
}

export interface ILocationMessage {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface IContactMessage {
  addresses?: IContactAddress[];
  birthday?: string;
  emails?: IContactEmail[];
  name: IContactName;
  org?: IContactOrg;
  phones?: IContactPhone[];
  urls?: IContactUrl[];
}

export interface IContactAddress {
  city?: string;
  country?: string;
  country_code?: string;
  state?: string;
  street?: string;
  type?: string;
  zip?: string;
}

export interface IContactEmail {
  email?: string;
  type?: string;
}

export interface IContactName {
  formatted_name: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  suffix?: string;
  prefix?: string;
}

export interface IContactOrg {
  company?: string;
  department?: string;
  title?: string;
}

export interface IContactPhone {
  phone?: string;
  type?: string;
  wa_id?: string;
}

export interface IContactUrl {
  url?: string;
  type?: string;
}

export interface IInteractiveMessage {
  type: string;
  button_reply?: {
    id: string;
    title: string;
  };
  list_reply?: {
    id: string;
    title: string;
    description?: string;
  };
  nfm_reply?: {
    response_json: string;
    body: string;
    name: string;
  };
}

export interface IButtonMessage {
  payload: string;
  text: string;
}

export interface IReactionMessage {
  message_id: string;
  emoji: string;
}

export interface IContext {
  from: string;
  id: string;
  forwarded?: boolean;
  frequently_forwarded?: boolean;
  referred_product?: {
    catalog_id: string;
    product_retailer_id: string;
  };
}

export interface IReferral {
  source_url: string;
  source_type: string;
  source_id: string;
  headline: string;
  body: string;
  media_type: string;
  image_url?: string;
  video_url?: string;
  thumbnail_url?: string;
}

export interface IStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  conversation?: IConversation;
  pricing?: IPricing;
  errors?: IError[];
}

export interface IConversation {
  id: string;
  origin: {
    type: string;
  };
  expiration_timestamp?: string;
}

export interface IPricing {
  billable: boolean;
  pricing_model: string;
  category: string;
}

export interface IError {
  code: number;
  title: string;
  message?: string;
  error_data?: {
    details: string;
  };
}
