/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios, { AxiosError } from "axios";
import logger from "../../../utils/logger";

export interface SgpConfig {
  url: string;
}

// Interface atualizada para bater com os dados usados no código antigo
export interface SgpEndereco {
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
}

export interface SgpContrato {
  contrato: string;
  status?: string; // "Ativo", "Suspenso", etc.
  situacao?: string;
  nome?: string;
  razaosocial?: string;
  planointernet?: string;
  planointernet_valor?: string | number;
  endereco_instalacao?: SgpEndereco;
}

export interface SgpObtemContratoResponse {
  auth?: boolean;
  contratos?: SgpContrato[];
  message?: string;
}

export interface SgpSegundaViaItem {
  vencimento_original?: string;
  vencimento?: string;
  valor?: string | number;
  link?: string;
  linhadigitavel?: string;
  codigopix?: string;
  valor_original?: string | number;
}

export interface SgpSegundaViaResponse {
  auth?: boolean;
  boletos?: SgpSegundaViaItem[];
  links?: SgpSegundaViaItem[]; // Algumas versões da API retornam 'links'
  message?: string;
  // Alguns provedores trazem campos no topo do objeto
  codigopix?: string;
  linhadigitavel?: string;
  link?: string;
  vencimento_original?: string;
  valor_original?: string | number;
}

export interface SgpLiberacaoResponse {
  auth?: boolean;
  msg?: string;
  message?: string;
}

export class SgpClient {
  private baseUrl: string;

  constructor(config: SgpConfig) {
    this.baseUrl = config.url;
  }

  static fromEnvOrConfig(configUrl?: string): SgpClient {
    const url = configUrl || process.env.SGP_API_URL || "";
    if (!url) {
      logger.warn("SGP url not configured. Set SGP_API_URL or jsonContent.sgpUrl");
    }
    return new SgpClient({ url });
  }

  async obtemContrato(cpfcnpj: string, senha?: string): Promise<SgpObtemContratoResponse | null> {
    try {
      // Garante que se a senha for vazia, usa o CPF (comportamento padrão se não configurado o contrário no Service)
      const senhaToSend = (senha && String(senha).length > 0) ? senha : cpfcnpj;

      const dataD = JSON.stringify({
        cpfcnpj: `${cpfcnpj}`,
        senha: `${senhaToSend}`
      });

      const { data } = await axios.request({
        method: "POST",
        url: `${this.baseUrl}/api/central/contratos`,
        headers: { 'Content-Type': 'application/json' },
        data: dataD
      });
      return data as SgpObtemContratoResponse;
    } catch (error) {
      const err = error as AxiosError;
      logger.error({ err: err?.message, url: this.baseUrl }, "SGP obtemContrato error");
      return null;
    }
  }

  async obtemSegundaVia(cpfcnpj: string, senha: string | undefined, contrato: string): Promise<SgpSegundaViaResponse | null> {
    try {
      const senhaToSend = (senha && String(senha).length > 0) ? senha : cpfcnpj;
      const dataD = JSON.stringify({
        cpfcnpj: `${cpfcnpj}`,
        senha: `${senhaToSend}`,
        contrato: `${contrato}`
      });

      console.error(`cpfcnpj: ${cpfcnpj}, senha: ${senhaToSend}, contrato: ${contrato}`);

      const { data } = await axios.request({
        method: "POST",
        url: `${this.baseUrl}/api/central/fatura2via`,
        headers: { 'Content-Type': 'application/json' },
        data: dataD
      });
      return data as SgpSegundaViaResponse;
    } catch (error) {
      const err = error as AxiosError;
      logger.error({ err: err?.message, url: this.baseUrl }, "SGP obtemSegundaVia error");
      return null;
    }
  }

  async liberaCliente(cpfcnpj: string, senha: string | undefined, contrato: string): Promise<SgpLiberacaoResponse | null> {
    try {
      const senhaToSend = (senha && String(senha).length > 0) ? senha : cpfcnpj;
      const dataD = JSON.stringify({
        cpfcnpj: `${cpfcnpj}`,
        senha: `${senhaToSend}`,
        contrato: `${contrato}`
      });

      const { data } = await axios.request({
        method: "POST",
        url: `${this.baseUrl}/api/central/promessapagamento`,
        headers: { 'Content-Type': 'application/json' },
        data: dataD
      });
      return data as SgpLiberacaoResponse;
    } catch (error) {
      const err = error as AxiosError;
      logger.error({ err: err?.message, url: this.baseUrl }, "SGP liberaCliente error");
      return null;
    }
  }
}

export default SgpClient;
