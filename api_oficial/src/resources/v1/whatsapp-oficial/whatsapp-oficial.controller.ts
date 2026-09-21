/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { WhatsappOficialService } from './whatsapp-oficial.service';
import { CreateWhatsappOficialDto } from './dto/create-whatsapp-oficial.dto';
import { UpdateWhatsappOficialDto } from './dto/update-whatsapp-oficial.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@Controller('v1/whatsapp-oficial')
@ApiBearerAuth()
@ApiTags('Whatsapp Oficial')
export class WhatsappOficialController {
  constructor(private readonly whatsappOficialService: WhatsappOficialService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Retorna um Whatsapp Oficial' })
  @ApiResponse({ status: 400, description: 'Erro ao retornar conexão' })
  @ApiResponse({ status: 200, description: 'Retorna o registro' })
  getOne(@Param('id') id: number) {
    return this.whatsappOficialService.oneWhatAppOficial(id);
  }

  @Get('')
  @ApiOperation({ summary: 'Retorna registros Whatsapp Oficial' })
  @ApiResponse({ status: 400, description: 'Erro ao encontrar conexões' })
  @ApiResponse({ status: 200, description: 'Retorna os registros' })
  getMore() {
    return this.whatsappOficialService.allWhatsAppOficial();
  }

  @Post()
  @ApiOperation({ summary: 'Criar Whatsapp Oficial' })
  @ApiResponse({ status: 400, description: 'Erro ao criar conexão' })
  @ApiResponse({ status: 200, description: 'Retorna o registro criado' })
  create(@Body() data: CreateWhatsappOficialDto) {
    return this.whatsappOficialService.createWhatsAppOficial(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar Whatsapp Oficial' })
  @ApiResponse({ status: 400, description: 'Erro ao atualizar conexão' })
  @ApiResponse({ status: 200, description: 'Retorna o registro atualizado' })
  update(@Param('id') id: number, @Body() data: UpdateWhatsappOficialDto) {
    return this.whatsappOficialService.updateWhatsAppOficial(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar Whatsapp Oficial' })
  @ApiResponse({ status: 400, description: 'Erro ao deletar conexão' })
  @ApiResponse({ status: 200, description: 'Retorna o registro deletado' })
  delete(@Param('id') id: number) {
    return this.whatsappOficialService.deleteWhatsAppOficial(id);
  }
}
