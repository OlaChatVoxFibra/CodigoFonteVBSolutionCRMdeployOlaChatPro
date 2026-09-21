/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Module } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { WhatsappOficialService } from '../whatsapp-oficial/whatsapp-oficial.service';
import { PrismaService } from '../../../@core/infra/database/prisma.service';
import { RabbitMQService } from '../../../@core/infra/rabbitmq/RabbitMq.service';
import { RedisService } from '../../../@core/infra/redis/RedisService.service';
import { SocketService } from '../../../@core/infra/socket/socket.service';
import { MetaService } from '../../../@core/infra/meta/meta.service';

@Module({
  controllers: [WebhookController],
  providers: [
    WebhookService,
    WhatsappOficialService,
    PrismaService,
    RabbitMQService,
    RedisService,
    SocketService,
    MetaService,
  ],
  exports: [WebhookService],
})
export class WebhookModule {}
