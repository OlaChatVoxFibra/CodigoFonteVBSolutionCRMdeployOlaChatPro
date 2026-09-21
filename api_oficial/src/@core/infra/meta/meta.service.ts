/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  IBodyReadMessage,
  IMetaMessage,
  IResultTemplates,
  IReturnAuthMeta,
  IReturnMessageFile,
  IReturnMessageMeta,
} from './interfaces/IMeta.interfaces';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { convertMimeTypeToExtension } from '../../common/utils/convertMimeTypeToExtension';
import axios from 'axios';
import { lookup } from 'mime-types';
import { deleteFile } from '../../common/utils/files.utils';

@Injectable()
export class MetaService {
  private readonly logger: Logger = new Logger(`${MetaService.name}`);
  urlMeta = `https://graph.facebook.com/v20.0`;
  path = `./public`;

  constructor() {}

  async send<T>(url: string, token: string, existFile: boolean = false): Promise<T | any> {
    const headers = {
      'Content-Type': !!existFile ? 'arraybuffer' : 'application/json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'curl/7.64.1',
    };

    const res = await fetch(url, { method: 'GET', headers });

    if (!!existFile) {
      return await res.json();
    } else {
      return (await res.json()) as T;
    }
  }

  async authFileMeta(idMessage: string, phone_number_id: string, token: string): Promise<IReturnAuthMeta> {
    try {
      const url = `https://graph.facebook.com/v20.0/${idMessage}?phone_number_id=${phone_number_id}`;
      return await this.send<IReturnAuthMeta>(url, token);
    } catch (error: any) {
      this.logger.error(`authDownloadFile - ${error.message}`);
      throw Error('Erro ao converter o arquivo');
    }
  }

