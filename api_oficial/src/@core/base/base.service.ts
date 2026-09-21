/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Logger } from '@nestjs/common';
import { PrismaService } from '../infra/database/prisma.service';
import { FindOperator } from '../common/utils/FindOperator';
import { AppError } from '../infra/errors/app.error';

export class BaseService<T> {
  entity: string;
  prisma: PrismaService;
  logger: Logger;

  constructor(entity: string, name_service: string) {
    this.entity = entity;
    this.checkInstance();
    this.logger = new Logger(`${BaseService.name} - ${name_service}`);
  }

  private checkInstance() {
    if (!this.prisma) {
      this.prisma = new PrismaService();
    }
  }

  async create(data: any): Promise<T> {
    try {
      if (!data) throw new Error('Data not found');
      return this.prisma[this.entity].create({ data });
    } catch (error: any) {
      this.logger.error(error.message);
      throw new AppError(error.message);
    }
  }

  async all(): Promise<Array<T>> {
    try {
      return this.prisma[this.entity].findMany();
    } catch (error: any) {
      this.logger.error(error.message);
      throw new AppError(error.message);
    }
  }

  async one(id: number): Promise<T> {
    try {
      if (!id) throw new Error('Is necessary to send the id');
      return this.prisma[this.entity].findUnique({ where: { id } });
    } catch (error: any) {
      this.logger.error(error.message);
      throw new AppError(error.message);
    }
  }

  async findWith(operator: FindOperator): Promise<Array<T>> {
    try {
      return await this.prisma[this.entity].findMany(operator);
    } catch (error: any) {
      this.logger.error(error.message);
      throw new AppError(error.message);
    }
  }

  async findWithOne(operator: FindOperator): Promise<T> {
    try {
      return await this.prisma[this.entity].findFirst(operator);
    } catch (error: any) {
      this.logger.error(error.message);
      throw new AppError(error.message);
    }
  }

  async update(id: number, data: T): Promise<T> {
    try {
      if (!id) throw new Error('Id not found');
      if (JSON.stringify(data) === '{}') throw new Error('Data not found');
      return await this.prisma[this.entity].update({ where: { id }, data });
    } catch (error: any) {
      this.logger.error(error.message);
      throw new AppError(error.message);
    }
  }

  async delete(id: number): Promise<T> {
    try {
      if (!id) throw new Error('Id not found');
      return await this.prisma[this.entity].delete({ where: { id } });
    } catch (error: any) {
      this.logger.error(error.message);
      throw new AppError(error.message);
    }
  }
}
