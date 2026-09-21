/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import logger from "../../../utils/logger";
import Ticket from "../../../models/Ticket";
import SendWhatsAppOficialMessage from "../../WhatsAppOficial/SendWhatsAppOficialMessage";
import SendWhatsAppMessage from "../../WbotServices/SendWhatsAppMessage";
import SgpClient, { SgpSegundaViaItem } from "./SgpClient";
import {format, parseISO} from "date-fns";
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface Request {
  queueIntegrationJson: any;
  ticket: Ticket;
  cpfcnpj: string;
  senha?: string;
  contratoSelecionado?: string;
}

const normalizeCpfCnpj = (value: string) => String(value || "").replace(/\D/g, "").trim();

const formatCurrency = (valor?: string | number) => {
  if (valor === undefined || valor === null) return "";
  const num = typeof valor === "string" ? parseFloat(valor) : valor;
  if (isNaN(num)) return String(valor);
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const compareByDate = (a?: string, b?: string) => {
  const da = a ? new Date(a).getTime() : 0;
  const db = b ? new Date(b).getTime() : 0;
  return da - db;
}

const ObtemFaturaServiceOficial = async ({
  queueIntegrationJson,
  ticket,
  cpfcnpj,
  senha,
  contratoSelecionado
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

    await sendText("Aguarde! Estamos consultando seus boletos...");

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

    let contratoCodigo = contratoSelecionado;

    if (!contratoCodigo && contratos.length > 1) {
      const header = "Localizamos mais de um contrato ativo. Informe o código do contrato desejado:";
      await sendText(header);
      const list = contratos.map(c => `• Código: ${c.contrato} | Titular: ${c.nome || "-"} | Situação: ${c.situacao || "-"}`).join("\n");
      await sendText(list);

      const newData = {
        ...(ticket.dataWebhook || {}),
        sgp: {
          ...(ticket.dataWebhook?.sgp || {}),
          cpfUsuario: cpf,
          senhaUsuario: senha,
          doisContratos: true,
          aguardandoContrato: true
        }
      };
      await ticket.update({ dataWebhook: newData });
      return;
    }

    if (!contratoCodigo) {
      contratoCodigo = contratos[0].contrato;
    }

    const segundaVia = await client.obtemSegundaVia(cpf, sgpIeSenha === "S" ? senha : undefined, contratoCodigo);

    const itens: SgpSegundaViaItem[] = (segundaVia?.boletos && segundaVia.boletos.length > 0)
      ? (segundaVia.boletos as SgpSegundaViaItem[])
      : ((segundaVia?.links || []) as SgpSegundaViaItem[]);

    // Ordena por vencimento_original quando disponível
    itens.sort((a, b) => {
      const dataA = a?.vencimento_original ? new Date(a.vencimento_original).getTime() : 0;
      const dataB = b?.vencimento_original ? new Date(b.vencimento_original).getTime() : 0;
      return dataA - dataB;
    });

    if (itens.length > 0) {
      const headerMsg = `Segue a segunda via da(s) sua(s) fatura(s) vencida(s) ou a vencer. Verifique os dados e efetue o pagamento para manter seu serviço ativo ou reativar o seu serviço.`;
      if (ticket?.channel === "whatsapp_oficial") {
        await SendWhatsAppOficialMessage({ body: headerMsg, ticket, type: "text", quotedMsg: null, media: null, vCard: null });
      } else {
        await SendWhatsAppMessage({ body: headerMsg, ticket });
      }
    }

    for (const data of itens) {
      const item: any = data as any; // permite acessar campos extras como linhadigitavel e codigopix

      const vencOriginalStr = data?.vencimento_original || "";
      const vencAtualStr = data?.vencimento || "";
      const dataVencOriginal = vencOriginalStr ? format(parseISO(vencOriginalStr), 'dd/MM/yyyy') : "-";
      const dataVencAtual = vencAtualStr ? format(parseISO(vencAtualStr), 'dd/MM/yyyy') : "-";

      const valorFormatado = formatCurrency(data?.valor);
      const linkBoleto = item?.link || segundaVia?.link || "-";
      const linhaDigitavel = item?.linhadigitavel || segundaVia?.linhadigitavel || "";
      const codigoPix = item?.codigopix || segundaVia?.codigopix || "";

      const msgBoleto = [
        `*Data Vencimento Original:* ${dataVencOriginal}`,
        `*Data de Vencimento Atualizado:* ${dataVencAtual}`,
        `*Valor:* ${valorFormatado || "-"}`,
        linkBoleto ? `*Link do Boleto:* ${linkBoleto}` : null,
        linhaDigitavel ? `*Linha Digitável:* ${linhaDigitavel}` : null
      ].filter(Boolean).join("\n");

      if (ticket?.channel === "whatsapp_oficial") {
        await SendWhatsAppOficialMessage({ body: msgBoleto, ticket, type: "text", quotedMsg: null, media: null, vCard: null });
      } else {
        await SendWhatsAppMessage({ body: msgBoleto, ticket });
      }

      if (codigoPix) {
        const msgPixHeader = "Este é o *PIX Copia e Cola*";
        const msgPixCode = String(codigoPix);

        if (ticket?.channel === "whatsapp_oficial") {
          await SendWhatsAppOficialMessage({ body: msgPixHeader, ticket, type: "text", quotedMsg: null, media: null, vCard: null });
          await SendWhatsAppOficialMessage({ body: msgPixCode, ticket, type: "text", quotedMsg: null, media: null, vCard: null });
        } else {
          await SendWhatsAppMessage({ body: msgPixHeader, ticket });
          await SendWhatsAppMessage({ body: msgPixCode, ticket });
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "Erro em ObtemFaturaServiceOficial");
    const fallback = "Ocorreu um erro ao consultar seus boletos. Tente novamente em instantes.";
    if (ticket?.channel === "whatsapp_oficial") {
      await SendWhatsAppOficialMessage({ body: fallback, ticket, type: "text", quotedMsg: null, media: null, vCard: null });
    } else {
      await SendWhatsAppMessage({ body: fallback, ticket });
    }
  }

  await sleep(5000); // espera 5 segundos antes de fechar o ticket
  try {
    const clearedDataWebhook = { ...(ticket.dataWebhook || {}) } as any;
    if (clearedDataWebhook && clearedDataWebhook.sgp) {
      delete clearedDataWebhook.sgp;
    }

    await ticket.update({
      status: "closed",
      useIntegration: false,
      integrationId: null,
      dataWebhook: clearedDataWebhook
    });
  } catch (e) {
    logger.warn({ err: e }, "Falha ao fechar ticket/limpar integração após envio de boletos");
  }
}

export default ObtemFaturaServiceOficial;
