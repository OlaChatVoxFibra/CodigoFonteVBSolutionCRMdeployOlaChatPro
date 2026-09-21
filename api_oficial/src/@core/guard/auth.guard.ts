/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './auth.decorator';
import { Reflector } from '@nestjs/core';
import { AppError } from 'src/@core/infra/errors/app.error';
import { CompaniesService } from 'src/resources/v1/companies/companies.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private companyService: CompaniesService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new AppError('Não autorizado', HttpStatus.UNAUTHORIZED);
    }
    try {
      const tokenAdmin = process.env.TOKEN_ADMIN;

      if (token != tokenAdmin)
        throw new AppError('Não autorizado', HttpStatus.UNAUTHORIZED);
    } catch {
      throw new AppError('Não autorizado', HttpStatus.UNAUTHORIZED);
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
