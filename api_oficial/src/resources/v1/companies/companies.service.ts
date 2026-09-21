/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { PrismaService } from 'src/@core/infra/database/prisma.service';
import { AppError } from 'src/@core/infra/errors/app.error';

@Injectable()
export class CompaniesService {
  logger: Logger = new Logger(`${CompaniesService.name}`);

  constructor(public readonly prisma: PrismaService) {}

  async one(id: number) {
    try {
      if (!id) throw new Error('Necessário informar o id');
      const company = await this.prisma.company.findUnique({ where: { id } });
      if (!company) throw new Error('Empresa não encontrada');
      return company;
    } catch (error: any) {
      this.logger.error(`one - ${error.message}`);
      throw new AppError(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  async all() {
    try {
      return await this.prisma.company.findMany();
    } catch (error: any) {
      this.logger.error(`all - ${error.message}`);
      throw new AppError(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  async create(dto: CreateCompanyDto) {
    try {
      const findedCompany = await this.prisma.company.findUnique({
        where: { idEmpresaMult100: dto.idEmpresaMult100 },
      });
      if (!!findedCompany)
        throw new Error('Já existe uma empresa com este id cadastrada');
      return await this.prisma.company.create({
        data: { name: dto.name, idEmpresaMult100: dto.idEmpresaMult100 },
      });
    } catch (error: any) {
      this.logger.error(`create - ${error.message}`);
      throw new AppError(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  async update(id: number, dto: UpdateCompanyDto) {
    try {
      const company = await this.prisma.company.findUnique({ where: { id } });
      if (!!company) throw new Error('Empresa não encontrada');
      return await this.prisma.company.update({
        where: { id },
        data: { name: dto.name },
      });
    } catch (error: any) {
      this.logger.error(`update - ${error.message}`);
      throw new AppError(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
