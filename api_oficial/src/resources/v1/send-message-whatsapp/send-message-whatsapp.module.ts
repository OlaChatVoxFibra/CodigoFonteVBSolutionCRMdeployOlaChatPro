/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Module } from '@nestjs/common';
import { SendMessageWhatsappService } from './send-message-whatsapp.service';
import { SendMessageWhatsappController } from './send-message-whatsapp.controller';
import { PrismaService } from '../../../@core/infra/database/prisma.service';
import { MetaService } from '../../../@core/infra/meta/meta.service';
import { RedisService } from '../../../@core/infra/redis/RedisService.service';

@Module({
  controllers: [SendMessageWhatsappController],
  providers: [
    SendMessageWhatsappService,
    PrismaService,
    MetaService,
    RedisService,
  ],
  exports: [SendMessageWhatsappService],
})
export class SendMessageWhatsappModule {}
