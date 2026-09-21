/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../@core/infra/database/prisma.service';
import { MetaService } from '../../../@core/infra/meta/meta.service';
import { RedisService } from '../../../@core/infra/redis/RedisService.service';

@Injectable()
export class TemplatesWhatsappService {
  private readonly logger = new Logger(TemplatesWhatsappService.name);
  private readonly CACHE_TTL = 3600; // 1 hora

  constructor(
    private readonly prisma: PrismaService,
    private readonly metaService: MetaService,
    private readonly redis: RedisService,
  ) {}

  async listTemplates(token: string) {
    this.logger.log('Listando templates');

    const conexao = await this.getConexaoByToken(token);

    // Tentar buscar do cache
    const cacheKey = `templates:${conexao.waba_id}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      this.logger.log('Templates retornados do cache');
      return JSON.parse(cached);
    }

    try {
      const templates = await this.metaService.getTemplates(
        conexao.waba_id,
        conexao.send_token,
      );

      // Salvar no cache
      await this.redis.set(cacheKey, JSON.stringify(templates), this.CACHE_TTL);

      return templates;
    } catch (error) {
      this.logger.error(`Erro ao listar templates: ${error.message}`);
      throw new BadRequestException(`Erro ao listar templates: ${error.message}`);
    }
  }

  async getTemplate(token: string, templateName: string) {
    this.logger.log(`Buscando template: ${templateName}`);

    const conexao = await this.getConexaoByToken(token);

    try {
      const templates = await this.listTemplates(token);
      const template = templates.data?.find((t: any) => t.name === templateName);

      if (!template) {
        throw new NotFoundException(`Template '${templateName}' não encontrado`);
      }

      return template;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Erro ao buscar template: ${error.message}`);
      throw new BadRequestException(`Erro ao buscar template: ${error.message}`);
    }
  }

  async createTemplate(token: string, templateData: any) {
    this.logger.log(`Criando template: ${templateData.name}`);

    const conexao = await this.getConexaoByToken(token);

    try {
      const result = await this.metaService.createTemplate(
        conexao.waba_id,
        conexao.send_token,
        templateData,
      );

      // Invalidar cache
      await this.redis.del(`templates:${conexao.waba_id}`);

      return result;
    } catch (error) {
      this.logger.error(`Erro ao criar template: ${error.message}`);
      throw new BadRequestException(`Erro ao criar template: ${error.message}`);
    }
  }

  async deleteTemplate(token: string, templateName: string) {
    this.logger.log(`Deletando template: ${templateName}`);

    const conexao = await this.getConexaoByToken(token);

    try {
      const result = await this.metaService.deleteTemplate(
        conexao.waba_id,
        conexao.send_token,
        templateName,
      );

      // Invalidar cache
      await this.redis.del(`templates:${conexao.waba_id}`);

      return result;
    } catch (error) {
      this.logger.error(`Erro ao deletar template: ${error.message}`);
      throw new BadRequestException(`Erro ao deletar template: ${error.message}`);
    }
  }

  async refreshTemplates(token: string) {
    this.logger.log('Atualizando cache de templates');

    const conexao = await this.getConexaoByToken(token);

    // Invalidar cache
    await this.redis.del(`templates:${conexao.waba_id}`);

    // Buscar novamente
    return this.listTemplates(token);
  }

  private async getConexaoByToken(token: string) {
    const conexao = await this.prisma.whatsappOficial.findFirst({
      where: { token_mult100: token },
    });

    if (!conexao) {
      throw new NotFoundException('Conexão não encontrada para o token informado');
    }

    return conexao;
  }
}
