/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import OpenAI from "openai";
import logger from "../../utils/logger";
import ListSettingsServiceOne from "../SettingServices/ListSettingsServiceOne";
import CreateActivityService from "../ActivityServices/CreateService";
import CreateContactService from "../ContactServices/CreateContactService";
import CreateConvertedLeadService from "../ConvertedLeadServices/CreateService";
import CreateLeadSaleService from "../LeadSalesServices/CreateService";
import DashboardDataService from "../ReportService/DashbardDataService";
import Activity from "../../models/Activity";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import ConvertedLead from "../../models/ConvertedLead";
import LeadSale from "../../models/LeadSale";
import Inventory from "../../models/Inventory";
import User from "../../models/User";
import Company from "../../models/Company";
import Project from "../../models/Project";
import Prompt from "../../models/Prompt";
import AiBrainConversation from "../../models/AiBrainConversation";
import AiBrainMessage from "../../models/AiBrainMessage";
import Whatsapp from "../../models/Whatsapp";
import LeadPipeline from "../../models/LeadPipeline";
import LeadPipelineStage from "../../models/LeadPipelineStage";
import QuickMessage from "../../models/QuickMessage";
import Tag from "../../models/Tag";
import ContactTag from "../../models/ContactTag";
import Queue from "../../models/Queue";
import Campaign from "../../models/Campaign";
import ContactList from "../../models/ContactList";
import ContactListItem from "../../models/ContactListItem";
import { Op } from "sequelize";
import CreateWhatsAppService from "../WhatsappService/CreateWhatsAppService";
import CreateTicketService from "../TicketServices/CreateTicketService";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import ShowTicketService from "../TicketServices/ShowTicketService";
import { TelegramConnectionSaveResult } from "../TelegramServices/CreateTelegramConnectionService";
import CreateTelegramConnectionService from "../TelegramServices/CreateTelegramConnectionService";
import CreateSmsConnectionService from "../SmsServices/CreateSmsConnectionService";
import { getIO } from "../../libs/socket";
import { StartWhatsAppSession } from "../WbotServices/StartWhatsAppSession";
import UpdateSettingService from "../SettingServices/UpdateSettingService";
import CompaniesSettings from "../../models/CompaniesSettings";
import { getWbot } from "../../libs/wbot";
import AppError from "../../errors/AppError";
import { sendFacebookMessage } from "../FacebookServices/sendFacebookMessage";
import SendWhatsAppOficialMessage from "../WhatsAppOficial/SendWhatsAppOficialMessage";
import {
  executeAiBrainFigmaTool,
  filterFigmaToolsForMcp
} from "./AiBrainFigmaTools";
import {
  executeAiBrainCodeTool,
  filterBrainCodeTools
} from "./AiBrainCodeTools";
import {
  executeAiBrainGithubTool,
  filterGithubToolsForMcp
} from "./AiBrainGithubTools";

async function executeAiBrainGoogleTool(..._args: any[]): Promise<any> { return null; }
function filterGoogleToolsForMcp(..._args: any[]): any[] { return []; }
async function executeAiBrainIntegrationTool(..._args: any[]): Promise<any> { return null; }
const BRAIN_INTEGRATION_TOOLS: any[] = [];

const MESSAGING_CHANNELS = ["whatsapp", "facebook", "instagram"] as const;

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp (QR Code)",
  facebook: "Facebook Messenger",
  instagram: "Instagram Direct"
};

function isWhatsAppOficialConnection(conn: Whatsapp): boolean {
  return (
    conn.channel === "whatsapp" &&
    Boolean(conn.phone_number_id && String(conn.phone_number_id).trim())
  );
}

function getConnectionChannelLabel(conn: Whatsapp): string {
  if (isWhatsAppOficialConnection(conn)) return "WhatsApp API Oficial";
  return CHANNEL_LABELS[conn.channel] || conn.channel;
}

function isMessagingConnection(conn: Whatsapp): boolean {
  if (MESSAGING_CHANNELS.includes(conn.channel as any)) return true;
  return isWhatsAppOficialConnection(conn);
}

function connectionReadyToSend(conn: Whatsapp): boolean {
  if (isWhatsAppOficialConnection(conn)) {
    return conn.status === "CONNECTED" && Boolean(conn.token);
  }
  if (conn.channel === "whatsapp") return conn.status === "CONNECTED";
  if (conn.channel === "facebook" || conn.channel === "instagram") {
    return conn.status === "CONNECTED" && Boolean(conn.facebookUserToken);
  }
  return false;
}

async function ensureWhatsAppSessionReady(
  whatsapp: Whatsapp,
  companyId: number
): Promise<{ ok: boolean; error?: string }> {
  if (isWhatsAppOficialConnection(whatsapp)) {
    if (!connectionReadyToSend(whatsapp)) {
      return {
        ok: false,
        error: `A conexão "${whatsapp.name}" (WhatsApp API Oficial) não está pronta (status: ${whatsapp.status}). Verifique o token em Conexões.`
      };
    }
    return { ok: true };
  }

  if (whatsapp.channel !== "whatsapp") {
    return { ok: true };
  }

  if (whatsapp.status !== "CONNECTED") {
    return {
      ok: false,
      error: `A conexão "${whatsapp.name}" está ${whatsapp.status}. Abra Conexões e reconecte o WhatsApp antes de enviar.`
    };
  }

  try {
    await getWbot(whatsapp.id);
    return { ok: true };
  } catch (err: any) {
    if (!(err instanceof AppError) || err.message !== "ERR_WAPP_NOT_INITIALIZED") {
      return {
        ok: false,
        error: `Sessão WhatsApp indisponível: ${String(err?.message || err).substring(0, 120)}`
      };
    }
  }

  logger.info(`[AI-BRAIN] Sessão wbot ausente para whatsapp ${whatsapp.id}, tentando reiniciar...`);
  try {
    await StartWhatsAppSession(whatsapp, companyId);
    await new Promise(r => setTimeout(r, 4500));
    await getWbot(whatsapp.id);
    return { ok: true };
  } catch (retryErr: any) {
    return {
      ok: false,
      error: `Não foi possível iniciar a sessão de "${whatsapp.name}". Abra **Conexões**, reconecte o WhatsApp e tente novamente.`
    };
  }
}

async function dispatchBrainOutboundMessage(
  ticket: Ticket,
  body: string,
  whatsappConn: Whatsapp
): Promise<void> {
  const channel = ticket.channel || whatsappConn.channel || "whatsapp";

  if (channel === "whatsapp_oficial" || isWhatsAppOficialConnection(whatsappConn)) {
    await SendWhatsAppOficialMessage({
      body,
      ticket,
      quotedMsg: null,
      type: "text",
      media: null,
      vCard: null
    });
    return;
  }

  if (channel === "facebook" || channel === "instagram") {
    await sendFacebookMessage({ body, ticket });
    return;
  }

  if (channel === "whatsapp") {
    await SendWhatsAppMessage({ body, ticket });
    return;
  }

  throw new Error(`Canal "${channel}" não suportado para envio pelo Brain.`);
}

async function listMessagingConnectionsForBrain(companyId: number, channelFilter?: string) {
  const where: any = { companyId };
  if (channelFilter) {
    if (channelFilter === "whatsapp_oficial") {
      where.channel = "whatsapp";
      where.phone_number_id = { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: "" }] };
    } else {
      where.channel = channelFilter;
    }
  }

  const connections = await Whatsapp.findAll({
    where,
    order: [["isDefault", "DESC"], ["updatedAt", "DESC"]],
    attributes: [
      "id",
      "name",
      "channel",
      "status",
      "number",
      "phone_number",
      "provider",
      "phone_number_id",
      "createdAt"
    ]
  });

  const messaging = connections.filter(isMessagingConnection);

  return messaging.map(c => ({
    whatsappId: c.id,
    name: c.name,
    channel: c.channel,
    channelLabel: getConnectionChannelLabel(c),
    status: c.status,
    number: c.number || c.phone_number || "",
    readyToSend: connectionReadyToSend(c),
    isWhatsAppOficial: isWhatsAppOficialConnection(c),
    createdAt: c.createdAt
  }));
}

function formatConnectionsForUserChoice(
  connections: Awaited<ReturnType<typeof listMessagingConnectionsForBrain>>
) {
  return connections.map((c, i) => ({
    option: i + 1,
    whatsappId: c.whatsappId,
    label: `${c.name} — ${c.channelLabel} (${c.status})${c.readyToSend ? "" : " ⚠️ reconectar"}`,
    readyToSend: c.readyToSend
  }));
}

