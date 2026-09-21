/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppError } from '../errors/app.error';
import { PrismaClientUnknownRequestError } from '@prisma/client/runtime/library';

@Catch(Error)
export class ErrorExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorExceptionFilter.name);
  catch(exception: AppError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = exception?.code ?? HttpStatus.BAD_REQUEST;
    const payload = {
      status: status,
      timestamp: new Date().toISOString(),
      message: exception.message,
      path: request.url,
    };

    if (exception instanceof PrismaClientUnknownRequestError) {
      this.logger.error(`Stack Error - ${exception.message}`);
      payload.message = `Erro desconhecido do Banco de Dados.`;
    }

    if (exception instanceof HttpException) {
      const error = exception.getResponse() as any;

      payload.message = error.message;
      status = exception.getStatus();
    }

    response.status(status).send(payload);
  }
}
