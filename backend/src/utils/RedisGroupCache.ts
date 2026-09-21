/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { redisClient } from '../libs/redisClient';
import { getWbot, internalIsJidGroup } from '../libs/wbot';
import logger from './logger';

class RedisGroupCache {
  private readonly prefix: string = 'group:metadata:';
  private readonly defaultTTL: number = 604800; // 7 dias em segundos

  private getKey(connectionId: number, groupJid: string): string {
    // Formato: group:metadata:CONNECTION_ID:GROUP_JID
    return `${this.prefix}${connectionId}:${groupJid}`;
  }

  async set(connectionId: number, groupJid: string, value: any, ttl: number = this.defaultTTL): Promise<void> {
    try {
      const key = this.getKey(connectionId, groupJid);
      const data = {
        timestamp: Date.now(),
        data: value
      };

      await redisClient.setex(
        key,
        ttl,
        JSON.stringify(data)
      );
    } catch (error) {
      logger.error(`Erro ao salvar no cache do grupo ${groupJid}: ${error}`);
    }
  }

  async del(connectionId: number, groupJid: string): Promise<void> {
    try {
      const key = this.getKey(connectionId, groupJid);
      await redisClient.del(key);
    } catch (error) {
      logger.error(`Erro ao deletar cache do grupo ${groupJid}: ${error}`);
    }
  }

  async get(connectionId: number, groupJid: string): Promise<any> {
    try {
      const key = this.getKey(connectionId, groupJid);
      const data = await redisClient.get(key);

      if (!data) return null;

      return JSON.parse(data);
    } catch (error) {
      logger.error(`Erro ao buscar cache do grupo ${groupJid}: ${error}`);
      return null;
    }
  }

  async has(connectionId: number, groupJid: string): Promise<boolean> {
    const key = this.getKey(connectionId, groupJid);
    return (await redisClient.exists(key)) === 1;
  }

  async delete(connectionId: number, groupJid: string): Promise<void> {
    const key = this.getKey(connectionId, groupJid);
    await redisClient.del(key);
  }

  async getMemoryStats(): Promise<any> {
    const info = await redisClient.info('memory');
    return info;
  }
}

// Instância singleton do cache
export const redisGroupCache = new RedisGroupCache();

// Classe para gerenciar a fila de atualizações de metadata
class GroupMetadataQueue {
  private queue: Array<{ connectionId: number; groupJid: string }> = [];
  private processing: boolean = false;
  private readonly delay: number = Math.floor(Math.random() * (10000 - 2000) + 2000); // Delay aleatório entre 2 e 10 segundos

  async add(connectionId: number, groupJid: string): Promise<void> {
    this.queue.push({ connectionId, groupJid });
    if (!this.processing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const { connectionId, groupJid } = this.queue.shift()!;

    try {
      const wbot = await getWbot(connectionId);
      const meta = await wbot.groupMetadata(groupJid);
      await redisGroupCache.set(connectionId, groupJid, meta);
      logger.info(`Metadata do grupo ${groupJid} atualizada com sucesso`);
    } catch (error) {
      logger.error(`Erro ao processar metadata do grupo ${groupJid}: ${JSON.stringify(error)}`);
    }

    // Aguarda o delay antes de processar o próximo item
    setTimeout(() => this.processQueue(), this.delay);
  }
}

// Instância singleton da fila
export const groupMetadataQueue = new GroupMetadataQueue();

// Funções de utilidade para metadata dos grupos
export const updateGroupMetadataCache = async (connectionId: number, groupJid: string) => {
  try {
    // Adiciona à fila ao invés de processar imediatamente
    await groupMetadataQueue.add(connectionId, groupJid);

    // Retorna os dados do cache atual enquanto aguarda a atualização
    const cached = await redisGroupCache.get(connectionId, groupJid);
    return cached?.data || null;
  } catch (error) {
    logger.error(`Erro ao adicionar à fila de atualização para o grupo ${groupJid}: ${error}`);
    throw error;
  }
};
export const groupMetadataCache = {
  set: async (groupJid: string, connectionId: number, value: any, ttl?: number) => {
    if (!internalIsJidGroup(groupJid)) {
      logger.warn(`JID não é de um grupo: ${groupJid}`);
      return null;
    }
    return await redisGroupCache.set(connectionId, groupJid, value, ttl);
  },
  get: async (groupJid: string, connectionId: number) => {
    return await getGroupMetadataCache(connectionId, groupJid);
  },
  has: async (groupJid: string, connectionId: number) => {
    if (!internalIsJidGroup(groupJid)) return false;
    const data = await getGroupMetadataCache(connectionId, groupJid);
    return data !== null;
  }
};

export const getGroupMetadataCache = async (connectionId: number, groupJid: string) => {
  if (!internalIsJidGroup(groupJid)) {
    logger.warn(`JID não é de um grupo: ${groupJid}`);
    return null;
  }

  try {
    const cached = await redisGroupCache.get(connectionId, groupJid);

    if (cached) {
      // Verifica se o cache está expirado (mais de 7 dias)
      if (Date.now() - cached.timestamp > 604800000) { // 7 dias em milissegundos
        logger.info(`Cache expirado para o grupo: ${groupJid}, atualizando...`);
        return await updateGroupMetadataCache(connectionId, groupJid);
      }
      return cached.data;
    }

    return await updateGroupMetadataCache(connectionId, groupJid);
  } catch (error) {
    logger.error(`Erro ao obter metadata do grupo ${groupJid}: ${JSON.stringify(error)}`);
    return null;
  }
};
