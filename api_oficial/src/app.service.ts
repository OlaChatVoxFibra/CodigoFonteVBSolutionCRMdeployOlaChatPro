/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatusServer(): string {
    const currentTime = new Date().toLocaleTimeString();
    return `API está online! | Horário atual: ${currentTime}`;
  }
}
