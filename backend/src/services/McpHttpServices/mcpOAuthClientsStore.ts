/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import type {
  OAuthClientInformationFull,
  OAuthClientMetadata
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import { randomUUID } from "crypto";
import {
  mcpOAuthStoreGet,
  mcpOAuthStoreSet
} from "./mcpOAuthStore";

const CLIENT_TTL_SEC = 30 * 24 * 60 * 60;
const clientsMemory = new Map<string, OAuthClientInformationFull>();

export class McpOAuthClientsStore implements OAuthRegisteredClientsStore {
  async getClient(
    clientId: string
  ): Promise<OAuthClientInformationFull | undefined> {
    const fromRedis = await mcpOAuthStoreGet(`client:${clientId}`);
    if (fromRedis) {
      try {
        return JSON.parse(fromRedis) as OAuthClientInformationFull;
      } catch {
        return undefined;
      }
    }
    return clientsMemory.get(clientId);
  }

  async registerClient(
    clientMetadata: OAuthClientMetadata
  ): Promise<OAuthClientInformationFull> {
    const clientId =
      (clientMetadata as { client_id?: string }).client_id || randomUUID();
    const full: OAuthClientInformationFull = {
      ...clientMetadata,
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000)
    };
    clientsMemory.set(clientId, full);
    await mcpOAuthStoreSet(
      `client:${clientId}`,
      JSON.stringify(full),
      CLIENT_TTL_SEC
    );
    return full;
  }
}
