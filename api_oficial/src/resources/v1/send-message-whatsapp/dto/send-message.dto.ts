/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, ValidateNested, IsArray, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  DOCUMENT = 'document',
  STICKER = 'sticker',
  LOCATION = 'location',
  CONTACTS = 'contacts',
  INTERACTIVE = 'interactive',
  TEMPLATE = 'template',
  REACTION = 'reaction',
}

export class TextMessageDto {
  @ApiProperty({ description: 'Corpo da mensagem de texto' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: 'Preview de links' })
  @IsOptional()
  preview_url?: boolean;
}

export class MediaMessageDto {
  @ApiPropertyOptional({ description: 'ID da mídia no Meta' })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiPropertyOptional({ description: 'URL da mídia' })
  @IsString()
  @IsOptional()
  link?: string;

  @ApiPropertyOptional({ description: 'Legenda' })
  @IsString()
  @IsOptional()
  caption?: string;

  @ApiPropertyOptional({ description: 'Nome do arquivo (para documentos)' })
  @IsString()
  @IsOptional()
  filename?: string;
}

export class LocationMessageDto {
  @ApiProperty({ description: 'Latitude' })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude' })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ description: 'Nome do local' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Endereço' })
  @IsString()
  @IsOptional()
  address?: string;
}

export class ContactNameDto {
  @ApiProperty({ description: 'Nome formatado' })
  @IsString()
  formatted_name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  first_name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  last_name?: string;
}

export class ContactPhoneDto {
  @ApiProperty()
  @IsString()
  phone: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  wa_id?: string;
}

export class ContactDto {
  @ApiProperty({ type: ContactNameDto })
  @ValidateNested()
  @Type(() => ContactNameDto)
  name: ContactNameDto;

  @ApiPropertyOptional({ type: [ContactPhoneDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactPhoneDto)
  @IsOptional()
  phones?: ContactPhoneDto[];
}

export class InteractiveButtonDto {
  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  title: string;
}

export class InteractiveActionDto {
  @ApiPropertyOptional({ type: [InteractiveButtonDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InteractiveButtonDto)
  @IsOptional()
  buttons?: InteractiveButtonDto[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  button?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  sections?: any[];
}

export class InteractiveMessageDto {
  @ApiProperty({ enum: ['button', 'list', 'product', 'product_list'] })
  @IsString()
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  header?: any;

  @ApiProperty()
  body: { text: string };

  @ApiPropertyOptional()
  @IsOptional()
  footer?: { text: string };

  @ApiProperty({ type: InteractiveActionDto })
  @ValidateNested()
  @Type(() => InteractiveActionDto)
  action: InteractiveActionDto;
}

export class TemplateComponentDto {
  @ApiProperty()
  @IsString()
  type: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  parameters?: any[];
}

export class TemplateMessageDto {
  @ApiProperty({ description: 'Nome do template' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Código do idioma' })
  @IsString()
  language: { code: string };

  @ApiPropertyOptional({ type: [TemplateComponentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateComponentDto)
  @IsOptional()
  components?: TemplateComponentDto[];
}

export class ReactionMessageDto {
  @ApiProperty({ description: 'ID da mensagem para reagir' })
  @IsString()
  message_id: string;

  @ApiProperty({ description: 'Emoji da reação (vazio para remover)' })
  @IsString()
  emoji: string;
}

export class ContextDto {
  @ApiProperty({ description: 'ID da mensagem para responder' })
  @IsString()
  message_id: string;
}

export class SendMessageDto {
  @ApiProperty({ description: 'Número do destinatário (com código do país)' })
  @IsString()
  to: string;

  @ApiProperty({ enum: MessageType, description: 'Tipo da mensagem' })
  @IsEnum(MessageType)
  type: MessageType;

  @ApiPropertyOptional({ type: TextMessageDto })
  @ValidateNested()
  @Type(() => TextMessageDto)
  @IsOptional()
  text?: TextMessageDto;

  @ApiPropertyOptional({ type: MediaMessageDto })
  @ValidateNested()
  @Type(() => MediaMessageDto)
  @IsOptional()
  image?: MediaMessageDto;

  @ApiPropertyOptional({ type: MediaMessageDto })
  @ValidateNested()
  @Type(() => MediaMessageDto)
  @IsOptional()
  audio?: MediaMessageDto;

  @ApiPropertyOptional({ type: MediaMessageDto })
  @ValidateNested()
  @Type(() => MediaMessageDto)
  @IsOptional()
  video?: MediaMessageDto;

  @ApiPropertyOptional({ type: MediaMessageDto })
  @ValidateNested()
  @Type(() => MediaMessageDto)
  @IsOptional()
  document?: MediaMessageDto;

  @ApiPropertyOptional({ type: MediaMessageDto })
  @ValidateNested()
  @Type(() => MediaMessageDto)
  @IsOptional()
  sticker?: MediaMessageDto;

  @ApiPropertyOptional({ type: LocationMessageDto })
  @ValidateNested()
  @Type(() => LocationMessageDto)
  @IsOptional()
  location?: LocationMessageDto;

  @ApiPropertyOptional({ type: [ContactDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDto)
  @IsOptional()
  contacts?: ContactDto[];

  @ApiPropertyOptional({ type: InteractiveMessageDto })
  @ValidateNested()
  @Type(() => InteractiveMessageDto)
  @IsOptional()
  interactive?: InteractiveMessageDto;

  @ApiPropertyOptional({ type: TemplateMessageDto })
  @ValidateNested()
  @Type(() => TemplateMessageDto)
  @IsOptional()
  template?: TemplateMessageDto;

  @ApiPropertyOptional({ type: ReactionMessageDto })
  @ValidateNested()
  @Type(() => ReactionMessageDto)
  @IsOptional()
  reaction?: ReactionMessageDto;

  @ApiPropertyOptional({ type: ContextDto, description: 'Contexto para responder mensagem' })
  @ValidateNested()
  @Type(() => ContextDto)
  @IsOptional()
  context?: ContextDto;
}
