/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import {
  IReceivedWhatsppOficial,
  IReceivedWhatsppOficialRead,
} from 'src/@core/interfaces/IWebsocket.interface';

@Injectable()
export class SocketService implements OnModuleDestroy {
  private connections: Map<number, Socket> = new Map();
  private url: string;
  private logger: Logger = new Logger(`${SocketService.name}`);

  constructor() {
    this.url = process.env.URL_BACKEND_MULT100;
    if (!this.url) {
      this.logger.error('Nenhuma configuração do url do backend');
    }
  }

  onModuleDestroy() {
    this.logger.log('Desconectando todos os sockets...');
    this.connections.forEach((socket, id) => {
      this.logger.log(`Desconectando socket da empresa ${id}`);
      socket.disconnect();
    });
    this.connections.clear();
  }

  private async getSocket(id: number): Promise<Socket> {
    if (this.connections.has(id)) {
      const existingSocket = this.connections.get(id);
      if (existingSocket.connected) {
        return existingSocket;
      }
      existingSocket.disconnect();
      this.connections.delete(id);
    }

    if (!this.url) {
      throw new Error('URL do backend não configurada');
    }

    const newSocket = io(`${this.url}/${id}`, {
      query: {
        token: `Bearer ${process.env.TOKEN_ADMIN || ''}`,
      },
      reconnection: true,
      transports: ['websocket', 'polling'],
    });

    this.setupSocketEvents(newSocket, id);
    this.connections.set(id, newSocket);

    return new Promise((resolve, reject) => {
      newSocket.on('connect', () => {
        this.logger.log(
          `Conectado ao websocket do servidor ${this.url}/${id}`,
        );
        resolve(newSocket);
      });

      newSocket.on('connect_error', (error) => {
        this.logger.error(
          `Erro de conexão para empresa ${id}: ${error.message}`,
        );
        this.connections.delete(id);
        reject(error);
      });
    });
  }

  async sendMessage(data: IReceivedWhatsppOficial) {
    try {
      this.logger.warn(
        `Obtendo/conectando ao websocket da empresa ${data.companyId}`,
      );
      const socket = await this.getSocket(data.companyId);
      this.logger.warn(
        `Enviando mensagem para o websocket para a empresa ${data.companyId}`,
      );
      socket.emit('receivedMessageWhatsAppOficial', data);
    } catch (error: any) {
      this.logger.error(
        `Falha ao obter socket ou enviar mensagem: ${error.message}`,
      );
    }
  }

  async readMessage(data: IReceivedWhatsppOficialRead) {
    try {
      this.logger.warn(
        `Obtendo/conectando ao websocket da empresa ${data.companyId}`,
      );
      const socket = await this.getSocket(data.companyId);
      this.logger.warn(
        `Enviando 'read' para o websocket para a empresa ${data.companyId}`,
      );
      socket.emit('readMessageWhatsAppOficial', data);
    } catch (error: any) {
      this.logger.error(
        `Falha ao obter socket ou enviar 'read': ${error.message}`,
      );
    }
  }

  private setupSocketEvents(socket: Socket, id: number): void {
    socket.on('disconnect', (reason) => {
      this.logger.error(
        `Desconectado do websocket (Empresa ${id}). Razão: ${reason}`,
      );
      this.connections.delete(id);
    });
  }

  async emit(event: string, data: any): Promise<void> {
    try {
      const companyId = data?.data?.companyId || data?.companyId;
      if (!companyId) {
        this.logger.warn('CompanyId não encontrado nos dados');
        return;
      }

      this.logger.log(`Emitindo evento ${event} para empresa ${companyId}`);
      const socket = await this.getSocket(companyId);
      socket.emit(event, data);
    } catch (error: any) {
      this.logger.error(`Falha ao emitir evento ${event}: ${error.message}`);
    }
  }
}
