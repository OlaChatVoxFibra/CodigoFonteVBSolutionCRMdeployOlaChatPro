/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './@core/infra/database/prisma.service';
import { CompaniesModule } from './resources/v1/companies/companies.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './@core/guard/auth.guard';
import { WebhookModule } from './resources/v1/webhook/webhook.module';
import { WhatsappOficialModule } from './resources/v1/whatsapp-oficial/whatsapp-oficial.module';
import { RedisService } from './@core/infra/redis/RedisService.service';
import { RabbitMQService } from './@core/infra/rabbitmq/RabbitMq.service';
import { SocketService } from './@core/infra/socket/socket.service';
import { SendMessageWhatsappModule } from './resources/v1/send-message-whatsapp/send-message-whatsapp.module';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mimeToExtension } from './@core/common/utils/convertMimeTypeToExtension';
import { TemplatesWhatsappModule } from './resources/v1/templates-whatsapp/templates-whatsapp.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CompaniesModule,
    WebhookModule,
    WhatsappOficialModule,
    SendMessageWhatsappModule,
    MulterModule.register({
      storage: diskStorage({
        destination: './public',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return cb(null, `${randomName}${Date.now()}${file.originalname}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!mimeToExtension[file.mimetype]) {
          return callback(new Error('Arquivo não permitido!'), false);
        }
        callback(null, true);
      },
    }),
    TemplatesWhatsappModule,
  ],
  controllers: [AppController],
  providers: [
    PrismaService,
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    RedisService,
    RabbitMQService,
    SocketService,
  ],
})
export class AppModule {}
