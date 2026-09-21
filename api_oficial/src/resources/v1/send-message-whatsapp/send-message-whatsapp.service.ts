/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../@core/infra/database/prisma.service';
import { MetaService } from '../../../@core/infra/meta/meta.service';
import { RedisService } from '../../../@core/infra/redis/RedisService.service';
import { SendMessageDto, MessageType } from './dto/send-message.dto';

@Injectable()
export class SendMessageWhatsappService {
  private readonly logger = new Logger(SendMessageWhatsappService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metaService: MetaService,
    private readonly redis: RedisService,
  ) {}

  async sendMessage(token: string, sendMessageDto: SendMessageDto) {
    this.logger.log(`Enviando mensagem para ${sendMessageDto.to}`);
    this.logger.log(`Tipo: ${sendMessageDto.type}`);
    if (sendMessageDto.template) {
      this.logger.log(`Template: ${JSON.stringify(sendMessageDto.template)}`);
    }

    // Buscar conexão pelo token
    const conexao = await this.prisma.whatsappOficial.findFirst({
      where: { token_mult100: token },
      include: { company: true },
    });

    if (!conexao) {
      throw new NotFoundException('Conexão não encontrada para o token informado');
    }

    try {
      // Montar payload para Meta API
      const payload = await this.buildMetaPayload(sendMessageDto, conexao);
      this.logger.log(`Payload para Meta: ${JSON.stringify(payload)}`);

      // Enviar via Meta API
      const result = await this.metaService.sendMessage(
        conexao.phone_number_id,
        conexao.send_token,
        payload,
      );

      // Salvar no banco de dados
      const savedMessage = await this.prisma.sendMessageWhatsApp.create({
        data: {
          type: sendMessageDto.type,
          to: sendMessageDto.to,
          text: sendMessageDto.text ? JSON.stringify(sendMessageDto.text) : null,
          audio: sendMessageDto.audio ? JSON.stringify(sendMessageDto.audio) : null,
          document: sendMessageDto.document ? JSON.stringify(sendMessageDto.document) : null,
          image: sendMessageDto.image ? JSON.stringify(sendMessageDto.image) : null,
          video: sendMessageDto.video ? JSON.stringify(sendMessageDto.video) : null,
          location: sendMessageDto.location ? JSON.stringify(sendMessageDto.location) : null,
          contacts: sendMessageDto.contacts ? JSON.stringify(sendMessageDto.contacts) : null,
          interactive: sendMessageDto.interactive ? JSON.stringify(sendMessageDto.interactive) : null,
          template: sendMessageDto.template ? JSON.stringify(sendMessageDto.template) : null,
          whatsappOficialId: conexao.id,
        },
      });

      // Cache do status
      await this.redis.set(
        `msg:${result.messages[0].id}`,
        JSON.stringify({
          id: savedMessage.id,
          to: sendMessageDto.to,
          type: sendMessageDto.type,
          status: 'sent',
          conexaoId: conexao.id,
        }),
        86400,
      );

      return {
        success: true,
        messageId: result.messages[0].id,
        internalId: savedMessage.id,
        idMessageWhatsApp: [result.messages[0].id],
      };
    } catch (error) {
      this.logger.error(`Erro ao enviar mensagem: ${error.message}`);
      throw new BadRequestException(`Erro ao enviar mensagem: ${error.message}`);
    }
  }

  private async buildMetaPayload(dto: SendMessageDto, conexao: any): Promise<any> {
    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: dto.to,
      type: dto.type,
    };

    // Adicionar contexto se for resposta
    if (dto.context) {
      payload.context = {
        message_id: dto.context.message_id,
      };
    }

    switch (dto.type) {
      case MessageType.TEXT:
        payload.text = dto.text;
        break;

      case MessageType.IMAGE:
        payload.image = await this.processMedia(dto.image, conexao);
        break;

      case MessageType.AUDIO:
        payload.audio = await this.processMedia(dto.audio, conexao);
        break;

      case MessageType.VIDEO:
        payload.video = await this.processMedia(dto.video, conexao);
        break;

      case MessageType.DOCUMENT:
        payload.document = await this.processMedia(dto.document, conexao);
        break;

      case MessageType.STICKER:
        payload.sticker = await this.processMedia(dto.sticker, conexao);
        break;

      case MessageType.LOCATION:
        payload.location = dto.location;
        break;

      case MessageType.CONTACTS:
        payload.contacts = dto.contacts;
        break;

      case MessageType.INTERACTIVE:
        payload.interactive = dto.interactive;
        break;

      case MessageType.TEMPLATE:
        payload.template = dto.template;
        this.logger.log(`Template payload: ${JSON.stringify(payload.template)}`);
        break;

      case MessageType.REACTION:
        payload.reaction = dto.reaction;
        break;

      default:
        throw new BadRequestException(`Tipo de mensagem não suportado: ${dto.type}`);
    }

    return payload;
  }

  private async processMedia(media: any, conexao: any): Promise<any> {
    if (!media) return null;

    // Se já tem ID, usar direto
    if (media.id) {
      const result: any = { id: media.id };
      if (media.caption) result.caption = media.caption;
      if (media.filename) result.filename = media.filename;
      return result;
    }

    // Se tem link, pode usar direto ou fazer upload
    if (media.link) {
      const result: any = { link: media.link };
      if (media.caption) result.caption = media.caption;
      if (media.filename) result.filename = media.filename;
      return result;
    }

    throw new BadRequestException('Mídia deve ter id ou link');
  }

  async uploadMedia(token: string, file: Express.Multer.File) {
    this.logger.log(`Upload de mídia: ${file.originalname}`);

    const conexao = await this.prisma.whatsappOficial.findFirst({
      where: { token_mult100: token },
    });

    if (!conexao) {
      throw new NotFoundException('Conexão não encontrada');
    }

    try {
      const result = await this.metaService.uploadMedia(
        conexao.phone_number_id,
        conexao.send_token,
        file,
      );

      return {
        success: true,
        mediaId: result.id,
      };
    } catch (error) {
      this.logger.error(`Erro no upload: ${error.message}`);
      throw new BadRequestException(`Erro no upload: ${error.message}`);
    }
  }

  async getMessageStatus(token: string, messageId: string) {
    const cached = await this.redis.get(`msg:${messageId}`);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const conexao = await this.prisma.whatsappOficial.findFirst({
      where: { token_mult100: token },
    });

    if (!conexao) {
      throw new NotFoundException('Conexão não encontrada');
    }

    const status = await this.redis.get(`status:${conexao.id}:${messageId}`);

    return {
      messageId,
      status: status || 'unknown',
    };
  }

  async markAsRead(token: string, messageId: string) {
    this.logger.log(`Marcando mensagem como lida: ${messageId}`);

    const conexao = await this.prisma.whatsappOficial.findFirst({
      where: { token_mult100: token },
    });

    if (!conexao) {
      throw new NotFoundException('Conexão não encontrada');
    }

    try {
      await this.metaService.markAsRead(
        conexao.phone_number_id,
        messageId,
        conexao.send_token,
      );
      return { success: true };
    } catch (error) {
      this.logger.error(`Erro ao marcar como lida: ${error.message}`);
      throw new BadRequestException(`Erro ao marcar como lida: ${error.message}`);
    }
  }
}
