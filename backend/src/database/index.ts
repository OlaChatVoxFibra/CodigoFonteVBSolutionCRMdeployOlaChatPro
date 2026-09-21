/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Sequelize } from "sequelize-typescript";
import logger from "../utils/logger";
import User from "../models/User";
import Setting from "../models/Setting";
import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import Whatsapp from "../models/Whatsapp";
import ContactCustomField from "../models/ContactCustomField";
import Message from "../models/Message";
import Queue from "../models/Queue";
import WhatsappQueue from "../models/WhatsappQueue";
import UserQueue from "../models/UserQueue";
import Company from "../models/Company";
import Plan from "../models/Plan";
import TicketNote from "../models/TicketNote";
import QuickMessage from "../models/QuickMessage";
import Help from "../models/Help";
import TicketTraking from "../models/TicketTraking";
import UserRating from "../models/UserRating";
import Schedule from "../models/Schedule";
import Tag from "../models/Tag";
import TicketTag from "../models/TicketTag";
import ContactList from "../models/ContactList";
import ContactListItem from "../models/ContactListItem";
import Campaign from "../models/Campaign";
import CampaignSetting from "../models/CampaignSetting";
import Baileys from "../models/Baileys";
import CampaignShipping from "../models/CampaignShipping";
import Announcement from "../models/Announcement";
import AnnouncementAck from "../models/AnnouncementAck";
import Chat from "../models/Chat";
import ChatUser from "../models/ChatUser";
import ChatMessage from "../models/ChatMessage";
import Chatbot from "../models/Chatbot";
import DialogChatBots from "../models/DialogChatBots";
import QueueIntegrations from "../models/QueueIntegrations";
import Invoices from "../models/Invoices";
import Subscriptions from "../models/Subscriptions";
import ApiUsages from "../models/ApiUsages";
import Files from "../models/Files";
import FilesOptions from "../models/FilesOptions";
import ContactTag from "../models/ContactTag";
import CompaniesSettings from "../models/CompaniesSettings";
import LogTicket from "../models/LogTicket";
import Prompt from "../models/Prompt";
import Partner from "../models/Partner";
import ContactWallet from "../models/ContactWallet";
import ScheduledMessages from "../models/ScheduledMessages";
import ScheduledMessagesEnvio from "../models/ScheduledMessagesEnvio";
import Versions from "../models/Versions";
import QuickMessageComponent from "../models/QuickMessageComponent";
import BirthdaySettings from "../models/BirthdaySettings";
import { FlowDefaultModel } from "../models/FlowDefault";
import { FlowBuilderModel } from "../models/FlowBuilder";
import { FlowAudioModel } from "../models/FlowAudio";
import { FlowDocModel } from "../models/FlowDoc";
import { FlowCampaignModel } from "../models/FlowCampaign";
import { FlowImgModel } from "../models/FlowImg";
import { WebhookModel } from "../models/Webhook";
import QueueState from "../models/QueueStates";
import TicketFinalizationReason from "../models/TicketFinalizationReason";
import PresetWebhookModel from "../models/PresetWebhook";
import WhatsappLidMap from "../models/WhatsapplidMap";
import CallHistory from "../models/CallHistory";
import CompanyKanbanConfig from "../models/CompanyKanbanConfig";
import MessageApi from "../models/MessageApi";
import Activity from "../models/Activity";
import Project from "../models/Project";
import ConvertedLead from "../models/ConvertedLead";
import LeadSale from "../models/LeadSale";
import EmailTemplate from "../models/EmailTemplate";
import EmailContact from "../models/EmailContact";
import EmailCampaign from "../models/EmailCampaign";
import EmailSchedule from "../models/EmailSchedule";
import EmailLog from "../models/EmailLog";
import SmtpConfig from "../models/SmtpConfig";
import EmailAnalytics from "../models/EmailAnalytics";
import Inventory from "../models/Inventory";
import EmailTemplateAttachment from "../models/EmailTemplateAttachment";
import LeadPipeline from "../models/LeadPipeline";
import LeadPipelineStage from "../models/LeadPipelineStage";
import ActivityStage from "../models/ActivityStage";
import PaymentConfirmationToken from "../models/PaymentConfirmationToken";
import PasswordResetToken from "../models/PasswordResetToken";
import AttendanceFlowStep from "../models/AttendanceFlowStep";
import AttendanceFlowDefinition from "../models/AttendanceFlowDefinition";
import PromptFaqItem from "../models/PromptFaqItem";
import PromptSmartAction from "../models/PromptSmartAction";
import PromptAgentMedia from "../models/PromptAgentMedia";
import PromptKnowledgeSource from "../models/PromptKnowledgeSource";
import AiBrainConversation from "../models/AiBrainConversation";
import AiBrainProject from "../models/AiBrainProject";
import BrainGithubConnection from "../models/BrainGithubConnection";
import AiBrainCodeWorkspace from "../models/AiBrainCodeWorkspace";
import AiBrainMessage from "../models/AiBrainMessage";
import BrainCreditAccount from "../models/BrainCreditAccount";
import BrainTokenLog from "../models/BrainTokenLog";
import AnthropicIntegration from "../models/AnthropicIntegration";
import AnthropicMultiAgent from "../models/AnthropicMultiAgent";
import GeminiIntegration from "../models/GeminiIntegration";
import GrokIntegration from "../models/GrokIntegration";
import FigmaIntegration from "../models/FigmaIntegration";
import GithubIntegration from "../models/GithubIntegration";
import ApiCredential from "../models/ApiCredential";

