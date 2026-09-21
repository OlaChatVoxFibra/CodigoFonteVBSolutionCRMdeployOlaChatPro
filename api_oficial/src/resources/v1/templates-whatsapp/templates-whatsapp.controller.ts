/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TemplatesWhatsappService } from './templates-whatsapp.service';
import { Public } from '../../../@core/guard/auth.decorator';

@Controller('v1/templates-whatsapp')
@ApiTags('Templates WhatsApp')
export class TemplatesWhatsappController {
  constructor(private readonly templatesService: TemplatesWhatsappService) {}

  @Public()
  @Get(':token')
  @ApiOperation({ summary: 'Listar todos os templates da conta' })
  @ApiResponse({ status: 200, description: 'Lista de templates' })
  @ApiResponse({ status: 404, description: 'Conexão não encontrada' })
  async listTemplates(@Param('token') token: string) {
    return this.templatesService.listTemplates(token);
  }

  @Public()
  @Get(':token/:templateName')
  @ApiOperation({ summary: 'Buscar template específico pelo nome' })
  @ApiResponse({ status: 200, description: 'Dados do template' })
  @ApiResponse({ status: 404, description: 'Template não encontrado' })
  async getTemplate(
    @Param('token') token: string,
    @Param('templateName') templateName: string,
  ) {
    return this.templatesService.getTemplate(token, templateName);
  }

  @Public()
  @Post(':token')
  @ApiOperation({ summary: 'Criar novo template' })
  @ApiResponse({ status: 201, description: 'Template criado' })
  @ApiResponse({ status: 400, description: 'Erro na criação' })
  async createTemplate(
    @Param('token') token: string,
    @Body() templateData: any,
  ) {
    return this.templatesService.createTemplate(token, templateData);
  }

  @Public()
  @Delete(':token/:templateName')
  @ApiOperation({ summary: 'Deletar template' })
  @ApiResponse({ status: 200, description: 'Template deletado' })
  @ApiResponse({ status: 404, description: 'Template não encontrado' })
  async deleteTemplate(
    @Param('token') token: string,
    @Param('templateName') templateName: string,
  ) {
    return this.templatesService.deleteTemplate(token, templateName);
  }

  @Public()
  @Post(':token/refresh')
  @ApiOperation({ summary: 'Atualizar cache de templates' })
  @ApiResponse({ status: 200, description: 'Cache atualizado' })
  async refreshTemplates(@Param('token') token: string) {
    return this.templatesService.refreshTemplates(token);
  }
}
