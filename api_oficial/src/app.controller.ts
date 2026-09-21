/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './@core/guard/auth.decorator';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller()
@ApiTags('API')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar Usuários' })
  @ApiResponse({
    status: 200,
    description: 'Retorna se a API está online e o horario atual',
  })
  getStatusServer(): string {
    return this.appService.getStatusServer();
  }
}
