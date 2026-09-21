/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Module } from '@nestjs/common';
import { TemplatesWhatsappService } from './templates-whatsapp.service';
import { TemplatesWhatsappController } from './templates-whatsapp.controller';
import { PrismaService } from '../../../@core/infra/database/prisma.service';
import { MetaService } from '../../../@core/infra/meta/meta.service';
import { RedisService } from '../../../@core/infra/redis/RedisService.service';

@Module({
  controllers: [TemplatesWhatsappController],
  providers: [
    TemplatesWhatsappService,
    PrismaService,
    MetaService,
    RedisService,
  ],
  exports: [TemplatesWhatsappService],
})
export class TemplatesWhatsappModule {}
