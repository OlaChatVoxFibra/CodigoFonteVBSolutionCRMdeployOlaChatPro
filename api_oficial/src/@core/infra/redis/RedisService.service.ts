/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  private client: Redis;
  private logger: Logger = new Logger('RedisServer');

  constructor() {
    this.logger.log('🔄 Iniciando conexão com Redis...');
    try {
      this.client = new Redis(process.env.REDIS_URI);
      this.logger.log(`📡 Conexão com Redis estabelecida com sucesso`);
    } catch (error) {
      this.logger.error(`❌ Erro ao conectar com Redis: ${error}`);
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async del(key: string): Promise<number> {
    return await this.client.del(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  async quit(): Promise<void> {
    try {
      await this.client.quit();
      this.logger.log('👋 Conexão com Redis encerrada com sucesso');
    } catch (error) {
      this.logger.error(`❌ Erro ao encerrar conexão com Redis: ${error}`);
    }
  }
}
