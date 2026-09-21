/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export interface IReturnAuthMeta {
  url: string;
  mime_type: string;
  sha256: string;
  file_size: number;
  id: string;
  messaging_product: string;
}

export interface IReturnMessageMeta {
  messaging_product: string;
  contacts: Array<IReturnMessageMetaContacts>;
  messages: Array<IReturnMessageMetaMessages>;
}

export interface IReturnMessageMetaContacts {
  input: string;
  wa_id: string;
}

export interface IReturnMessageMetaMessages {
  id: string;
  message_status?: string;
}

export interface IMetaMessage {
  messaging_product: string;
  recipient_type: string;
  to: string;
  type:
    | 'text'
    | 'reaction'
    | 'audio'
    | 'document'
    | 'image'
    | 'sticker'
    | 'video'
    | 'location'
    | 'contacts'
    | 'interactive'
    | 'template';
  text?: IMetaMessageText;
  reaction?: IMetaMessageReaction;
  audio?: IMetaMessageAudio;
  document?: IMetaMessageDocument;
  image?: IMetaMessageImage;
  sticker?: IMetaMessageSticker;
  video?: IMetaMessageVideo;
  location?: IMetaMessageLocation;
  contacts?: Array<IMetaMessageContacts>;
  interactive?: IMetaMessageinteractive;
  template?: IMetaMessageTemplate;
  context?: IMetaContext;
  quotedId?: string;
}

export interface IMetaMessageText {
  preview_url?: boolean;
  body: string;
}

export interface IMetaContext {
  message_id: string;
}

export interface IMetaMessageReaction {
  message_id: string;
  emoji: string;
}

export interface IMetaMessageAudio {
  id: string;
}

export interface IMetaMessageDocument {
  id?: string;
  link?: string;
  caption?: string;
  filename: string;
}

export interface IMetaMessageImage {
  id: string;
  link: string;
  caption: string;
}

export interface IMetaMessageSticker {
  id: string;
}

export interface IMetaMessageVideo {
  id?: string;
  link?: string;
  caption: string;
}

export interface IMetaMessageLocation {
  latitude: string;
  longitude: string;
  name: string;
  address: string;
}

export interface IMetaMessageContacts {
  addresses?: IMetaMessageContactsAddresses;
  birthday?: string;
  emails?: Array<IMetaMessageContactsEmails>;
  name?: IMetaMessageContactsName;
  phones?: Array<IMetaMessageContactsPhones>;
  org?: IMetaMessageContactsOrg;
  urls?: IMetaMessageContactsUrls;
}

export interface IMetaMessageContactsAddresses {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  country_code?: string;
  type?: string;
}

export interface IMetaMessageContactsEmails {
  email?: string;
  type?: string;
}

export interface IMetaMessageContactsName {
  formatted_name?: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  suffix?: string;
  prefix?: string;
}

export interface IMetaMessageContactsOrg {
  company?: string;
  department?: string;
  title?: string;
}

export interface IMetaMessageContactsPhones {
  phone?: string;
  type?: string;
  wa_id?: number;
}

export interface IMetaMessageContactsUrls {
  url?: string;
  type?: string;
}

export interface IMetaMessageinteractive {
  type: 'button' | 'list';
  header: IMetaMessageinteractiveHeader;
  body: IMetaMessageinteractiveBody;
  footer: IMetaMessageinteractiveFooter;
  action: IMetaMessageinteractiveAction;
}

export interface IMetaMessageinteractiveAction {
  sections?: Array<IMetaMessageinteractiveActionSections>;
  buttons?: Array<IMetaMessageinteractiveActionButtons>;
}

export interface IMetaMessageinteractiveActionButtons {
  type: 'reply';
  reply: IMetaMessageinteractiveActionButtonsReply;
}

export interface IMetaMessageinteractiveActionButtonsReply {
  id: string;
  title: string;
}

export interface IMetaMessageinteractiveActionSections {
  title: string;
  rows: IMetaMessageinteractiveActionSectionsRows[];
}

export interface IMetaMessageinteractiveActionSectionsRows {
  id: string;
  title: string;
  description?: string;
}

export interface IMetaMessageinteractiveHeader {
  type: 'text' | 'image';
  image?: IMetaMessageinteractiveHeaderImage;
  text?: string;
}

export interface IMetaMessageinteractiveHeaderImage {
  id: string;
}

export interface IMetaMessageinteractiveBody {
  text: string;
}

export interface IMetaMessageinteractiveFooter {
  text: string;
}

export interface IReturnMessageFile {
  id: string;
}

export interface IMetaMessageTemplate {
  name: string;
  language: IMetaMessageTemplateLanguage;
  components: Array<IMetaMessageTemplateComponents>;
}

export interface IMetaMessageTemplateLanguage {
  code: string;
}

export interface IMetaMessageTemplateComponents {
  type: 'header' | 'body' | 'footer' | 'button';
  sub_type?: 'quick_reply' | 'url';
  index?: string;
  parameters?: IMetaMessageTemplateComponentsParameters[];
}

export interface IMetaMessageTemplateComponentsParameters {
  type:
    | 'text'
    | 'currency'
    | 'date_time'
    | 'location'
    | 'payload'
    | 'image'
    | 'video'
    | 'document'
    | 'url';
  text?: string;
  location?: IMetaMessageTemplateComponentsParametersLocation;
  currency?: IMetaMessageTemplateComponentsParametersCurrency;
  image?: IMetaMessageTemplateComponentsParametersImage;
  video?: IMetaMessageTemplateComponentsParametersVideo;
  document?: IMetaMessageTemplateComponentsParametersDocument;
  date_time?: IMetaMessageTemplateComponentsParametersDateTime;
  payload?: string;
  url?: string;
}

export interface IMetaMessageTemplateComponentsParametersLocation {
  latitude: string;
  longitude: string;
  name?: string;
  address?: string;
}

export interface IMetaMessageTemplateComponentsParametersCurrency {
  fallback_value: string;
  code: string;
  amount_1000: number;
}

export interface IMetaMessageTemplateComponentsParametersImage {
  link: string;
}

export interface IMetaMessageTemplateComponentsParametersVideo {
  link?: string;
  id?: string;
}

export interface IMetaMessageTemplateComponentsParametersDocument {
  link?: string;
  id?: string;
  filename?: string;
}

export interface IMetaMessageTemplateComponentsParametersDateTime {
  fallback_value: string;
}

export interface IResultTemplates {
  data: Array<IResultTemplatesData>;
  paging: IResultTemplatesPaging;
}

export interface IResultTemplatesPaging {
  cursors: IResultTemplatesPagingCursors;
}

export interface IResultTemplatesPagingCursors {
  before: string;
  after: string;
}

export interface IResultTemplatesData {
  name: string;
  components: Array<IResultTemplatesDataComponents>;
  language: string;
  status: string;
  category: string;
  id: string;
}

export interface IResultTemplatesDataComponents {
  type: string;
  text: string;
  example: any;
}

export interface IResultReadMessage {
  success: string;
}

export interface IBodyReadMessage {
  messaging_product: string;
  status: string;
  message_id: string;
}