// eslint-disable-next-line
const dbConfig = require("../config/database");

let sequelize: Sequelize;
const rawDatabaseUrl = process.env.DATABASE_URL;
const databaseUrl = rawDatabaseUrl ? rawDatabaseUrl.replace(/\s+/g, "") : "";
if (databaseUrl) {
  try {
    const u = new URL(databaseUrl);
    const parsed = {
      database: decodeURIComponent((u.pathname || "").replace(/^\//, "")),
      username: decodeURIComponent(u.username || ""),
      password: decodeURIComponent(u.password || ""),
      host: u.hostname,
      port: u.port ? Number(u.port) : 5432
    };
    process.env.PGHOST = parsed.host;
    process.env.PGPORT = String(parsed.port);
    process.env.PGDATABASE = parsed.database;
    process.env.PGUSER = parsed.username;
    process.env.PGPASSWORD = parsed.password;
    // Evitar que bibliotecas usem DB_* antigos por engano
    delete (process.env as any).DB_HOST;
    delete (process.env as any).DB_PORT;
    delete (process.env as any).DB_NAME;
    delete (process.env as any).DB_USER;
    delete (process.env as any).DB_PASS;
    sequelize = new Sequelize({
      database: parsed.database,
      username: parsed.username,
      password: parsed.password,
      host: parsed.host,
      port: parsed.port,
      dialect: (process.env.DB_DIALECT as any) || "postgres",
      dialectOptions: dbConfig?.dialectOptions,
      pool: dbConfig?.pool,
      logging: dbConfig?.logging,
      timezone: dbConfig?.timezone,
      define: dbConfig?.define,
      hooks: {
        beforeConnect: (cfg: any) => {
          try { logger.info({ msg: "DB beforeConnect", host: cfg.host, port: cfg.port }); } catch {}
        },
        afterConnect: (_c: any, _d: any) => {
          try { logger.info({ msg: "DB afterConnect OK", host: parsed.host, port: parsed.port }); } catch {}
        }
      }
    } as any);
    try { logger.info(`DB: usando URL → host ${parsed.host}:${parsed.port}`); } catch {}
  } catch (e) {
    sequelize = new Sequelize(databaseUrl, {
      dialect: (process.env.DB_DIALECT as any) || "postgres",
      dialectOptions: dbConfig?.dialectOptions,
      pool: dbConfig?.pool,
      logging: dbConfig?.logging,
      timezone: dbConfig?.timezone,
      define: dbConfig?.define
    } as any);
    try {
      logger.info("DB: usando DATABASE_URL (fallback, sanitized)");
    } catch {}
  }
} else {
  sequelize = new Sequelize(dbConfig as any);
  try { logger.info(`DB: usando DB_HOST ${process.env.DB_HOST}:${process.env.DB_PORT || "5432"}`); } catch {}
}

const models = [
  Company,
  User,
  Contact,
  ContactTag,
  Ticket,
  Message,
  Whatsapp,
  ContactCustomField,
  Setting,
  Queue,
  WhatsappQueue,
  UserQueue,
  Plan,
  TicketNote,
  QuickMessage,
  Help,
  TicketTraking,
  UserRating,
  Schedule,
  Tag,
  TicketTag,
  ContactList,
  ContactListItem,
  Campaign,
  CampaignSetting,
  Baileys,
  CampaignShipping,
  Announcement,
  AnnouncementAck,
  Chat,
  ChatUser,
  ChatMessage,
  Chatbot,
  DialogChatBots,
  QueueIntegrations,
  Invoices,
  Subscriptions,
  ApiUsages,
  Files,
  FilesOptions,
  CompaniesSettings,
  LogTicket,
  Prompt,
  Partner,
  ContactWallet,
  ScheduledMessages,
  ScheduledMessagesEnvio,
  Versions,
  QuickMessageComponent,
  FlowDefaultModel,
  FlowBuilderModel,
  FlowAudioModel,
  FlowCampaignModel,
  FlowImgModel,
  FlowDocModel,
  WebhookModel,
  QueueState,
  TicketFinalizationReason,
  PresetWebhookModel,
  BirthdaySettings,
  WhatsappLidMap,
  CallHistory,
  CompanyKanbanConfig,
  MessageApi,
  Activity,
  Project,
  ConvertedLead,
  LeadSale,
  EmailTemplate,
  EmailTemplateAttachment,
  EmailContact,
  EmailCampaign,
  EmailSchedule,
  EmailLog,
  SmtpConfig,
  EmailAnalytics,
  Inventory,
  LeadPipeline,
  LeadPipelineStage,
  ActivityStage,
  PaymentConfirmationToken,
  PasswordResetToken,
  AttendanceFlowStep,
  AttendanceFlowDefinition,
  PromptFaqItem,
  PromptSmartAction,
  PromptAgentMedia,
  PromptKnowledgeSource,
  AiBrainConversation,
  AiBrainMessage,
  BrainCreditAccount,
  BrainTokenLog,
  AiBrainProject,
  AiBrainCodeWorkspace,
  BrainGithubConnection,
  AnthropicIntegration,
  GeminiIntegration,
  GrokIntegration,
  FigmaIntegration,
  GithubIntegration,
  AnthropicMultiAgent,
  ApiCredential
];

sequelize.addModels(models);

export default sequelize;
