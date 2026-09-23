/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


export interface ISendMessageOficial {
    type: 'text' | 'reaction' | 'audio' | 'document' | 'image' | 'sticker' | 'video' | 'location' | 'contacts' | 'interactive' | 'template';
    to: string;
    fileName?: string;
    quotedId?: string;
    body_text?: IMetaMessageText;
    body_video?: IMetaMessageVideo;
    body_document?: IMetaMessageDocument;
    body_image?: IMetaMessageImage;
    body_location?: IMetaMessageLocation;
    body_reaction?: IMetaMessageReaction;
    body_contacts?: IMetaMessageContacts;
    body_interactive?: IMetaMessageinteractive;
    body_sticket?: IMetaMessageSticker;
    body_template?: IMetaMessageTemplate;
}

export interface IMetaMessageinteractive {
    type: 'button' | 'list';
    header?: IMetaMessageinteractiveHeader;
    body?: IMetaMessageinteractiveBody;
    footer?: IMetaMessageinteractiveFooter;
    action: IMetaMessageinteractiveAction;
}

export interface IMetaMessageinteractiveAction {
    /** Texto do CTA que abre a lista (obrigatório no tipo list) */
    button?: string;
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

export interface IMetaMessageText {
    preview_url?: string;
    body: string;
}

export interface IMetaMessageVideo {
    caption: string;
}

export interface IMetaMessageDocument {
    caption: string;
}

export interface IMetaMessageImage {
    caption: string;
}

export interface IMetaMessageLocation {
    latitude: string;
    longitude: string;
    name: string;
    address: string;
}

export interface IMetaMessageReaction {
    message_id: string;
    emoji: string; //unicode https://emojipedia.org/red-heart
}

export interface IMetaMessageContacts {
    addresses?: IMetaMessageContactsAddresses;
    birthday?: string; // AAAA-MM-DD
    emails?: Array<IMetaMessageContactsEmails>;
    name?: IMetaMessageContactsName;
    org?: IMetaMessageContactsOrg;
    phones?: Array<IMetaMessageContactsPhones>;
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

export interface IMetaMessageSticker {
    id: string;
}

export interface IMetaMessageTemplate {
    name: string;
    language: IMetaMessageTemplateLanguage;
    components?: Array<IMetaMessageTemplateComponents> | IMetaMessageTemplateComponents;
}

export interface IMetaMessageTemplateLanguage {
    code: string;
}

export interface IMetaMessageTemplateComponents {
    type: 'header' | 'body' | 'footer' | 'button';
    sub_type?: 'quick_reply' | 'url'
    index?: string;
    parameters: IMetaMessageTemplateComponentsParameters | Array<IMetaMessageTemplateComponentsParameters>;
}

export interface IMetaMessageTemplateComponentsParameters {
    type: 'location' | 'currency' | 'date_time' | 'text' | 'payload' | 'location' | 'url' | 'image' | 'video';
    text?: string;
    url?: string;    
    location?: IMetaMessageTemplateComponentsParametersLocation
    currency?: IMetaMessageTemplateComponentsParametersCurrency;
    image?: IMetaMessageTemplateComponentsParametersImage;
    date_time?: IMetaMessageTemplateComponentsParametersDateTime;
    payload?: string;
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

export interface IMetaMessageTemplateComponentsParametersDateTime {
    fallback_value: string;
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
    message_status: string;
}

export interface ICreateConnectionWhatsAppOficial {
    email: string;
    company: ICreateConnectionWhatsAppOficialCompany;
    whatsApp: ICreateConnectionWhatsAppOficialWhatsApp;
}

export interface ICreateConnectionWhatsAppOficialCompany {
    companyId: string;
    companyName: string;
}

export interface ICreateConnectionWhatsAppOficialWhatsApp {
    token_mult100: string;
    phone_number_id: string;
    waba_id: string;
    send_token: string;
    business_id: string;
    phone_number: string;
    chatwoot_webhook_url?: string;
    auth_token_chatwoot?: string;
    n8n_webhook_url?: string;
    auth_token_n8n?: string;
    crm_webhook_url?: string;
    auth_token_crm?: string;
    typebot_webhook_url?: string;
    auth_token_typebot?: string;
    use_rabbitmq?: boolean;
    rabbitmq_routing_key?: string;
    idEmpresaMult100: number;
}

export interface IUpdateonnectionWhatsAppOficialWhatsApp {
    token_mult100?: string;
    phone_number_id?: string;
    waba_id?: string;
    send_token?: string;
    business_id?: string;
    phone_number?: string;
    chatwoot_webhook_url?: string;
    auth_token_chatwoot?: string;
    n8n_webhook_url?: string;
    auth_token_n8n?: string;
    crm_webhook_url?: string;
    auth_token_crm?: string;
    typebot_webhook_url?: string;
    auth_token_typebot?: string;
    use_rabbitmq?: boolean;
    rabbitmq_routing_key?: string;
    idEmpresaMult100: number;
}

export interface IPayloadAPIWhatsAppOficial {
    data: IPayloadAPIWhatsAppOficialData;
    user: IPayloadAPIWhatsAppOficialUser;
}

export interface IPayloadAPIWhatsAppOficialData {
    access_token: string;
}

export interface IPayloadAPIWhatsAppOficialUser {
    id: number;
    create_at: Date;
    update_at: Date;
    deleted_at?: Date;
    name: string;
    email: string;
    super: boolean;
}

export interface IReturnCreateCompanyAPIWhatsAppOficial {
    id: number;
    create_at: Date;
    update_at: Date;
    deleted_at?: Date;
    name: string;
    idEmpresaMult100: number;
    usersId: number;
}

export interface IReturnConnectionCreateAPIWhatsAppOficial extends ICreateConnectionWhatsAppOficialWhatsApp {
    id: number;
    companyId: number;
    create_at: Date;
    update_at: Date;
    deleted_at: Date;
    rabbitmq_exchange: string;
    rabbitmq_queue: string;
    rabbitmq_routing_key: string;
}

export interface IDataCreateUserApiOficial {
    name: string;
    email: string;
    password: string;
}

export interface IUserApiOficial {
    id: number;
    create_at: Date;
    update_at: Date;
    deleted_at?: Date;
    name: string;
    email: string;
    super: boolean;
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
    format: string;
    buttons: any;
}