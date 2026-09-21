/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateWhatsappOficialDto } from './dto/create-whatsapp-oficial.dto';
import { UpdateWhatsappOficialDto } from './dto/update-whatsapp-oficial.dto';
import { BaseService } from 'src/@core/base/base.service';
import { WhatsAppOficial } from 'src/@core/domain/entities/whatsappOficial.model';
import { AppError } from 'src/@core/infra/errors/app.error';

@Injectable()
export class WhatsappOficialService extends BaseService<WhatsAppOficial> {
  logger: Logger = new Logger(`${WhatsappOficialService.name}`);
  private readonly apiUrl: string;

  constructor(private readonly configService: ConfigService) {
    super('whatsappOficial', WhatsappOficialService.name);
    this.apiUrl = this.configService.get<string>('API_URL') || process.env.API_URL || '';
  }

  /**
   * Gera a URL do webhook para uma conexão
   */
  private generateWebhookUrl(companyId: number, conexaoId: number): string {
    if (!this.apiUrl) {
      return null;
    }
    const baseUrl = this.apiUrl.replace(/\/$/, ''); // Remove trailing slash
    return `${baseUrl}/v1/webhook/${companyId}/${conexaoId}`;
  }

  /**
   * Adiciona webhook_url ao objeto de retorno
   */
  private addWebhookUrl(whats: any): any {
    if (!whats) return whats;
    return {
      ...whats,
      webhook_url: this.generateWebhookUrl(whats.companyId, whats.id),
    };
  }

  async oneWhatAppOficial(id: number) {
    try {
      const whats = await this.prisma.whatsappOficial.findUnique({
        where: { id, deleted_at: null },
      });
      if (!whats) throw new Error('Configuração do whats não encontrada');
      return this.addWebhookUrl(whats);
    } catch (error: any) {
      this.logger.error(`oneWhatAppOficial - ${error.message}`);
      throw new AppError(error.message);
    }
  }

  async allWhatsAppOficial() {
    try {
      const company = await this.prisma.company.findFirst({
        where: { deleted_at: null },
      });
      if (!company) throw new Error('Empresa não encontrada');
      const list = await this.prisma.whatsappOficial.findMany({
        where: { companyId: company.id, deleted_at: null },
      });
      return list.map(item => this.addWebhookUrl(item));
    } catch (error: any) {
      this.logger.error(`allWhatsAppOficial - ${error.message}`);
      throw new AppError(error.message);
    }
  }

  async createWhatsAppOficial(data: CreateWhatsappOficialDto): Promise<any> {
    try {
      const company = await this.prisma.company.findFirst({
        where: { idEmpresaMult100: data.idEmpresaMult100, deleted_at: null },
      });
      if (!company) throw new Error('Empresa não encontrada');

      const exist = await this.prisma.whatsappOficial.findUnique({
        where: { token_mult100: data.token_mult100 },
      });
      if (!!exist) throw new Error('Já existe esse token cadastrado');

      delete data.idEmpresaMult100;

      const whats: WhatsAppOficial = {
        ...data,
        companyId: company.id,
        token_mult100: data.token_mult100,
      };

      const created = await this.prisma.whatsappOficial.create({ data: whats });
      return this.addWebhookUrl(created);
    } catch (error: any) {
      this.logger.error(`createWhatsAppOficial - ${error.message}`);
      throw new AppError(error.message);
    }
  }

  async updateWhatsAppOficial(id: number, data: UpdateWhatsappOficialDto): Promise<any> {
    try {
      const whats = await this.prisma.whatsappOficial.findUnique({
        where: { id, deleted_at: null },
      });
      if (!whats) throw new Error('Configuração do whats não encontrada');

      const company = await this.prisma.company.findFirst({
        where: { deleted_at: null },
      });
      if (!company) throw new Error('Empresa não encontrada');

      delete data.idEmpresaMult100;
      const updated = await this.prisma.whatsappOficial.update({
        where: { id },
        data: data,
      });
      return this.addWebhookUrl(updated);
    } catch (error: any) {
      this.logger.error(`updateWhatsAppOficial - ${error.message}`);
      throw new AppError(error.message);
    }
  }

  async deleteWhatsAppOficial(id: number): Promise<WhatsAppOficial> {
    try {
      const whats = await this.prisma.whatsappOficial.findUnique({
        where: { id, deleted_at: null },
      });
      if (!whats) throw new Error('Configuração do whats não encontrada');

      return await this.prisma.whatsappOficial.update({
        where: { id },
        data: { deleted_at: new Date() },
      });
    } catch (error: any) {
      this.logger.error(`deleteWhatsAppOficial - ${error.message}`);
      throw new AppError(error.message);
    }
  }
}
