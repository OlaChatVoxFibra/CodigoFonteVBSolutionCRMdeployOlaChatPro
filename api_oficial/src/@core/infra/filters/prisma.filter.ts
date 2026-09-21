/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { ArgumentsHost, Catch, HttpStatus, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClienteExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(PrismaClienteExceptionFilter.name);
  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const meta = exception.meta.target;

    switch (exception.code) {
      case 'P1016': {
        const status = HttpStatus.NOT_ACCEPTABLE;
        response.status(status).json({
          status: status,
          timestamp: new Date().toISOString(),
          message: `The provide value for the column is too long for column's type`,
          path: request.url,
        });
        this.logger.error(`Stack Error - ${exception.message}`);
        break;
      }
      case 'P2000': {
        const status = HttpStatus.NOT_ACCEPTABLE;
        response.status(status).json({
          status: status,
          timestamp: new Date().toISOString(),
          message: `The provide value for the column is too long for column's type`,
          path: request.url,
        });
        this.logger.error(`Stack Error - ${exception.message}`);
        break;
      }
      case 'P2001': {
        const status = HttpStatus.NOT_FOUND;
        response.status(status).json({
          status: status,
          timestamp: new Date().toISOString(),
          message: `The document in condition where does not exist`,
          path: request.url,
        });
        this.logger.error(`Stack Error - ${exception.message}`);
        break;
      }

      case 'P2002': {
        const status = HttpStatus.CONFLICT;
        response.status(status).json({
          status: status,
          timestamp: new Date().toISOString(),
          message: `O registro de ${meta} é uma constante e não pode ser alterado e nem duplicado.`,
          path: request.url,
        });
        this.logger.error(`Stack Error - ${exception.message}`);
        break;
      }

      case 'P2003': {
        const status = HttpStatus.FORBIDDEN;
        response.status(status).json({
          status: status,
          timestamp: new Date().toISOString(),
          message: `Foreign key constraint failed on the field ${meta}`,
          path: request.url,
        });
        this.logger.error(`Stack Error - ${exception.message}`);
        break;
      }

      case 'P2004': {
        const status = HttpStatus.FAILED_DEPENDENCY;
        response.status(status).json({
          status: status,
          timestamp: new Date().toISOString(),
          message: `A constraint failed on the database: ${meta}`,
          path: request.url,
        });
        this.logger.error(`Stack Error - ${exception.message}`);
        break;
      }

      case 'P2005': {
        const status = HttpStatus.NOT_ACCEPTABLE;
        response.status(status).json({
          status: status,
          timestamp: new Date().toISOString(),
          message: `The value of field value is invalid for the fields type: ${meta}`,
          path: request.url,
        });
        this.logger.error(`Stack Error - ${exception.message}`);
        break;
      }

      default:
        const status = HttpStatus.BAD_REQUEST;
        response.status(status).json({
          status: status,
          timestamp: new Date().toISOString(),
          message: `Erro ao tentar ler o banco de dados`,
          path: request.url,
        });
        this.logger.error(`Stack Error - ${exception.message}`);
        break;
    }
  }
}
