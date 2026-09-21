/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { SendMessageWhatsappService } from './send-message-whatsapp.service';
import { SendMessageDto, MessageType } from './dto/send-message.dto';
import { Public } from '../../../@core/guard/auth.decorator';

@Controller('v1/send-message-whatsapp')
@ApiTags('Send Message WhatsApp')
export class SendMessageWhatsappController {
  constructor(private readonly sendMessageService: SendMessageWhatsappService) {}

  /**
   * Mapeia os campos do formato antigo (body_*) para o novo formato
   * Suporta compatibilidade com sistemas legados
   */
  private mapLegacyFields(data: any): SendMessageDto {
    const mapped: any = {
      to: data.to?.replace(/^\+/, ''), // Remove o + do início se houver
      type: data.type,
    };

    // Mapear context/quotedId
    if (data.quotedId) {
      mapped.context = { message_id: data.quotedId };
    }

    // Mapear campos de mídia e mensagem (formato body_*)
    if (data.body_text) mapped.text = data.body_text;
    if (data.body_image) mapped.image = data.body_image;
    if (data.body_video) mapped.video = data.body_video;
    if (data.body_audio) mapped.audio = data.body_audio;
    if (data.body_document) mapped.document = data.body_document;
    if (data.body_sticker || data.body_sticket) mapped.sticker = data.body_sticker || data.body_sticket;
    if (data.body_location) mapped.location = data.body_location;
    if (data.body_contacts) {
      mapped.contacts = Array.isArray(data.body_contacts) ? data.body_contacts : [data.body_contacts];
    }
    if (data.body_interactive) mapped.interactive = data.body_interactive;
    if (data.body_template) mapped.template = data.body_template;
    if (data.body_reaction) mapped.reaction = data.body_reaction;

    // Se já vier no formato novo, usar direto
    if (data.text) mapped.text = data.text;
    if (data.image) mapped.image = data.image;
    if (data.video) mapped.video = data.video;
    if (data.audio) mapped.audio = data.audio;
    if (data.document) mapped.document = data.document;
    if (data.sticker) mapped.sticker = data.sticker;
    if (data.location) mapped.location = data.location;
    if (data.contacts) mapped.contacts = data.contacts;
    if (data.interactive) mapped.interactive = data.interactive;
    if (data.template) mapped.template = data.template;
    if (data.reaction) mapped.reaction = data.reaction;
    if (data.context) mapped.context = data.context;

    return mapped as SendMessageDto;
  }

  @Public()
  @Post(':token')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Enviar mensagem via WhatsApp Oficial' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiResponse({ status: 200, description: 'Mensagem enviada com sucesso' })
  @ApiResponse({ status: 400, description: 'Erro ao enviar mensagem' })
  @ApiResponse({ status: 404, description: 'Conexão não encontrada' })
  async sendMessage(
    @Param('token') token: string,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let sendMessageDto: SendMessageDto;

    console.log('[SendMessage] Recebido - token:', token.substring(0, 10) + '...');
    console.log('[SendMessage] Body keys:', Object.keys(body || {}));
    console.log('[SendMessage] File:', file ? file.originalname : 'nenhum');

    // Verificar se veio via FormData com campo 'data'
    if (body?.data) {
      try {
        const parsedData = typeof body.data === 'string' ? JSON.parse(body.data) : body.data;
        console.log('[SendMessage] Parsed data:', JSON.stringify(parsedData));
        sendMessageDto = this.mapLegacyFields(parsedData);
      } catch (error) {
        console.error('[SendMessage] Erro ao parsear campo data:', error.message);
        throw new BadRequestException('Campo data inválido');
      }
    } else {
      // Veio como JSON direto
      sendMessageDto = this.mapLegacyFields(body);
    }

    console.log('[SendMessage] DTO mapeado:', JSON.stringify(sendMessageDto));

    // Se tem arquivo, processar upload e adicionar ao payload
    if (file) {
      console.log('[SendMessage] Processando arquivo:', file.originalname, file.mimetype);
      
      try {
        // Upload do arquivo primeiro
        const uploadResult = await this.sendMessageService.uploadMedia(token, file);
        
        if (uploadResult?.mediaId) {
          const mediaPayload: any = { id: uploadResult.mediaId };
          
          // Adicionar filename se for documento
          if (sendMessageDto.type === 'document') {
            mediaPayload.filename = file.originalname;
          }

          // Manter caption se existir
          switch (sendMessageDto.type) {
            case 'image':
              mediaPayload.caption = sendMessageDto.image?.caption;
              sendMessageDto.image = mediaPayload;
              break;
            case 'video':
              mediaPayload.caption = sendMessageDto.video?.caption;
              sendMessageDto.video = mediaPayload;
              break;
            case 'audio':
              sendMessageDto.audio = mediaPayload;
              break;
            case 'document':
              mediaPayload.caption = sendMessageDto.document?.caption;
              sendMessageDto.document = mediaPayload;
              break;
            case 'sticker':
              sendMessageDto.sticker = mediaPayload;
              break;
          }
          
          console.log('[SendMessage] Media uploaded, ID:', uploadResult.mediaId);
        }
      } catch (uploadError) {
        console.error('[SendMessage] Erro no upload:', uploadError.message);
        throw new BadRequestException(`Erro no upload: ${uploadError.message}`);
      }
    }

    console.log('[SendMessage] DTO final:', JSON.stringify(sendMessageDto));
    return this.sendMessageService.sendMessage(token, sendMessageDto);
  }

  @Public()
  @Post(':token/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload de mídia para envio posterior' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Upload realizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Erro no upload' })
  async uploadMedia(
    @Param('token') token: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.sendMessageService.uploadMedia(token, file);
  }

  @Public()
  @Get(':token/status/:messageId')
  @ApiOperation({ summary: 'Consultar status de uma mensagem' })
  @ApiResponse({ status: 200, description: 'Status da mensagem' })
  async getMessageStatus(
    @Param('token') token: string,
    @Param('messageId') messageId: string,
  ) {
    return this.sendMessageService.getMessageStatus(token, messageId);
  }

  @Public()
  @Post('read-message/:token/:messageId')
  @ApiOperation({ summary: 'Marcar mensagem como lida' })
  @ApiResponse({ status: 200, description: 'Mensagem marcada como lida' })
  async markAsRead(
    @Param('token') token: string,
    @Param('messageId') messageId: string,
  ) {
    return this.sendMessageService.markAsRead(token, messageId);
  }
}
