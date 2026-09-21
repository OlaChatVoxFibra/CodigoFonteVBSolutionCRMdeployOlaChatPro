/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Prisma } from '@prisma/client';
import { Company } from './company.entity';

export class WhatsAppOficial
  implements Prisma.whatsappOficialUncheckedCreateInput
{
  id?: number;
  create_at?: string | Date;
  update_at?: string | Date;
  deleted_at?: string | Date;
  companyId: number;
  chatwoot_webhook_url?: string;
  auth_token_chatwoot?: string;
  n8n_webhook_url?: string;
  auth_token_n8n?: string;
  crm_webhook_url?: string;
  auth_token_crm?: string;
  typebot_webhook_url?: string;
  auth_token_typebot?: string;
  use_rabbitmq?: boolean;
  rabbitmq_exchange?: string;
  rabbitmq_queue?: string;
  rabbitmq_routing_key?: string;
  phone_number_id: string;
  waba_id: string;
  send_token: string;
  business_id: string;
  phone_number: string;
  token_mult100: string;

  constructor() {
    this.id = null;
    this.create_at = null;
    this.update_at = null;
    this.deleted_at = null;
    this.companyId = null;
    this.auth_token_chatwoot = null;
    this.n8n_webhook_url = null;
    this.chatwoot_webhook_url = null;
    this.typebot_webhook_url = null;
    this.rabbitmq_exchange = null;
    this.rabbitmq_queue = null;
    this.rabbitmq_routing_key = null;
    this.phone_number_id = null;
    this.waba_id = null;
    this.send_token = null;
    this.business_id = null;
    this.phone_number = null;
    this.token_mult100 = null;
  }
}
