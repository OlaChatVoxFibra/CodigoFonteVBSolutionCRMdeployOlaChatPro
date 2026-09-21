/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../@core/infra/database/prisma.service';
import { RedisService } from '../../../@core/infra/redis/RedisService.service';
import { RabbitMQService } from '../../../@core/infra/rabbitmq/RabbitMq.service';
import { SocketService } from '../../../@core/infra/socket/socket.service';
import { MetaService } from '../../../@core/infra/meta/meta.service';
import { IWebhookWhatsApp, IMessage, IStatus, IValue } from './interfaces/IWebhookWhatsApp.inteface';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly rabbitmq: RabbitMQService,
    private readonly socket: SocketService,
    private readonly metaService: MetaService,
  ) {}

  async webhookCompany(
    companyId: number,
    conexaoId: number,
    mode: string,
    verify_token: string,
    challenge: string,
  ) {
    this.logger.log(`Webhook validation - Company: ${companyId}, Conexao: ${conexaoId}`);

    // Buscar conexão
    const conexao = await this.prisma.whatsappOficial.findFirst({
      where: { id: conexaoId },
    });

    if (!conexao) {
      throw new NotFoundException('Conexão não encontrada');
    }

    // Validar token (token de integração da plataforma / verify_token)
    if (mode === 'subscribe' && verify_token === conexao.token_mult100) {
      this.logger.log('Webhook verificado com sucesso');
      return parseInt(challenge);
    }

    throw new BadRequestException('Token de verificação inválido');
  }

  async webhookCompanyConexao(
    companyId: number,
    conexaoId: number,
    data: IWebhookWhatsApp,
  ) {
    this.logger.log(`Webhook recebido - Company: ${companyId}, Conexao: ${conexaoId}`);

    try {
      // Buscar conexão
      const conexao = await this.prisma.whatsappOficial.findFirst({
        where: { id: conexaoId },
        include: { company: true },
      });

      if (!conexao) {
        this.logger.warn(`Conexão ${conexaoId} não encontrada`);
        return { success: false, error: 'Conexão não encontrada' };
      }

      // Processar entradas do webhook
      for (const entry of data.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            await this.processMessages(conexao, change.value);
          }
        }
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Erro ao processar webhook: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  private async processMessages(conexao: any, value: IValue) {
    const { metadata, contacts, messages, statuses } = value;

    // Processar mensagens recebidas
    if (messages && messages.length > 0) {
      for (const message of messages) {
        await this.processIncomingMessage(conexao, message, contacts?.[0]);
      }
    }

    // Processar status de mensagens
    if (statuses && statuses.length > 0) {
      for (const status of statuses) {
        await this.processStatus(conexao, status);
      }
    }
  }

  private async processIncomingMessage(conexao: any, message: IMessage, contact: any) {
    this.logger.log(`Processando mensagem ${message.id} de ${message.from}`);

    try {
      let mediaUrl = null;
      let mediaData = null;

      // Download de mídia se necessário
      if (['image', 'audio', 'video', 'document', 'sticker'].includes(message.type)) {
        const mediaObject = message[message.type];
        if (mediaObject?.id) {
          try {
            mediaData = await this.metaService.downloadMedia(
              mediaObject.id,
              conexao.send_token,
            );
            this.logger.log(`Mídia baixada: ${mediaObject.id}`);
          } catch (err) {
            this.logger.warn(`Falha ao baixar mídia: ${err.message}`);
          }
        }
      }

      // Montar payload para enviar ao backend principal (formato IReceivedWhatsppOficial)
      const messageContent = this.extractMessageContent(message);
      const socketPayload = {
        token: conexao.token_mult100,
        fromNumber: message.from,
        nameContact: contact?.profile?.name || message.from,
        companyId: conexao.companyId,
        message: {
          type: message.type as any,
          timestamp: parseInt(message.timestamp),
          idMessage: message.id,
          text: messageContent?.text || messageContent?.body || '',
          file: mediaData?.base64 || null,
          mimeType: mediaData?.mimeType || null,
          idFile: message[message.type]?.id || null,
          quoteMessageId: message.context?.id || null,
          fileUrl: mediaData?.url || null,
          fileSize: mediaData?.fileSize || null,
        },
      };
      // Enviar via WebSocket para o backend principal
      await this.socket.sendMessage(socketPayload);
      // Publicar no RabbitMQ se configurado
      if (conexao.use_rabbitmq && conexao.rabbitmq_queue) {
        await this.rabbitmq.publish(conexao.rabbitmq_queue, JSON.stringify(socketPayload));
      }

      // Marcar como lida (opcional - pode ser configurável)
      try {
        await this.metaService.markAsRead(
          conexao.phone_number_id,
          message.id,
          conexao.send_token,
        );
      } catch (err) {
        this.logger.warn(`Falha ao marcar como lida: ${err.message}`);
      }

      // Cache da última mensagem
      await this.redis.set(
        `lastmsg:${conexao.id}:${message.from}`,
        JSON.stringify(socketPayload),
        3600,
      );

    } catch (error) {
      this.logger.error(`Erro ao processar mensagem: ${error.message}`);
      throw error;
    }
  }

  private extractMessageContent(message: IMessage): any {
    switch (message.type) {
      case 'text':
        return { text: message.text?.body };
      
      case 'image':
        return {
          image: {
            id: message.image?.id,
            mime_type: message.image?.mime_type,
            caption: message.image?.caption,
          },
        };
      
      case 'audio':
        return {
          audio: {
            id: message.audio?.id,
            mime_type: message.audio?.mime_type,
          },
        };
      
      case 'video':
        return {
          video: {
            id: message.video?.id,
            mime_type: message.video?.mime_type,
            caption: message.video?.caption,
          },
        };
      
      case 'document':
        return {
          document: {
            id: message.document?.id,
            mime_type: message.document?.mime_type,
            filename: message.document?.filename,
            caption: message.document?.caption,
          },
        };
      
      case 'sticker':
        return {
          sticker: {
            id: message.sticker?.id,
            mime_type: message.sticker?.mime_type,
          },
        };
      
      case 'location':
        return {
          location: {
            latitude: message.location?.latitude,
            longitude: message.location?.longitude,
            name: message.location?.name,
            address: message.location?.address,
          },
        };
      
      case 'contacts':
        return { contacts: message.contacts };
      
      case 'interactive':
        return { interactive: message.interactive };
      
      case 'button':
        return { button: message.button };
      
      case 'reaction':
        return { reaction: message.reaction };
      
      default:
        return { raw: message };
    }
  }

  private async processStatus(conexao: any, status: IStatus) {
    this.logger.log(`Status ${status.status} para mensagem ${status.id}`);

    const payload = {
      event: 'message.status',
      data: {
        conexaoId: conexao.id,
        companyId: conexao.companyId,
        messageId: status.id,
        status: status.status,
        timestamp: status.timestamp,
        recipient: status.recipient_id,
        conversation: status.conversation,
        pricing: status.pricing,
        errors: status.errors,
      },
    };

    // Enviar via WebSocket
    await this.socket.emit('whatsapp:status', payload);

    // Atualizar cache de status
    await this.redis.set(
      `status:${conexao.id}:${status.id}`,
      status.status,
      86400,
    );
  }
}