  async downloadFileMeta(
    idMessage: string,
    phone_number_id: string,
    token: string,
    companyId: number,
    conexao: number,
  ): Promise<{ base64: string; mimeType: string }> {
    try {
      const auth = await this.authFileMeta(idMessage, phone_number_id, token);

      if (!existsSync(this.path)) mkdirSync(this.path);
      if (!existsSync(`${this.path}/${companyId}`)) mkdirSync(`${this.path}/${companyId}`);
      if (!existsSync(`${this.path}/${companyId}/${conexao}`)) mkdirSync(`${this.path}/${companyId}/${conexao}`);

      const pathFile = `${this.path}/${companyId}/${conexao}`;
      const mimeType = convertMimeTypeToExtension(auth.mime_type);

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'curl/7.64.1',
      };

      const result = await axios.get(auth.url, { headers, responseType: 'arraybuffer' });

      if (result.status != 200) throw new Error('Falha em baixar o arquivo da meta');

      const base64 = result.data.toString('base64');
      writeFileSync(`${pathFile}/${idMessage}.${mimeType}`, result.data);

      return { base64, mimeType: auth.mime_type };
    } catch (error: any) {
      this.logger.error(`downloadFileMeta - ${error.message}`);
      throw Error('Erro ao converter o arquivo');
    }
  }

  // Alias para compatibilidade
  async downloadMedia(mediaId: string, token: string): Promise<{ base64: string; mimeType: string }> {
    try {
      const auth = await this.send<IReturnAuthMeta>(`${this.urlMeta}/${mediaId}`, token);

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'curl/7.64.1',
      };

      const result = await axios.get(auth.url, { headers, responseType: 'arraybuffer' });

      if (result.status != 200) throw new Error('Falha em baixar o arquivo da meta');

      const base64 = result.data.toString('base64');

      return { base64, mimeType: auth.mime_type };
    } catch (error: any) {
      this.logger.error(`downloadMedia - ${error.message}`);
      throw Error('Erro ao baixar mídia');
    }
  }

  async sendFileToMeta(numberId: string, token: string, pathFile: string): Promise<IReturnMessageFile | null> {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const formData = new FormData();
      const file = readFileSync(pathFile);
      const mimeType = lookup(pathFile);
      if (!mimeType) throw new Error('Could not determine the MIME type of the file.');

      const blob = new Blob([file], { type: mimeType });
      formData.append('messaging_product', 'whatsapp');
      formData.append('type', mimeType);
      formData.append('file', blob);

      const result = await fetch(`${this.urlMeta}/${numberId}/media`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (result.status != 200) throw new Error('Falha em baixar o arquivo da meta');

      return (await result.json()) as IReturnMessageFile;
    } catch (error: any) {
      deleteFile(pathFile);
      this.logger.error(`sendFileToMeta - ${error.message}`);
      throw Error('Erro ao enviar o arquivo para a meta');
    }
  }

  // Alias para upload de mídia via Multer file
  async uploadMedia(numberId: string, token: string, file: Express.Multer.File): Promise<IReturnMessageFile> {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const formData = new FormData();

      // Converter Buffer para Uint8Array para compatibilidade com Blob
      const uint8Array = new Uint8Array(file.buffer);
      const blob = new Blob([uint8Array], { type: file.mimetype });
      formData.append('messaging_product', 'whatsapp');
      formData.append('type', file.mimetype);
      formData.append('file', blob, file.originalname);

      const result = await fetch(`${this.urlMeta}/${numberId}/media`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (result.status != 200) {
        const error = await result.json();
        throw new Error(error?.error?.message || 'Falha no upload');
      }

      return (await result.json()) as IReturnMessageFile;
    } catch (error: any) {
      this.logger.error(`uploadMedia - ${error.message}`);
      throw Error('Erro ao fazer upload da mídia');
    }
  }

  async sendMessage(numberId: string, token: string, message: IMetaMessage) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const result = await fetch(`${this.urlMeta}/${numberId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify(message),
      });

      if (result.status != 200) {
        const resultError = await result.json();
        const errMsg = resultError?.error?.message || 'Falha ao enviar mensagem para a meta';
        throw new Error(errMsg);
      }

      return (await result.json()) as IReturnMessageMeta;
    } catch (error: any) {
      this.logger.error(`sendMessage - ${error.message}`);
      throw new Error(error?.message || 'Erro ao enviar a mensagem');
    }
  }

  async getListTemplates(wabaId: string, token: string) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const result = await fetch(`${this.urlMeta}/${wabaId}/message_templates`, { method: 'GET', headers });

      if (result.status != 200) {
        const resultError = await result.json();
        throw new Error(resultError.error.message || 'Falha ao buscar templates');
      }

      return (await result.json()) as IResultTemplates;
    } catch (error: any) {
      this.logger.error(`getListTemplates - ${error.message}`);
      throw Error('Erro ao buscar templates');
    }
  }

  // Alias para compatibilidade
  async getTemplates(wabaId: string, token: string) {
    return this.getListTemplates(wabaId, token);
  }

  async sendReadMessage(numberId: string, token: string, data: IBodyReadMessage) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const result = await fetch(`${this.urlMeta}/${numberId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      if (result.status != 200) {
        const resultError = await result.json();
        throw new Error(resultError.error.message || 'Falha ao marcar como lida');
      }

      return (await result.json()) as IResultTemplates;
    } catch (error: any) {
      this.logger.error(`sendReadMessage - ${error.message}`);
      throw Error('Erro ao marcar a mensagem como lida');
    }
  }

  // Alias para marcar como lida
  async markAsRead(numberId: string, messageId: string, token: string) {
    return this.sendReadMessage(numberId, token, {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    });
  }

  async createTemplate(wabaId: string, token: string, payload: any) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const result = await fetch(`${this.urlMeta}/${wabaId}/message_templates`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (![200, 201].includes(result.status)) {
        const resultError = await result.json();
        throw new Error(resultError.error?.message || 'Falha ao criar template na Meta');
      }

      return await result.json();
    } catch (error: any) {
      this.logger.error(`createTemplate - ${error.message}`);
      throw Error('Erro ao criar o template na Meta');
    }
  }

  async deleteTemplate(wabaId: string, token: string, templateName: string) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const result = await fetch(`${this.urlMeta}/${wabaId}/message_templates?name=${templateName}`, {
        method: 'DELETE',
        headers,
      });

      if (result.status != 200) {
        const resultError = await result.json();
        throw new Error(resultError.error?.message || 'Falha ao deletar template na Meta');
      }

      return await result.json();
    } catch (error: any) {
      this.logger.error(`deleteTemplate - ${error.message}`);
      throw Error('Erro ao deletar o template na Meta');
    }
  }
}
