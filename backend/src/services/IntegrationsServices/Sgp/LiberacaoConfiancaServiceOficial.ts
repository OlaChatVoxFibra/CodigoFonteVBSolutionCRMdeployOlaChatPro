/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import logger from "../../../utils/logger";
import Ticket from "../../../models/Ticket";
import SendWhatsAppOficialMessage from "../../WhatsAppOficial/SendWhatsAppOficialMessage";
import SendWhatsAppMessage from "../../WbotServices/SendWhatsAppMessage";
import SgpClient from "./SgpClient";

interface Request {
  queueIntegrationJson: any;
  ticket: Ticket;
  cpfcnpj: string;
  senha?: string;
}

const normalizeCpfCnpj = (value: string) => String(value || "").replace(/\D/g, "").trim();

const LiberacaoConfiancaServiceOficial = async ({
  queueIntegrationJson,
  ticket,
  cpfcnpj,
  senha
}: Request): Promise<void> => {
  const sgpUrl = queueIntegrationJson?.sgpUrl || process.env.SGP_API_URL || "";
  const sgpIeSenha = String(queueIntegrationJson?.sgpIeSenha || "N").toUpperCase();
  const client = SgpClient.fromEnvOrConfig(sgpUrl);

  const cpf = normalizeCpfCnpj(cpfcnpj);

  try {
    const sendText = async (text: string) => {
      if (ticket?.channel === "whatsapp_oficial") {
        await SendWhatsAppOficialMessage({ body: text, ticket, type: "text", quotedMsg: null, media: null, vCard: null });
      } else {
        await SendWhatsAppMessage({ body: text, ticket });
      }
    };

    await sendText("Aguarde! Estou verificando a possibilidade de liberação por confiança...");

    const contratosResp = await client.obtemContrato(cpf, sgpIeSenha === "S" ? senha : undefined);
    if (!contratosResp || contratosResp?.auth === false) {
      await sendText("Não foi possível localizar seu contrato. Verifique os dados e tente novamente.");
      return;
    }

    const contratos = (contratosResp.contratos || []).filter(c => String(c.situacao || "").toUpperCase() !== "CANCELADO");
    if (!contratos.length) {
      await sendText("Nenhum contrato ativo foi localizado para este CPF/CNPJ.");
      return;
    }

    const contratoCodigo = contratos[0].contrato;

    const libera = await client.liberaCliente(cpf, sgpIeSenha === "S" ? senha : undefined, contratoCodigo);
    if (!libera) {
      await sendText("Não foi possível realizar a liberação por confiança.");
      return;
    }

    const msg = libera.msg || libera.message || "Solicitação processada.";
    await sendText(msg);
  } catch (err) {
    logger.error({ err }, "Erro em LiberacaoConfiancaServiceOficial");
    const fallback = "Ocorreu um erro ao processar a liberação. Tente novamente em instantes.";
    if (ticket?.channel === "whatsapp_oficial") {
      await SendWhatsAppOficialMessage({ body: fallback, ticket, type: "text", quotedMsg: null, media: null, vCard: null });
    } else {
      await SendWhatsAppMessage({ body: fallback, ticket });
    }
  }
}

export default LiberacaoConfiancaServiceOficial;
