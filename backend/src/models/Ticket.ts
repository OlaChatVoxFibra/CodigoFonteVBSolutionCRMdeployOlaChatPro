/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  HasMany,
  AutoIncrement,
  Default,
  BeforeCreate,
  BelongsToMany,
  AllowNull,
  DataType
} from "sequelize-typescript";
import { randomUUID } from "crypto";

import Contact from "./Contact";
import Message from "./Message";
import Queue from "./Queue";
import User from "./User";
import Whatsapp from "./Whatsapp";
import Company from "./Company";
import Tag from "./Tag";
import TicketTag from "./TicketTag";
import QueueIntegrations from "./QueueIntegrations";
// Removido import de date-fns (não utilizado)

@Table
class Ticket extends Model<Ticket> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column({ defaultValue: "pending" })
  status: string;

  @Column
  unreadMessages: number;

  @Column
  lastMessage: string;

  @Default(false)
  @Column
  isGroup: boolean;

  @Column
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @ForeignKey(() => Queue)
  @Column
  queueId: number;

  @BelongsTo(() => Queue)
  queue: Queue;

  @Default(false)
  @Column
  isBot: boolean;

  @HasMany(() => Message)
  messages: Message[];

  @HasMany(() => TicketTag)
  ticketTags: TicketTag[];

  @BelongsToMany(() => Tag, () => TicketTag)
  tags: Tag[];

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column
  uuid: string;

  @Default("whatsapp")
  @Column
  channel: string;

  @AllowNull(false)
  @Default(0)
  @Column
  amountUsedBotQueues: number;

  @AllowNull(false)
  @Default(0)
  @Column
  amountUsedBotQueuesNPS: number;

  @BeforeCreate
  static setUUID(ticket: Ticket) {
    ticket.uuid = randomUUID();
  }

  @Default(false)
  @Column
  fromMe: boolean;

  @Default(false)
  @Column
  sendInactiveMessage: boolean;

  @Column
  lgpdSendMessageAt: Date;

  @Column
  lgpdAcceptedAt: Date;

  @Column
  imported: Date;

  @Default(false)
  @Column
  isOutOfHour: boolean;

  @Default(false)
  @Column
  useIntegration: boolean;

  @ForeignKey(() => QueueIntegrations)
  @Column
  integrationId: number;

  @BelongsTo(() => QueueIntegrations)
  queueIntegration: QueueIntegrations;

  @Column
  isActiveDemand: boolean;

  @Column
  typebotSessionId: string;

  @Default(false)
  @Column
  typebotStatus: boolean;

  @Column
  typebotSessionTime: Date;

  @Column
  flowWebhook: boolean;

  @Column
  lastFlowId: string;

  @Column
  hashFlowId: string;

  @Column
  flowStopped: string;

  @Column(DataType.JSON)
  dataWebhook: {
    variables?: Record<string, string>;
    pendingQuestion?: string;
    sgp?: {
      cpfUsuario?: string;
      senhaUsuario?: string;
      aguardandoSenha?: boolean;
      aguardandoContrato?: boolean;
      contratoSelecionado?: string;
    };
    agentProactive?: {
      followUpAttempts?: number;
      lastFollowUpAt?: string;
      lastUserInboundAt?: string;
      hotPending?: boolean;
      hotProposalSent?: boolean;
      automationInactive?: boolean;
      inactiveMarkedAt?: string;
      lastReengagementAt?: string;
    };
  } | null;

  @AllowNull(false)
  @Default(0)
  @Column
  maxUseInactiveTime: number;

  @Column({ type: DataType.FLOAT, allowNull: true })
  valorVenda: number | null;

  @Column({ type: DataType.STRING, allowNull: true })
  motivoNaoVenda: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  motivoFinalizacao: string | null;

  @Default(false)
  @Column
  finalizadoComVenda: boolean;
}

export default Ticket;