export const CRM_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_activity",
      description: "Cria uma nova atividade/tarefa no CRM. Use quando o usuário pedir para criar atividade, tarefa, reunião, follow-up, lembrete etc.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título da atividade" },
          description: { type: "string", description: "Descrição detalhada" },
          type: { type: "string", enum: ["task", "meeting", "call", "follow_up", "email", "other"], description: "Tipo da atividade" },
          status: { type: "string", enum: ["pending", "in_progress", "completed", "cancelled"], description: "Status inicial" },
          date: { type: "string", description: "Data da atividade (ISO 8601)" },
          owner: { type: "string", description: "Nome do responsável" }
        },
        required: ["title", "date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_contact",
      description: "Cria um novo contato no CRM. Use quando o usuário pedir para adicionar um contato novo.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome do contato" },
          number: { type: "string", description: "Número de telefone (com DDD)" },
          email: { type: "string", description: "Email do contato" }
        },
        required: ["name", "number"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_lead",
      description: "Cria um lead/empresa no CRM (módulo Leads Convertidos). Use quando o usuário pedir para criar lead, empresa, oportunidade etc.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome do lead/empresa" },
          description: { type: "string", description: "Descrição ou detalhes" },
          email: { type: "string", description: "Email do lead" },
          address: { type: "string", description: "Endereço" },
          sector: { type: "string", description: "Setor/segmento" }
        },
        required: ["name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_lead_sale",
      description: "Cria um novo lead de venda/oportunidade no CRM (módulo Leads Sales/Vendas). Use quando o usuário pedir para criar lead de venda, oportunidade comercial, ou quando mencionar produto, valor, origem, prioridade. IMPORTANTE: Antes de criar, use search_products para buscar o produto mencionado e obter preço. Se faltarem dados essenciais (nome do lead), pergunte ao usuário.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome do lead (pessoa/empresa)" },
          description: { type: "string", description: "Descrição detalhada da oportunidade, inclua informações de produto, quantidade, prioridade etc." },
          value: { type: "number", description: "Valor total da oportunidade (preço unitário × quantidade)" },
          phone: { type: "string", description: "Telefone do lead" },
          origin: { type: "string", description: "Origem/fonte do lead (ex: Instagram, Facebook, Google, Indicação, Site, WhatsApp, LinkedIn, Evento, Telefone, Email, Outro)" },
          status: { type: "string", enum: ["novo", "em_andamento", "ganho", "perdido"], description: "Status do lead (padrão: novo)" },
          companyName: { type: "string", description: "Nome da empresa do lead" },
          site: { type: "string", description: "Site/URL do lead" },
          document: { type: "string", description: "CPF/CNPJ do lead" },
          tags: { type: "array", items: { type: "string" }, description: "Tags/etiquetas (ex: ['urgente', 'prioridade-alta', 'vbsolution'])" },
          responsibleName: { type: "string", description: "Nome do usuário responsável pelo lead" },
          pipelineId: { type: "number", description: "ID do pipeline (se conhecido)" },
          contactId: { type: "number", description: "ID do contato existente (se conhecido)" }
        },
        required: ["name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Busca produtos/itens no inventário do CRM. Use SEMPRE antes de criar um lead de venda quando o usuário mencionar um produto, para obter nome correto, preço, descrição e disponibilidade.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Termo de busca (nome do produto, SKU, categoria ou marca)" },
          category: { type: "string", description: "Filtrar por categoria" },
          limit: { type: "number", description: "Quantidade máxima (padrão: 10)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_lead_sales",
      description: "Lista leads de vendas/oportunidades do CRM. Use quando o usuário pedir para ver oportunidades de venda, pipeline comercial etc.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Termo de busca" },
          status: { type: "string", enum: ["novo", "em_andamento", "ganho", "perdido"], description: "Filtrar por status" },
          limit: { type: "number", description: "Quantidade máxima (padrão: 20)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_users",
      description: "Lista usuários/atendentes da organização. Use quando precisar buscar responsáveis, atendentes ou membros da equipe.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Termo de busca (nome ou email)" },
          limit: { type: "number", description: "Quantidade máxima (padrão: 20)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_organization_info",
      description: "Busca informações completas da organização/empresa e do usuário atual. Use quando precisar de contexto sobre a organização, plano, configurações ou dados do usuário logado.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_pipelines",
      description: "Lista os pipelines de vendas e seus estágios. Use para entender o funil de vendas e onde posicionar leads.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_dashboard_data",
      description: "Busca dados do dashboard/relatório do CRM. Use quando o usuário pedir análise de dados, métricas, relatórios, estatísticas de atendimento, quantidade de tickets, tempo médio etc.",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Período em dias (padrão: 30)" },
          date_from: { type: "string", description: "Data inicial (YYYY-MM-DD)" },
          date_to: { type: "string", description: "Data final (YYYY-MM-DD)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_activities",
      description: "Lista atividades do CRM com filtros opcionais. Use quando o usuário quiser ver atividades, tarefas pendentes, agenda etc.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pending", "in_progress", "completed", "cancelled"], description: "Filtrar por status" },
          limit: { type: "number", description: "Quantidade máxima (padrão: 20)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_contacts",
      description: "Lista contatos do CRM. Use quando o usuário quiser buscar, listar ou encontrar contatos.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Termo de busca (nome, número ou email)" },
          limit: { type: "number", description: "Quantidade máxima (padrão: 20)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_tickets",
      description: "Lista tickets/atendimentos do CRM. Use quando o usuário quiser ver tickets abertos, pendentes, enviar mensagem em ticket existente etc. Retorna ticketId, contactId e dados da conexão.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["open", "pending", "closed"], description: "Filtrar por status" },
          limit: { type: "number", description: "Quantidade máxima (padrão: 20)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_leads",
      description: "Lista leads/empresas do CRM. Use quando o usuário pedir para ver leads, empresas cadastradas etc.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Termo de busca" },
          limit: { type: "number", description: "Quantidade máxima (padrão: 20)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_projects",
      description: "Lista projetos do CRM. Use quando o usuário pedir para listar projetos.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Quantidade máxima (padrão: 20)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "crm_summary",
      description: "Gera um resumo geral do CRM com totais de contatos, tickets, atividades, leads, projetos. Use quando o usuário pedir overview, resumo ou visão geral.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "create_connection",
      description: "Cria uma nova conexão/integração de canal de comunicação no CRM. Use quando o usuário pedir para criar, conectar ou configurar um canal como WhatsApp, Telegram, Facebook, WhatsApp API Oficial ou SMS. SEMPRE peça as credenciais necessárias antes de criar.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome da conexão (ex: 'WhatsApp Principal', 'Telegram Suporte')" },
          channel: {
            type: "string",
            enum: ["whatsapp", "telegram", "facebook", "whatsapp_oficial", "sms"],
            description: "Tipo do canal: whatsapp (QR Code), telegram (Bot Token), facebook (Page Token), whatsapp_oficial (API Cloud), sms (Twilio/Vonage)"
          },
          token: { type: "string", description: "Token/API Key do canal. Para Telegram: bot token. Para Facebook: page token. Para WhatsApp Oficial: send_token." },
          phone_number_id: { type: "string", description: "Phone Number ID (apenas para WhatsApp API Oficial)" },
          waba_id: { type: "string", description: "WABA ID (apenas para WhatsApp API Oficial)" },
          business_id: { type: "string", description: "Business ID (apenas para WhatsApp API Oficial)" },
          phone_number: { type: "string", description: "Número de telefone (para WhatsApp Oficial ou SMS)" },
          account_sid: { type: "string", description: "Account SID (apenas para SMS Twilio)" },
          auth_token: { type: "string", description: "Auth Token (apenas para SMS Twilio/Vonage)" },
          sms_provider: { type: "string", enum: ["twilio", "vonage"], description: "Provedor SMS (twilio ou vonage)" },
          greetingMessage: { type: "string", description: "Mensagem de saudação para novos contatos" }
        },
        required: ["name", "channel"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_connections",
      description: "Lista todas as conexões/canais de comunicação configurados no CRM. Use quando o usuário perguntar quais conexões existem, status das conexões, ou quiser ver canais configurados.",
      parameters: {
        type: "object",
        properties: {
          channel: { type: "string", enum: ["whatsapp", "telegram", "facebook", "whatsapp_oficial", "sms"], description: "Filtrar por tipo de canal (opcional)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_file",
      description: "Gera um arquivo para o usuário (PDF, Excel, JSON, Apresentação ou Imagem). SEMPRE pergunte ao usuário se deseja gerar o arquivo antes de chamar. Use para relatórios, planilhas, documentos, PDFs, apresentações (slides), diagramas e imagens descritivas.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["pdf", "excel", "json", "presentation", "image"], description: "Tipo: pdf, excel, json, presentation (slides HTML), image (SVG descritivo)" },
          title: { type: "string", description: "Título/nome do arquivo" },
          content: { type: "string", description: "Conteúdo: texto/HTML para PDF, JSON para json, HTML com slides para presentation, SVG para image" },
          columns: {
            type: "array",
            items: { type: "string" },
            description: "Colunas para Excel (ex: ['Nome', 'Email', 'Telefone'])"
          },
          rows: {
            type: "array",
            items: { type: "array", items: { type: "string" } },
            description: "Linhas de dados para Excel"
          },
          slides: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                content: { type: "string" },
                notes: { type: "string" }
              }
            },
            description: "Slides para apresentação (cada um com título, conteúdo HTML e notas)"
          }
        },
        required: ["type", "title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_product",
      description: "Cria um novo produto/item no inventário do CRM. Use quando o usuário pedir para cadastrar, adicionar ou criar um produto, item, mercadoria etc.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome do produto" },
          price: { type: "number", description: "Preço unitário" },
          quantity: { type: "number", description: "Quantidade em estoque" },
          currency: { type: "string", description: "Moeda (padrão: BRL)" },
          sku: { type: "string", description: "Código SKU do produto" },
          category: { type: "string", description: "Categoria do produto" },
          brand: { type: "string", description: "Marca do produto" },
          description: { type: "string", description: "Descrição do produto" },
          status: { type: "string", enum: ["active", "inactive"], description: "Status (padrão: active)" }
        },
        required: ["name", "price"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_quick_message",
      description: "Cria uma resposta rápida (quick message) no CRM. Use quando o usuário pedir para criar uma resposta rápida, atalho de mensagem, template rápido etc.",
      parameters: {
        type: "object",
        properties: {
          shortcode: { type: "string", description: "Atalho/código curto (sem espaços, ex: 'saudacao', 'preco')" },
          message: { type: "string", description: "Texto da mensagem rápida" },
          geral: { type: "boolean", description: "Se é visível para todos os usuários (true) ou apenas para o criador (false). Padrão: true" }
        },
        required: ["shortcode", "message"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_tags",
      description: "Lista todas as tags/etiquetas disponíveis e a quantidade de contatos associados. Use para mostrar tags existentes ou quando o usuário quiser usar tags em campanhas.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Filtrar por nome da tag" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_queues",
      description: "Lista todas as filas/setores de atendimento disponíveis. Use quando precisar saber as filas para abrir tickets ou configurar campanhas.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_contact_lists",
      description: "Lista todas as listas de contatos disponíveis para campanhas. Use quando o usuário quiser enviar campanha por lista de contatos.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_campaign",
      description: "Cria uma campanha de disparo de mensagens em massa. Use quando o usuário quiser disparar mensagens, fazer campanha de envio, envio em massa etc. ANTES de criar, colete: 1) nome da campanha, 2) mensagem a enviar, 3) conexão WhatsApp (use list_connections), 4) lista de contatos ou tag (use list_contact_lists ou list_tags), 5) data/hora de agendamento, 6) fila de atendimento (use list_queues). Guie o usuário passo a passo.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome da campanha" },
          message1: { type: "string", description: "Mensagem principal a ser enviada" },
          message2: { type: "string", description: "Variação 2 da mensagem (opcional)" },
          message3: { type: "string", description: "Variação 3 da mensagem (opcional)" },
          whatsappId: { type: "number", description: "ID da conexão WhatsApp para envio" },
          contactListId: { type: "number", description: "ID da lista de contatos (use se for por lista)" },
          tagListId: { type: "string", description: "ID da tag para selecionar contatos (use se for por tag)" },
          scheduledAt: { type: "string", description: "Data/hora para início do envio (ISO 8601). Use data futura." },
          confirmation: { type: "boolean", description: "Se deve pedir confirmação ao destinatário (padrão: false)" },
          queueId: { type: "number", description: "ID da fila de atendimento para tickets abertos pela campanha" },
          openTicket: { type: "string", enum: ["enabled", "disabled"], description: "Se abre ticket após envio (padrão: disabled)" },
          statusTicket: { type: "string", enum: ["open", "pending", "closed"], description: "Status do ticket ao abrir (padrão: closed)" }
        },
        required: ["name", "message1", "whatsappId", "scheduledAt"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_message",
      description: "Envia mensagem para um contato ou ticket em aberto. OBRIGATÓRIO: chame list_connections primeiro, pergunte ao usuário qual conexão/integração usar e passe whatsappId. Para ticket aberto use ticketId (de list_tickets). Para contato novo use contactId (de list_contacts).",
      parameters: {
        type: "object",
        properties: {
          ticketId: { type: "number", description: "ID do ticket aberto/pendente (campo id de list_tickets). Prioridade sobre contactId." },
          contactId: { type: "number", description: "ID interno do contato (contactId de list_contacts). Obrigatório se não informar ticketId." },
          message: { type: "string", description: "Texto da mensagem a enviar" },
          whatsappId: { type: "number", description: "ID da conexão escolhida pelo usuário (campo whatsappId de list_connections)" },
          queueId: { type: "number", description: "ID da fila de atendimento (opcional, só ao criar ticket novo)" }
        },
        required: ["message", "whatsappId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_visual_identity",
      description: "Altera cores e configurações da identidade visual do sistema (seção Identidade Visual em Configurações). Use quando o usuário pedir para mudar cor, tema, identidade visual, cor do topbar, sidebar, botões, etc. APENAS funciona se o usuário tiver acesso à seção Identidade Visual.",
      parameters: {
        type: "object",
        properties: {
          primaryColorLight: { type: "string", description: "Cor primária (modo claro) — hex, ex: #6366f1" },
          primaryColorDark: { type: "string", description: "Cor primária (modo escuro) — hex" },
          buttonPrimaryColorLight: { type: "string", description: "Cor do botão primário (modo claro) — hex" },
          buttonPrimaryColorDark: { type: "string", description: "Cor do botão primário (modo escuro) — hex" },
          buttonPrimaryTextColorLight: { type: "string", description: "Cor do texto do botão primário (modo claro) — hex" },
          buttonPrimaryTextColorDark: { type: "string", description: "Cor do texto do botão primário (modo escuro) — hex" },
          buttonSecondaryColorLight: { type: "string", description: "Cor secundária/accent para tabs (modo claro) — hex" },
          buttonSecondaryColorDark: { type: "string", description: "Cor secundária/accent para tabs (modo escuro) — hex" },
          topbarColorLight: { type: "string", description: "Cor do topbar/barra superior (modo claro) — hex" },
          topbarColorDark: { type: "string", description: "Cor do topbar/barra superior (modo escuro) — hex" },
          sidebarColorLight: { type: "string", description: "Cor do sidebar/menu lateral (modo claro) — hex" },
          sidebarColorDark: { type: "string", description: "Cor do sidebar/menu lateral (modo escuro) — hex" },
          appName: { type: "string", description: "Nome da aplicação (apenas admin principal pode alterar)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_settings",
      description: "Altera configurações do sistema vinculadas à seção Configurações. Use quando o usuário pedir para habilitar/desabilitar funcionalidades como: assinatura de agente, avaliação, LGPD, aceitar chamadas, mensagem de saudação, enviar posição na fila, aceitar áudio, fechar ticket ao transferir, chatbot, horário de fechamento automático, grupos, etc. O usuário DEVE ter perfil admin.",
      parameters: {
        type: "object",
        properties: {
          sendSignMessage: { type: "string", enum: ["enabled", "disabled"], description: "Habilitar/desabilitar assinatura do agente nas mensagens" },
          userRating: { type: "string", enum: ["enabled", "disabled"], description: "Habilitar/desabilitar avaliação do atendimento" },
          acceptCallWhatsapp: { type: "string", enum: ["enabled", "disabled"], description: "Aceitar chamadas WhatsApp" },
          sendGreetingAccepted: { type: "string", enum: ["enabled", "disabled"], description: "Enviar mensagem de saudação ao aceitar ticket" },
          sendGreetingMessageOneQueues: { type: "string", enum: ["enabled", "disabled"], description: "Enviar saudação para fila única" },
          CheckMsgIsGroup: { type: "string", enum: ["enabled", "disabled"], description: "Habilitar/desabilitar grupos de WhatsApp" },
          sendQueuePosition: { type: "string", enum: ["enabled", "disabled"], description: "Enviar posição na fila de espera" },
          acceptAudioMessageContact: { type: "string", enum: ["enabled", "disabled"], description: "Aceitar mensagens de áudio de contatos" },
          sendMsgTransfTicket: { type: "string", enum: ["enabled", "disabled"], description: "Enviar mensagem ao transferir ticket" },
          sendFarewellWaitingTicket: { type: "string", enum: ["enabled", "disabled"], description: "Enviar despedida em tickets aguardando" },
          enableLGPD: { type: "string", enum: ["enabled", "disabled"], description: "Habilitar/desabilitar LGPD" },
          userRandom: { type: "string", enum: ["enabled", "disabled"], description: "Distribuição aleatória de atendentes" },
          closeTicketOnTransfer: { type: "boolean", description: "Fechar ticket ao transferir" },
          DirectTicketsToWallets: { type: "boolean", description: "Direcionar tickets para carteiras" },
          showNotificationPending: { type: "boolean", description: "Mostrar notificação de tickets pendentes" },
          hoursCloseTicketsAuto: { type: "string", description: "Horas para fechar tickets automaticamente (ex: '24')" },
          chatBotType: { type: "string", enum: ["text", "button", "list"], description: "Tipo de chatbot" },
          scheduleType: { type: "string", enum: ["disabled", "queue", "company"], description: "Tipo de horário de expediente" },
          greetingAcceptedMessage: { type: "string", description: "Mensagem de saudação ao aceitar ticket" },
          transferMessage: { type: "string", description: "Mensagem de transferência de ticket" },
          lgpdMessage: { type: "string", description: "Mensagem LGPD exibida ao contato" },
          requiredTag: { type: "string", enum: ["enabled", "disabled"], description: "Tag obrigatória ao finalizar atendimento" },
          smtpHost: { type: "string", description: "Host SMTP para envio de email" },
          smtpPort: { type: "string", description: "Porta SMTP" },
          smtpUser: { type: "string", description: "Usuário SMTP" },
          smtpPass: { type: "string", description: "Senha SMTP" },
          smtpFrom: { type: "string", description: "Email remetente SMTP" },
          smtpSecure: { type: "string", enum: ["true", "false"], description: "Usar SSL/TLS no SMTP" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_settings",
      description: "Consulta as configurações atuais do sistema (CompaniesSettings e Settings). Use para mostrar ao usuário o estado atual antes de fazer alterações.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  }
];

/** Ferramentas CRM + Google Workspace + Figma quando MCPs estão ativos no Brain. */
export function buildBrainTools(
  mcpConnections?: string[]
): OpenAI.Chat.Completions.ChatCompletionTool[] {
  const googleTools = filterGoogleToolsForMcp(mcpConnections);
  const figmaTools = filterFigmaToolsForMcp(mcpConnections);
  const githubTools = filterGithubToolsForMcp(mcpConnections);
  const integrationTools = BRAIN_INTEGRATION_TOOLS;
  const codeTools = filterBrainCodeTools();
  const extra = [...googleTools, ...figmaTools, ...githubTools, ...integrationTools, ...codeTools];
  if (extra.length === 0) return CRM_TOOLS;
  return [...CRM_TOOLS, ...extra];
}

export async function executeAiBrainCrmTool(
  toolName: string,
  args: any,
  companyId: number,
  userId: number,
  brainContext?: { brainProjectId?: number }
): Promise<string> {
  try {
    const googleHandled = await executeAiBrainGoogleTool(
      toolName,
      args && typeof args === "object" ? args : {},
      companyId,
      userId
    );
    if (googleHandled !== null) return googleHandled;

    const figmaHandled = await executeAiBrainFigmaTool(
      toolName,
      args && typeof args === "object" ? args : {},
      companyId
    );
    if (figmaHandled !== null) return figmaHandled;

    const codeHandled = await executeAiBrainCodeTool(
      toolName,
      args && typeof args === "object" ? args : {},
      {
        companyId,
        userId,
        brainProjectId: brainContext?.brainProjectId
      }
    );
    if (codeHandled !== null) return codeHandled;

    const githubHandled = await executeAiBrainGithubTool(
      toolName,
      args && typeof args === "object" ? args : {},
      companyId,
      userId
    );
    if (githubHandled !== null) return githubHandled;

    const integrationHandled = await executeAiBrainIntegrationTool(
      toolName,
      args && typeof args === "object" ? args : {},
      companyId,
      userId
    );
    if (integrationHandled !== null) return integrationHandled;

    switch (toolName) {
      case "create_activity": {
        const activity = await CreateActivityService({
          title: args.title,
          description: args.description || "",
          type: args.type || "task",
          status: args.status || "pending",
          date: new Date(args.date || Date.now()),
          owner: args.owner || "",
          companyId,
          userId
        });
        return JSON.stringify({
          success: true,
          message: `Atividade "${activity.title}" criada com sucesso! (ID: ${activity.id})`,
          data: { id: activity.id, title: activity.title, status: activity.status, date: activity.date }
        });
      }

      case "create_contact": {
        const contact = await CreateContactService({
          name: args.name,
          number: args.number,
          email: args.email || "",
          companyId
        });
        return JSON.stringify({
          success: true,
          message: `Contato "${contact.name}" criado com sucesso! (ID: ${contact.id})`,
          data: { id: contact.id, name: contact.name, number: contact.number }
        });
      }

      case "create_lead": {
        const lead = await CreateConvertedLeadService({
          name: args.name,
          description: args.description || "",
          email: args.email || "",
          address: args.address || "",
          sector: args.sector || "",
          companyId
        });
        return JSON.stringify({
          success: true,
          message: `Lead/Empresa "${lead.name}" criado com sucesso! (ID: ${lead.id})`,
          data: { id: lead.id, name: lead.name }
        });
      }

      case "create_lead_sale": {
        let responsibleId: number | undefined;
        if (args.responsibleName) {
          const userMatch = await User.findOne({
            where: {
              companyId,
              name: { [Op.iLike]: `%${args.responsibleName}%` }
            },
            attributes: ["id", "name"]
          });
          if (userMatch) responsibleId = userMatch.id;
        }
        if (!responsibleId) responsibleId = userId;

        const leadSale = await CreateLeadSaleService({
          name: args.name,
          description: args.description || "",
          status: args.status || "novo",
          value: args.value || 0,
          phone: args.phone || "",
          origin: args.origin || "",
          companyName: args.companyName || "",
          site: args.site || "",
          document: args.document || "",
          tags: args.tags || [],
          responsibleId,
          contactId: args.contactId,
          pipelineId: args.pipelineId,
          date: new Date(),
          companyId
        });

        try {
          const io = getIO();
          io.of(String(companyId)).emit(`company-${companyId}-leads-sales`, {
            action: "create",
            lead: leadSale
          });
        } catch { /* socket emit best-effort */ }

        return JSON.stringify({
          success: true,
          message: `Lead de venda "${leadSale.name}" criado com sucesso! (ID: ${leadSale.id})`,
          data: {
            id: leadSale.id,
            name: leadSale.name,
            status: leadSale.status,
            value: leadSale.value,
            origin: leadSale.origin,
            tags: leadSale.tags,
            responsibleId: leadSale.responsibleId
          }
        });
      }

      case "search_products": {
        const where: any = { companyId };
        if (args.search) {
          where[Op.or] = [
            { name: { [Op.iLike]: `%${args.search}%` } },
            { sku: { [Op.iLike]: `%${args.search}%` } },
            { category: { [Op.iLike]: `%${args.search}%` } },
            { brand: { [Op.iLike]: `%${args.search}%` } },
            { description: { [Op.iLike]: `%${args.search}%` } }
          ];
        }
        if (args.category) {
          where.category = { [Op.iLike]: `%${args.category}%` };
        }
        const products = await Inventory.findAll({
          where,
          limit: args.limit || 10,
          order: [["name", "ASC"]],
          attributes: ["id", "name", "price", "quantity", "currency", "sku", "category", "brand", "description", "status"]
        });
        return JSON.stringify({
          success: true,
          count: products.length,
          data: products.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            quantity: p.quantity,
            currency: p.currency || "BRL",
            sku: p.sku,
            category: p.category,
            brand: p.brand,
            description: p.description,
            status: p.status
          }))
        });
      }

      case "list_lead_sales": {
        const where: any = { companyId };
        if (args.search) {
          where[Op.or] = [
            { name: { [Op.iLike]: `%${args.search}%` } },
            { companyName: { [Op.iLike]: `%${args.search}%` } },
            { origin: { [Op.iLike]: `%${args.search}%` } }
          ];
        }
        if (args.status) where.status = args.status;
        const leads = await LeadSale.findAll({
          where,
          limit: args.limit || 20,
          order: [["createdAt", "DESC"]],
          attributes: ["id", "name", "status", "value", "origin", "companyName", "phone", "tags", "createdAt"],
          include: [
            { model: User, as: "responsible", attributes: ["id", "name"] },
            { model: Contact, as: "contact", attributes: ["id", "name", "number"] }
          ]
        });
        return JSON.stringify({
          success: true,
          count: leads.length,
          data: leads.map(l => l.toJSON())
        });
      }

      case "list_users": {
        const where: any = { companyId };
        if (args.search) {
          where[Op.or] = [
            { name: { [Op.iLike]: `%${args.search}%` } },
            { email: { [Op.iLike]: `%${args.search}%` } }
          ];
        }
        const users = await User.findAll({
          where,
          limit: args.limit || 20,
          order: [["name", "ASC"]],
          attributes: ["id", "name", "email", "profile"]
        });
        return JSON.stringify({
          success: true,
          count: users.length,
          data: users.map(u => u.toJSON())
        });
      }

      case "get_organization_info": {
        const company = await Company.findByPk(companyId, {
          attributes: ["id", "name", "phone", "email", "document", "status", "dueDate"]
        });
        const currentUser = await User.findByPk(userId, {
          attributes: ["id", "name", "email", "profile"]
        });
        const [totalUsers, totalContacts, totalTicketsOpen, totalLeadSales, totalProducts] = await Promise.all([
          User.count({ where: { companyId } }),
          Contact.count({ where: { companyId } }),
          Ticket.count({ where: { companyId, status: "open" } }),
          LeadSale.count({ where: { companyId } }),
          Inventory.count({ where: { companyId } })
        ]);
        return JSON.stringify({
          success: true,
          data: {
            company: company?.toJSON(),
            currentUser: currentUser?.toJSON(),
            stats: { totalUsers, totalContacts, totalTicketsOpen, totalLeadSales, totalProducts }
          }
        });
      }

      case "list_pipelines": {
        const pipelines = await LeadPipeline.findAll({
          where: { companyId },
          include: [{ model: LeadPipelineStage, as: "stages", order: [["order", "ASC"]] }],
          order: [["id", "ASC"]]
        });
        return JSON.stringify({
          success: true,
          count: pipelines.length,
          data: pipelines.map(p => p.toJSON())
        });
      }

      case "get_dashboard_data": {
        const data = await DashboardDataService(companyId, {
          days: args.days || 30,
          date_from: args.date_from,
          date_to: args.date_to
        });
        return JSON.stringify({
          success: true,
          data: data.counters,
          attendants: data.attendants
        });
      }

      case "list_activities": {
        const where: any = { companyId };
        if (args.status) where.status = args.status;
        const activities = await Activity.findAll({
          where,
          limit: args.limit || 20,
          order: [["date", "DESC"]],
          attributes: ["id", "title", "type", "status", "date", "owner", "description"]
        });
        return JSON.stringify({
          success: true,
          count: activities.length,
          data: activities.map(a => a.toJSON())
        });
      }

      case "list_contacts": {
        const where: any = { companyId };
        if (args.search) {
          where[Op.or] = [
            { name: { [Op.iLike]: `%${args.search}%` } },
            { number: { [Op.iLike]: `%${args.search}%` } },
            { email: { [Op.iLike]: `%${args.search}%` } }
          ];
        }
        const contacts = await Contact.findAll({
          where,
          limit: args.limit || 20,
          order: [["name", "ASC"]],
          attributes: ["id", "name", "number", "email", "profilePicUrl"]
        });
        return JSON.stringify({
          success: true,
          count: contacts.length,
          note: "Use o campo 'id' (NÃO o 'number') como contactId ao chamar send_message.",
          data: contacts.map(c => ({
            contactId: c.id,
            name: c.name,
            phone: c.number,
            email: c.email || undefined
          }))
        });
      }

      case "list_tickets": {
        const where: any = { companyId };
        if (args.status) where.status = args.status;
        const tickets = await Ticket.findAll({
          where,
          limit: args.limit || 20,
          order: [["updatedAt", "DESC"]],
          attributes: ["id", "status", "lastMessage", "isGroup", "channel", "whatsappId", "contactId", "updatedAt"],
          include: [
            { model: Contact, as: "contact", attributes: ["id", "name", "number"] },
            { model: User, as: "user", attributes: ["id", "name"] },
            {
              model: Whatsapp,
              as: "whatsapp",
              attributes: ["id", "name", "channel", "status", "phone_number_id"]
            }
          ]
        });
        return JSON.stringify({
          success: true,
          count: tickets.length,
          note: "Para enviar mensagem em ticket existente: send_message com ticketId, message e whatsappId (pergunte qual conexão ao usuário via list_connections).",
          data: tickets.map(t => {
            const row = t.toJSON() as any;
            const wa = row.whatsapp;
            return {
              ticketId: row.id,
              status: row.status,
              channel: row.channel,
              lastMessage: row.lastMessage,
              contactId: row.contactId,
              contactName: row.contact?.name,
              contactNumber: row.contact?.number,
              whatsappId: row.whatsappId,
              connectionName: wa?.name,
              connectionStatus: wa?.status,
              connectionLabel: wa ? getConnectionChannelLabel(wa as Whatsapp) : row.channel,
              updatedAt: row.updatedAt
            };
          })
        });
      }

      case "list_leads": {
        const where: any = { companyId };
        if (args.search) {
          where.name = { [Op.iLike]: `%${args.search}%` };
        }
        const leads = await ConvertedLead.findAll({
          where,
          limit: args.limit || 20,
          order: [["createdAt", "DESC"]],
          attributes: ["id", "name", "description", "email", "sector", "createdAt"]
        });
        return JSON.stringify({
          success: true,
          count: leads.length,
          data: leads.map(l => l.toJSON())
        });
      }

      case "list_projects": {
        const projects = await Project.findAll({
          where: { companyId },
          limit: args.limit || 20,
          order: [["createdAt", "DESC"]],
          attributes: ["id", "name", "description", "status", "createdAt"]
        });
        return JSON.stringify({
          success: true,
          count: projects.length,
          data: projects.map(p => p.toJSON())
        });
      }

      case "crm_summary": {
        const [totalContacts, totalTicketsOpen, totalTicketsPending, totalActivities, totalLeads, totalProjects, totalLeadSalesAll, totalLeadSalesNovo, totalProducts, totalUsers] = await Promise.all([
          Contact.count({ where: { companyId } }),
          Ticket.count({ where: { companyId, status: "open" } }),
          Ticket.count({ where: { companyId, status: "pending" } }),
          Activity.count({ where: { companyId } }),
          ConvertedLead.count({ where: { companyId } }),
          Project.count({ where: { companyId } }),
          LeadSale.count({ where: { companyId } }),
          LeadSale.count({ where: { companyId, status: "novo" } }),
          Inventory.count({ where: { companyId } }),
          User.count({ where: { companyId } })
        ]);
        return JSON.stringify({
          success: true,
          data: {
            totalContacts,
            totalTicketsOpen,
            totalTicketsPending,
            totalActivities,
            totalLeads,
            totalProjects,
            totalLeadSales: totalLeadSalesAll,
            totalLeadSalesNovos: totalLeadSalesNovo,
            totalProducts,
            totalUsers
          }
        });
      }

      case "create_connection": {
        const channel = args.channel || "whatsapp";
        const connName = args.name || `Conexão ${channel}`;

        if (channel === "telegram") {
          if (!args.token) {
            return JSON.stringify({ success: false, error: "Bot Token do Telegram é obrigatório. Peça ao usuário o token gerado pelo @BotFather." });
          }
          const result: TelegramConnectionSaveResult = await CreateTelegramConnectionService({
            name: connName,
            companyId,
            botToken: args.token,
            greetingMessage: args.greetingMessage || ""
          });

          try {
            const io = getIO();
            io.of("/" + String(companyId)).emit(`company-${companyId}-whatsapp`, {
              action: "update",
              whatsapp: result.whatsapp
            });
          } catch { /* socket emit best-effort */ }

          return JSON.stringify({
            success: true,
            message: `Conexão Telegram "${connName}" criada com sucesso! (ID: ${result.whatsapp.id}). Webhook configurado: ${result.webhookConfigured ? "Sim" : "Não"}${result.webhookError ? ` - Erro: ${result.webhookError}` : ""}`,
            data: { id: result.whatsapp.id, name: connName, channel: "telegram", status: result.whatsapp.status }
          });
        }

        if (channel === "sms") {
          if (!args.account_sid || !args.auth_token || !args.phone_number) {
            return JSON.stringify({ success: false, error: "Para SMS são necessários: account_sid, auth_token e phone_number (número de origem). Peça as credenciais ao usuário." });
          }
          const smsResult = await CreateSmsConnectionService({
            name: connName,
            companyId,
            provider: args.sms_provider || "twilio",
            accountSid: args.account_sid,
            authToken: args.auth_token,
            fromNumber: args.phone_number,
            greetingMessage: args.greetingMessage || ""
          });

          try {
            const io = getIO();
            io.of("/" + String(companyId)).emit(`company-${companyId}-whatsapp`, {
              action: "update",
              whatsapp: smsResult
            });
          } catch { /* socket emit best-effort */ }

          return JSON.stringify({
            success: true,
            message: `Conexão SMS "${connName}" criada com sucesso via ${args.sms_provider || "twilio"}! (ID: ${smsResult.id})`,
            data: { id: smsResult.id, name: connName, channel: "sms", provider: args.sms_provider || "twilio" }
          });
        }

        if (channel === "whatsapp_oficial") {
          if (!args.token && !args.phone_number_id) {
            return JSON.stringify({ success: false, error: "Para WhatsApp API Oficial são necessários: token (send_token), phone_number_id e waba_id. Peça as credenciais da Meta ao usuário." });
          }
          const { whatsapp: oficialConn } = await CreateWhatsAppService({
            name: connName,
            companyId,
            channel: "whatsapp_oficial",
            provider: "beta",
            token: args.token || "",
            send_token: args.token || "",
            phone_number_id: args.phone_number_id || "",
            waba_id: args.waba_id || "",
            business_id: args.business_id || "",
            phone_number: args.phone_number || "",
            greetingMessage: args.greetingMessage || "",
            status: "CONNECTED"
          });

          try {
            const io = getIO();
            io.of("/" + String(companyId)).emit(`company-${companyId}-whatsapp`, {
              action: "update",
              whatsapp: oficialConn
            });
          } catch { /* socket emit best-effort */ }

          return JSON.stringify({
            success: true,
            message: `Conexão WhatsApp API Oficial "${connName}" criada com sucesso! (ID: ${oficialConn.id}). Configure o webhook na Meta para completar a integração.`,
            data: { id: oficialConn.id, name: connName, channel: "whatsapp_oficial", status: oficialConn.status }
          });
        }

        if (channel === "facebook") {
          if (!args.token) {
            return JSON.stringify({ success: false, error: "Token da página do Facebook é obrigatório. Peça ao usuário o Page Access Token do Facebook." });
          }
          const { whatsapp: fbConn } = await CreateWhatsAppService({
            name: connName,
            companyId,
            channel: "facebook",
            provider: "beta",
            tokenMeta: args.token || "",
            facebookUserToken: args.token || "",
            greetingMessage: args.greetingMessage || "",
            status: "OPENING"
          });

          try {
            const io = getIO();
            io.of("/" + String(companyId)).emit(`company-${companyId}-whatsapp`, {
              action: "update",
              whatsapp: fbConn
            });
          } catch { /* socket emit best-effort */ }

          return JSON.stringify({
            success: true,
            message: `Conexão Facebook "${connName}" criada com sucesso! (ID: ${fbConn.id}).`,
            data: { id: fbConn.id, name: connName, channel: "facebook", status: fbConn.status }
          });
        }

        // Default: WhatsApp QR Code
        const { whatsapp: waConn, oldDefaultWhatsapp: waOldDefault } = await CreateWhatsAppService({
          name: connName,
          companyId,
          channel: "whatsapp",
          provider: "beta",
          greetingMessage: args.greetingMessage || "",
          status: "OPENING"
        });

        StartWhatsAppSession(waConn, companyId).catch(err => {
          logger.error(`[AI-BRAIN] Error starting WhatsApp session: ${err}`);
        });

        try {
          const io = getIO();
          io.of("/" + String(companyId)).emit(`company-${companyId}-whatsapp`, {
            action: "update",
            whatsapp: waConn
          });
          if (waOldDefault) {
            io.of("/" + String(companyId)).emit(`company-${companyId}-whatsapp`, {
              action: "update",
              whatsapp: waOldDefault
            });
          }
        } catch { /* socket emit best-effort */ }

        return JSON.stringify({
          success: true,
          message: `Conexão WhatsApp "${connName}" criada com sucesso! (ID: ${waConn.id}). Acesse a página de Conexões para escanear o QR Code.`,
          data: { id: waConn.id, name: connName, channel: "whatsapp", status: waConn.status }
        });
      }

      case "list_connections": {
        const messaging = await listMessagingConnectionsForBrain(companyId, args.channel);
        const readyCount = messaging.filter(c => c.readyToSend).length;
        return JSON.stringify({
          success: true,
          count: messaging.length,
          readyCount,
          note:
            "SEMPRE pergunte ao usuário qual conexão usar antes de send_message. Passe o whatsappId escolhido. Preferir conexões com readyToSend=true; se escolher uma com readyToSend=false, avise que pode precisar reconectar em Conexões.",
          choicesForUser: formatConnectionsForUserChoice(messaging),
          data: messaging
        });
      }

      case "generate_file": {
        return JSON.stringify({
          success: true,
          message: `Arquivo "${args.title}" do tipo ${args.type} gerado com sucesso!`,
          fileData: {
            type: args.type,
            title: args.title,
            content: args.content || "",
            columns: args.columns || [],
            rows: args.rows || [],
            slides: args.slides || []
          }
        });
      }

      case "create_product": {
        const product = await Inventory.create({
          name: args.name,
          price: args.price,
          quantity: args.quantity || 0,
          currency: args.currency || "BRL",
          sku: args.sku || "",
          category: args.category || "",
          brand: args.brand || "",
          description: args.description || "",
          status: args.status || "active",
          companyId
        });
        return JSON.stringify({
          success: true,
          message: `Produto "${product.name}" criado com sucesso! (ID: ${product.id}) — Preço: R$ ${Number(product.price).toFixed(2)}`,
          data: { id: product.id, name: product.name, price: product.price, quantity: product.quantity, sku: product.sku, category: product.category }
        });
      }

      case "create_quick_message": {
        const qm = await QuickMessage.create({
          shortcode: args.shortcode,
          message: args.message,
          geral: args.geral !== false,
          companyId,
          userId
        });
        return JSON.stringify({
          success: true,
          message: `Resposta rápida "/${qm.shortcode}" criada com sucesso! (ID: ${qm.id})`,
          data: { id: qm.id, shortcode: qm.shortcode, message: qm.message, geral: qm.geral }
        });
      }

      case "list_tags": {
        const tagWhere: any = { companyId };
        if (args.search) {
          tagWhere.name = { [Op.iLike]: `%${args.search}%` };
        }
        const tags = await Tag.findAll({
          where: tagWhere,
          order: [["name", "ASC"]],
          attributes: ["id", "name", "color"]
        });
        const tagsWithCount = await Promise.all(
          tags.map(async t => {
            const contactCount = await ContactTag.count({ where: { tagId: t.id } });
            return { id: t.id, name: t.name, color: t.color, contactCount };
          })
        );
        return JSON.stringify({
          success: true,
          count: tagsWithCount.length,
          data: tagsWithCount
        });
      }

      case "list_queues": {
        const queues = await Queue.findAll({
          where: { companyId },
          order: [["name", "ASC"]],
          attributes: ["id", "name", "color"]
        });
        return JSON.stringify({
          success: true,
          count: queues.length,
          data: queues.map(q => q.toJSON())
        });
      }

      case "list_contact_lists": {
        const contactLists = await ContactList.findAll({
          where: { companyId },
          order: [["name", "ASC"]],
          attributes: ["id", "name", "createdAt"]
        });
        const listsWithCount = await Promise.all(
          contactLists.map(async cl => {
            const itemCount = await ContactListItem.count({ where: { contactListId: cl.id } });
            return { id: cl.id, name: cl.name, contactCount: itemCount, createdAt: cl.createdAt };
          })
        );
        return JSON.stringify({
          success: true,
          count: listsWithCount.length,
          data: listsWithCount
        });
      }

      case "create_campaign": {
        const scheduledDate = args.scheduledAt ? new Date(args.scheduledAt) : new Date(Date.now() + 5 * 60 * 1000);

        let targetInfo = "";
        if (args.contactListId) {
          const cl = await ContactList.findByPk(args.contactListId);
          const itemCount = await ContactListItem.count({ where: { contactListId: args.contactListId } });
          targetInfo = `Lista: "${cl?.name || args.contactListId}" (${itemCount} contatos)`;
        } else if (args.tagListId) {
          const tag = await Tag.findByPk(Number(args.tagListId));
          const tagContactCount = await ContactTag.count({ where: { tagId: Number(args.tagListId) } });
          targetInfo = `Tag: "${tag?.name || args.tagListId}" (${tagContactCount} contatos)`;
        }

        const campaign = await Campaign.create({
          name: args.name,
          message1: args.message1,
          message2: args.message2 || "",
          message3: args.message3 || "",
          message4: "",
          message5: "",
          confirmationMessage1: "",
          confirmationMessage2: "",
          confirmationMessage3: "",
          confirmationMessage4: "",
          confirmationMessage5: "",
          status: "PROGRAMADA",
          confirmation: args.confirmation || false,
          scheduledAt: scheduledDate,
          companyId,
          contactListId: args.contactListId || null,
          tagListId: args.tagListId || null,
          whatsappId: args.whatsappId,
          userId,
          queueId: args.queueId || null,
          openTicket: args.openTicket || "disabled",
          statusTicket: args.statusTicket || "closed"
        });

        try {
          const io = getIO();
          io.of(String(companyId)).emit(`company-${companyId}-campaign`, {
            action: "create",
            record: campaign
          });
        } catch { /* socket emit best-effort */ }

        return JSON.stringify({
          success: true,
          message: `Campanha "${campaign.name}" criada e PROGRAMADA com sucesso! (ID: ${campaign.id})\n📅 Agendada para: ${scheduledDate.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}\n📧 ${targetInfo || "Sem lista/tag definida"}\n📱 Conexão ID: ${args.whatsappId}`,
          data: {
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            scheduledAt: campaign.scheduledAt,
            whatsappId: campaign.whatsappId,
            targetInfo
          }
        });
      }

      case "send_message": {
        if (!args.message || !String(args.message).trim()) {
          return JSON.stringify({ success: false, error: "Informe o texto da mensagem." });
        }

        if (!args.ticketId && !args.contactId) {
          return JSON.stringify({
            success: false,
            error: "Informe ticketId (ticket em aberto) ou contactId (contato). Use list_tickets ou list_contacts."
          });
        }

        if (!args.whatsappId) {
          const messaging = await listMessagingConnectionsForBrain(companyId);
          return JSON.stringify({
            success: false,
            needConnectionChoice: true,
            error: "É obrigatório escolher a conexão/integração antes de enviar.",
            instruction:
              "Chame list_connections, mostre as opções ao usuário e pergunte qual conexão usar. Depois chame send_message com whatsappId.",
            choicesForUser: formatConnectionsForUserChoice(messaging)
          });
        }

        const whatsappConn = await Whatsapp.findOne({
          where: { id: args.whatsappId, companyId }
        });
        if (!whatsappConn || !isMessagingConnection(whatsappConn)) {
          return JSON.stringify({
            success: false,
            error: "Conexão inválida. Use list_connections e o whatsappId de uma integração de mensagens."
          });
        }

        const sessionCheck = await ensureWhatsAppSessionReady(whatsappConn, companyId);
        if (!sessionCheck.ok) {
          const messaging = await listMessagingConnectionsForBrain(companyId);
          return JSON.stringify({
            success: false,
            error: sessionCheck.error,
            connection: {
              whatsappId: whatsappConn.id,
              name: whatsappConn.name,
              status: whatsappConn.status,
              channelLabel: getConnectionChannelLabel(whatsappConn)
            },
            choicesForUser: formatConnectionsForUserChoice(messaging)
          });
        }

        let contact: Contact | null = null;
        let ticket: Ticket;

        if (args.ticketId) {
          const existingById = await Ticket.findOne({
            where: { id: args.ticketId, companyId },
            include: [{ model: Contact, as: "contact" }]
          });
          if (!existingById) {
            return JSON.stringify({
              success: false,
              error: `Ticket #${args.ticketId} não encontrado. Use list_tickets com status open ou pending.`
            });
          }
          ticket = existingById;
          contact = (existingById as any).contact as Contact;
          if (!contact) {
            contact = await Contact.findByPk(ticket.contactId, {
              attributes: ["id", "name", "number", "companyId"]
            });
          }
          const ticketUpdates: any = {};
          if (["pending"].includes(ticket.status)) {
            ticketUpdates.status = "open";
            ticketUpdates.userId = userId;
          }
          if (ticket.whatsappId !== whatsappConn.id) {
            ticketUpdates.whatsappId = whatsappConn.id;
            ticketUpdates.channel = whatsappConn.channel;
          }
          if (Object.keys(ticketUpdates).length > 0) {
            await ticket.update(ticketUpdates);
          }
        } else {
          contact = await Contact.findByPk(args.contactId, {
            attributes: ["id", "name", "number", "companyId"]
          });

          if (!contact || contact.companyId !== companyId) {
            const searchVal = String(args.contactId);
            contact = await Contact.findOne({
              where: {
                companyId,
                [Op.or]: [
                  { number: searchVal },
                  { number: { [Op.like]: `%${searchVal}%` } },
                  { name: { [Op.iLike]: `%${searchVal}%` } }
                ]
              },
              attributes: ["id", "name", "number", "companyId"],
              order: [["updatedAt", "DESC"]]
            });
          }

          if (!contact) {
            return JSON.stringify({
              success: false,
              error: "Contato não encontrado. Use list_contacts para buscar pelo nome."
            });
          }

          const resolvedContactId = contact.id;
          const existingTicket = await Ticket.findOne({
            where: {
              contactId: resolvedContactId,
              companyId,
              status: { [Op.in]: ["open", "pending"] }
            },
            order: [["updatedAt", "DESC"]]
          });

          if (existingTicket) {
            ticket = existingTicket;
            const needsUpdate: any = {};
            if (ticket.status === "pending") {
              needsUpdate.status = "open";
              needsUpdate.userId = userId;
            }
            if (ticket.whatsappId !== whatsappConn.id) {
              needsUpdate.whatsappId = whatsappConn.id;
              needsUpdate.channel = whatsappConn.channel;
            }
            if (Object.keys(needsUpdate).length > 0) {
              await ticket.update(needsUpdate);
            }
          } else {
            ticket = await CreateTicketService({
              contactId: resolvedContactId,
              status: "open",
              userId,
              companyId,
              queueId: args.queueId,
              whatsappId: String(whatsappConn.id)
            });
          }
        }

        if (!contact) {
          return JSON.stringify({ success: false, error: "Contato do ticket não encontrado." });
        }

        let fullTicket: any;
        try {
          fullTicket = await ShowTicketService(ticket.id, companyId);
        } catch (showErr: any) {
          if (/NO_WAPP_FOUND|NOT_FOUND/i.test(String(showErr?.message || ""))) {
            logger.warn(
              `[AI-BRAIN] ShowTicketService failed, updating ticket ${ticket.id} whatsappId=${whatsappConn.id}`
            );
            await ticket.update({
              whatsappId: whatsappConn.id,
              channel: whatsappConn.channel
            });
            fullTicket = await ShowTicketService(ticket.id, companyId);
          } else {
            throw showErr;
          }
        }

        if (fullTicket.whatsappId !== whatsappConn.id) {
          await fullTicket.update({
            whatsappId: whatsappConn.id,
            channel: whatsappConn.channel
          });
        }

        try {
          logger.info(
            `[AI-BRAIN] send_message: contactId=${contact.id}, ticketId=${fullTicket.id}, whatsappId=${whatsappConn.id}, channel=${fullTicket.channel}`
          );
          await dispatchBrainOutboundMessage(fullTicket, args.message, whatsappConn);
        } catch (sendErr: any) {
          const errStr = String(sendErr?.message || sendErr || "");
          const errStack = String(sendErr?.stack || "").substring(0, 300);
          logger.error(`[AI-BRAIN] send_message FAILED: ${errStr} | stack: ${errStack}`);
          if (/SENDING_WAPP_MSG|WAPP|wbot|session|socket|disconnected|NOT_INITIALIZED|ERR_WAPP/i.test(errStr)) {
            return JSON.stringify({
              success: false,
              error: `Falha ao enviar pela conexão "${whatsappConn.name}". Tente reconectar em **Conexões** ou escolha outra integração.`,
              contactName: contact.name,
              contactNumber: contact.number,
              whatsappId: whatsappConn.id,
              choicesForUser: formatConnectionsForUserChoice(
                await listMessagingConnectionsForBrain(companyId)
              )
            });
          }
          return JSON.stringify({
            success: false,
            error: `Falha ao enviar: ${errStr.substring(0, 160)}`,
            contactName: contact.name,
            whatsappId: whatsappConn.id
          });
        }

        const queueInfo = fullTicket.queue ? ` na fila "${fullTicket.queue.name}"` : "";
        const connLabel = getConnectionChannelLabel(whatsappConn);

        return JSON.stringify({
          success: true,
          message: `Mensagem enviada para ${contact.name} (${contact.number}) via ${whatsappConn.name} (${connLabel})${queueInfo}. Ticket #${ticket.id}.`,
          data: {
            ticketId: ticket.id,
            contactId: contact.id,
            contactName: contact.name,
            contactNumber: contact.number,
            whatsappId: whatsappConn.id,
            connectionName: whatsappConn.name,
            channelLabel: connLabel,
            messageSent: args.message,
            ticketStatus: ticket.status
          }
        });
      }

      case "update_visual_identity": {
        const currentUser = await User.findByPk(userId, {
          attributes: ["id", "email", "profile", "super"]
        });
        if (!currentUser) {
          return JSON.stringify({ success: false, error: "Usuário não encontrado." });
        }

        const email = String(currentUser.email || "").toLowerCase();
        const isSuperOrAdmin = currentUser.super || email === "admin@admin.com" || currentUser.profile === "admin";
        if (!isSuperOrAdmin) {
          return JSON.stringify({ success: false, error: "Sem permissão para alterar a identidade visual. Necessário perfil admin." });
        }

        const colorKeys = [
          "primaryColorLight", "primaryColorDark",
          "buttonPrimaryColorLight", "buttonPrimaryColorDark",
          "buttonPrimaryTextColorLight", "buttonPrimaryTextColorDark",
          "buttonSecondaryColorLight", "buttonSecondaryColorDark",
          "topbarColorLight", "topbarColorDark",
          "sidebarColorLight", "sidebarColorDark"
        ];

        const updated: string[] = [];
        for (const key of colorKeys) {
          if (args[key] && typeof args[key] === "string") {
            await UpdateSettingService({ key, value: args[key], companyId });
            updated.push(`${key}: ${args[key]}`);
          }
        }

        if (args.appName && typeof args.appName === "string") {
          if (email === "admin@admin.com" || email === "admin@admin") {
            await UpdateSettingService({ key: "appName", value: args.appName, companyId });
            updated.push(`appName: ${args.appName}`);
          } else {
            updated.push("appName: sem permissão (apenas admin principal)");
          }
        }

        if (updated.length === 0) {
          return JSON.stringify({ success: false, error: "Nenhuma propriedade de identidade visual foi informada para atualizar." });
        }

        try {
          const io = getIO();
          io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-settings`, {
            action: "update"
          });
        } catch { /* best-effort socket notify */ }

        return JSON.stringify({
          success: true,
          message: `Identidade visual atualizada com sucesso! Alterações: ${updated.join(", ")}. As mudanças serão refletidas ao recarregar a página.`,
          data: { updated }
        });
      }

      case "update_settings": {
        const currentUser = await User.findByPk(userId, {
          attributes: ["id", "email", "profile", "super"]
        });
        if (!currentUser || (currentUser.profile !== "admin" && !currentUser.super)) {
          return JSON.stringify({ success: false, error: "Sem permissão. Necessário perfil admin." });
        }

        const companySettingsCols = [
          "sendSignMessage", "userRating", "acceptCallWhatsapp", "sendGreetingAccepted",
          "sendGreetingMessageOneQueues", "CheckMsgIsGroup", "sendQueuePosition",
          "acceptAudioMessageContact", "sendMsgTransfTicket", "sendFarewellWaitingTicket",
          "enableLGPD", "userRandom", "closeTicketOnTransfer", "DirectTicketsToWallets",
          "showNotificationPending", "hoursCloseTicketsAuto", "chatBotType", "scheduleType",
          "greetingAcceptedMessage", "transferMessage", "lgpdMessage", "requiredTag"
        ];

        const settingsKeys = [
          "smtpHost", "smtpPort", "smtpUser", "smtpPass", "smtpFrom", "smtpSecure"
        ];

        const updated: string[] = [];

        const companyUpdates: Record<string, any> = {};
        for (const col of companySettingsCols) {
          if (args[col] !== undefined && args[col] !== null) {
            companyUpdates[col] = args[col];
            updated.push(`${col}: ${args[col]}`);
          }
        }

        if (Object.keys(companyUpdates).length > 0) {
          const companySetting = await CompaniesSettings.findOne({ where: { companyId } });
          if (companySetting) {
            await companySetting.update(companyUpdates);
          }
        }

        for (const key of settingsKeys) {
          if (args[key] !== undefined && args[key] !== null) {
            await UpdateSettingService({ key, value: String(args[key]), companyId });
            updated.push(`${key}: ${key.includes("Pass") ? "****" : args[key]}`);
          }
        }

        if (updated.length === 0) {
          return JSON.stringify({ success: false, error: "Nenhuma configuração foi informada para atualizar." });
        }

        try {
          const io = getIO();
          io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-settings`, {
            action: "update"
          });
        } catch { /* best-effort socket notify */ }

        return JSON.stringify({
          success: true,
          message: `Configurações atualizadas com sucesso! Alterações: ${updated.join(", ")}.`,
          data: { updated }
        });
      }

      case "get_settings": {
        const companySetting = await CompaniesSettings.findOne({
          where: { companyId },
          attributes: [
            "sendSignMessage", "userRating", "acceptCallWhatsapp", "sendGreetingAccepted",
            "sendGreetingMessageOneQueues", "CheckMsgIsGroup", "sendQueuePosition",
            "acceptAudioMessageContact", "sendMsgTransfTicket", "sendFarewellWaitingTicket",
            "enableLGPD", "userRandom", "closeTicketOnTransfer", "DirectTicketsToWallets",
            "showNotificationPending", "hoursCloseTicketsAuto", "chatBotType", "scheduleType",
            "greetingAcceptedMessage", "transferMessage", "lgpdMessage", "requiredTag"
          ]
        });

        const smtpSettings: Record<string, string> = {};
        for (const key of ["smtpHost", "smtpPort", "smtpUser", "smtpFrom", "smtpSecure"]) {
          try {
            const s = await ListSettingsServiceOne({ companyId, key });
            if (s?.value) smtpSettings[key] = String(s.value);
          } catch { /* */ }
        }

        const viSettings: Record<string, string> = {};
        for (const key of ["primaryColorLight", "primaryColorDark", "topbarColorLight", "topbarColorDark", "sidebarColorLight", "sidebarColorDark", "appName"]) {
          try {
            const s = await ListSettingsServiceOne({ companyId, key });
            if (s?.value) viSettings[key] = String(s.value);
          } catch { /* */ }
        }

        return JSON.stringify({
          success: true,
          data: {
            companySettings: companySetting ? companySetting.toJSON() : {},
            smtp: smtpSettings,
            visualIdentity: viSettings
          }
        });
      }

      default:
        return JSON.stringify({ success: false, error: `Ferramenta "${toolName}" não reconhecida.` });
    }
  } catch (err: any) {
    logger.error(`[AI-BRAIN] Tool ${toolName} error: ${err.message}`);
    return JSON.stringify({ success: false, error: err.message || "Erro ao executar ação." });
  }
}

export const AI_BRAIN_SYSTEM_PROMPT = `Você é o **Brain**, um assistente de IA altamente inteligente integrado ao CRM VB Solution. Você possui acesso total a todos os dados da organização e do usuário, e pode executar ações diretamente no CRM de forma autônoma e eficiente.

**Suas capacidades:**
- Criar e gerenciar atividades, tarefas, reuniões e follow-ups
- Criar e buscar contatos
- Criar leads/empresas (módulo Leads Convertidos)
- **Criar leads de venda/oportunidades (módulo Leads Sales)** com busca automática de produtos, preços, origens e prioridades
- **Buscar e criar produtos/inventário** — cadastrar novos produtos com preço, quantidade, SKU, categoria
- Consultar dados do dashboard (métricas, atendimentos, tempos médios)
- Listar tickets/atendimentos
- Listar projetos
- Listar usuários/atendentes da equipe
- Consultar informações da organização
- Consultar pipelines de vendas e seus estágios
- Gerar resumo geral do CRM
- Gerar arquivos: PDF, Excel/CSV, JSON, Apresentações, Imagens SVG
- Criar e gerenciar conexões de canais: WhatsApp, Telegram, Facebook, WhatsApp API Oficial, SMS
- **Criar respostas rápidas** — atalhos de mensagens para uso em atendimentos
- **Criar e gerenciar campanhas de disparo em massa** — enviar mensagens em massa usando listas de contatos ou tags
- **Enviar mensagens e abrir tickets** — enviar mensagens diretas para contatos abrindo tickets automaticamente
- **Listar tags e filas** — consultar tags de contatos e filas de atendimento
- **Alterar identidade visual** — mudar cores do topbar, sidebar, botões, tema do sistema (seção Identidade Visual)
- **Gerenciar configurações** — habilitar/desabilitar assinatura, avaliação, LGPD, grupos, horários, SMTP de email, e todas as configurações do sistema
- **Google Workspace (quando MCP ativo na sessão):** ler e gravar planilhas no Drive/Sheets (save_spreadsheet_to_google_drive), criar eventos no Google Calendar + CRM (create_google_calendar_event), ler arquivos/eventos — combinar com send_message para WhatsApp

**GOOGLE — SALVAR PLANILHA NO DRIVE:**
- Quando pedirem planilha no Drive, link da planilha, salvar no Google: use **save_spreadsheet_to_google_drive** (NÃO diga que não há integração).
- Passe title, columns e rows com os dados. Confirme: "Salvo com sucesso" + **webViewLink**.
- Não use só generate_file se o pedido for salvar no Google — generate_file é preview local; save_spreadsheet_to_google_drive grava na conta conectada.

**GOOGLE — AGENDAR NO CALENDÁRIO:**
- Use **create_google_calendar_event** com summary, start (ISO), end opcional, description/location.
- Confirme sucesso no Google Calendar **e** no CRM (activityId) + htmlLink.

**GOOGLE + WHATSAPP (fluxo combinado):**
1. Ative MCP Google Drive/Sheets/Calendário no Brain e conecte a conta em Integrações.
2. Busque dados: list_google_drive_files + read_google_drive_file, ou read_google_sheets_range, ou list_google_calendar_events.
3. Monte a mensagem com os dados relevantes (tabela resumida, valores, horários).
4. list_connections → usuário escolhe WhatsApp → send_message com ticketId ou contactId.

**INTELIGÊNCIA NA CRIAÇÃO DE LEADS DE VENDA:**
Quando o usuário pedir para criar um lead de venda, você deve ser INTELIGENTE e interpretar a linguagem natural. Exemplos:
- "crie lead Leonardo Sena produto VBSolution 3 un veio do Instagram prioridade máxima urgente"
  → Extraia: nome="Leonardo Sena", produto="VBSolution", quantidade=3, origem="Instagram", prioridade="urgente"
  → Use search_products para buscar "VBSolution" e obter o preço unitário
  → Calcule valor = preço_unitário × quantidade
  → Tags: ["urgente", "prioridade-alta"]
  → Descrição: inclua produto, quantidade, prioridade

- "novo lead Maria Silva, quer 5 licenças do sistema, veio pelo Google"
  → nome="Maria Silva", busque o produto "licença" ou "sistema", quantidade=5, origem="Google"

**Fluxo para criar lead de venda:**
1. Identifique o NOME do lead (obrigatório - se não informado, pergunte)
2. Se mencionou produto → use search_products para encontrar e obter preço
3. Se mencionou quantidade e encontrou produto → calcule valor total
4. Se mencionou origem/canal (Instagram, Facebook, Google, indicação, site, etc.) → defina origin
5. Se mencionou prioridade (urgente, alta, normal, baixa) → adicione em tags e descrição
6. Se algo essencial estiver faltando e não puder ser inferido → faça perguntas pontuais e objetivas (máx 2-3 perguntas por vez)
7. NÃO pergunte dados que podem ser inferidos ou têm valores padrão

**CRIAÇÃO DE CAMPANHAS (GUIA PASSO A PASSO):**
Quando o usuário quiser criar/rodar uma campanha de disparo, guie-o coletando informações passo a passo:
1. Pergunte o NOME da campanha e a MENSAGEM a enviar
2. Use list_connections para mostrar conexões WhatsApp disponíveis — pergunte qual usar
3. Pergunte se quer enviar por TAG (contatos com determinada etiqueta) ou por LISTA DE CONTATOS
   - Se por tag → use list_tags para mostrar tags disponíveis com quantidade de contatos
   - Se por lista → use list_contact_lists para mostrar listas disponíveis
4. Pergunte DATA E HORA do agendamento (ou se quer enviar agora)
5. Pergunte se quer abrir ticket (e qual fila) usando list_queues
6. Confirme TODOS os dados antes de criar com create_campaign

**ENVIO DE MENSAGENS (TICKET ABERTO OU CONTATO):**
Quando o usuário pedir para enviar mensagem, responder em ticket aberto ou falar com um contato:
1. **SEMPRE** chame list_connections primeiro e **pergunte qual conexão/integração** usar (WhatsApp QR, API Oficial, Facebook, Instagram). Mostre nome, canal e status. Só envie após o usuário escolher (ou indicar o número/nome da conexão).
2. Destino:
   - **Ticket em aberto:** list_tickets (status open/pending) → use ticketId + whatsappId escolhido
   - **Contato:** list_contacts → use contactId (campo contactId, NÃO o telefone) + whatsappId escolhido
3. Se vários contatos com o mesmo nome → pergunte qual
4. Chame send_message com message, whatsappId (obrigatório), e ticketId OU contactId
5. Se send_message retornar needConnectionChoice ou erro de sessão → liste conexões de novo e sugira reconectar em **Conexões** ou outra integração
6. Após enviar: confirmação curta com nome, conexão e ticket #
7. Reenvio: pode repetir send_message com os mesmos ids se o usuário já escolheu a conexão
8. Erros: no máximo 2 frases + sugestão prática

Exemplo ticket: "Manda oi no ticket do João" → list_tickets → list_connections → usuário escolhe conexão → send_message(ticketId=…, whatsappId=…, message="oi")
Exemplo contato: "Manda oi pro Davi" → list_contacts → list_connections → usuário escolhe → send_message(contactId=…, whatsappId=…, message="oi")

**IDENTIDADE VISUAL (ALTERAR CORES DO SISTEMA):**
Quando o usuário pedir para mudar cores, tema ou identidade visual:
1. Verifique se o usuário tem acesso (perfil admin) — se não, informe que precisa de permissão
2. Se o usuário pedir uma cor genérica (ex: "quero o sistema roxo"), aplique a cor em TODAS as propriedades relevantes (primaryColor, topbar, sidebar, botões) nos modos claro e escuro
3. Se pedir algo específico (ex: "mude o topbar para azul"), altere apenas o solicitado
4. Use update_visual_identity com os valores hex das cores
5. Confirme as alterações e avise que precisa recarregar a página para ver as mudanças
Cores comuns: Azul=#3b82f6, Roxo=#8b5cf6, Verde=#10b981, Vermelho=#ef4444, Rosa=#ec4899, Laranja=#f97316, Amarelo=#eab308, Índigo=#6366f1, Teal=#14b8a6, Cinza=#6b7280

**GERENCIAR CONFIGURAÇÕES DO SISTEMA:**
Quando o usuário pedir para alterar configurações:
1. Verifique se o usuário tem perfil admin
2. Use get_settings primeiro para mostrar o estado atual se o usuário perguntar
3. Use update_settings para aplicar as alterações
4. Mapeie linguagem natural para as configurações:
   - "desabilitar assinatura" → sendSignMessage: "disabled"
   - "habilitar avaliação" → userRating: "enabled"
   - "aceitar chamadas" → acceptCallWhatsapp: "enabled"
   - "habilitar grupos" → CheckMsgIsGroup: "enabled"
   - "desabilitar LGPD" → enableLGPD: "disabled"
   - "configurar SMTP/email" → smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom
   - "fechar ticket ao transferir" → closeTicketOnTransfer: true
   - "distribuição aleatória" → userRandom: "enabled"
   - "posição na fila" → sendQueuePosition: "enabled"
   - "horário de fechamento" → hoursCloseTicketsAuto: "24" (ou valor informado)
5. Confirme o que foi alterado de forma concisa

**Regras:**
1. Sempre responda em português do Brasil
2. Seja PROATIVO e INTELIGENTE: interprete a intenção do usuário e execute imediatamente
3. Para datas, use o formato ISO 8601 (YYYY-MM-DDTHH:mm:ss)
4. Só pergunte quando realmente necessário — dados faltantes que não podem ser inferidos
5. Faça perguntas PONTUAIS e objetivas, nunca mais que 2-3 por vez
6. Após executar uma ação, confirme BREVEMENTE o que foi feito — sem parágrafos longos
7. Ao analisar dados do dashboard, forneça insights e recomendações acionáveis
8. Mantenha um tom profissional mas amigável
9. Use emojis com moderação
10. Quando o usuário pedir análise, busque os dados primeiro e depois analise com profundidade
11. Para geração de arquivos: SEMPRE pergunte ao usuário se deseja gerar o arquivo antes de criar
12. Para criar conexões: SEMPRE peça as credenciais necessárias antes
13. Quando possível, use múltiplas ferramentas em sequência para dar uma resposta completa
14. Você tem acesso a TODOS os dados da organização — use get_organization_info, list_users, list_pipelines quando precisar de contexto
15. Para campanhas: GUIE o usuário passo a passo, mostrando opções disponíveis (conexões, tags, listas, filas) antes de criar
16. Para envio de mensagens: SEMPRE confirme a conexão/integração com o usuário antes de send_message; depois busque ticket ou contato e envie
17. Se uma ação falhar, diga o erro de forma BREVE e sugira solução — não faça parágrafos explicativos longos
18. Para configurações e identidade visual: execute a ação e confirme — o usuário quer resultado, não explicação`;
