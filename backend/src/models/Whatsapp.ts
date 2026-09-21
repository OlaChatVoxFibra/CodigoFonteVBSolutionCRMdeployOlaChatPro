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
  DataType,
  PrimaryKey,
  AutoIncrement,
  Default,
  AllowNull,
  HasMany,
  Unique,
  BelongsToMany,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import Queue from "./Queue";
import Ticket from "./Ticket";
import WhatsappQueue from "./WhatsappQueue";
import Company from "./Company";
import QueueIntegrations from "./QueueIntegrations";
import Prompt from "./Prompt";
import { FlowBuilderModel } from "./FlowBuilder";

@Table
class Whatsapp extends Model<Whatsapp> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull
  @Unique
  @Column(DataType.TEXT)
  name: string;

  @Column(DataType.TEXT)
  session: string;

  @Column(DataType.TEXT)
  qrcode: string;

  @Column
  status: string;

  @Column
  battery: string;

  @Column
  plugged: boolean;

  @Column
  retries: number;

  @Column
  number: string;

  @Default("")
  @Column(DataType.TEXT)
  greetingMessage: string;

  @Column
  greetingMediaAttachment: string;

  @Default("")
  @Column(DataType.TEXT)
  farewellMessage: string;

  @Default("")
  @Column(DataType.TEXT)
  complationMessage: string;

  @Default("")
  @Column(DataType.TEXT)
  outOfHoursMessage: string;

  @Default("inherit")
  @Column
  sendQueueEntryMessage: string;

  @Default("")
  @Column(DataType.TEXT)
  queueEntryMessage: string;

  @Default(true)
  @Column
  queuesEnabled: boolean;

  @Default(false)
  @Column
  sendGreetingMessage: boolean;

  @Default(false)
  @Column
  sendFarewellMessage: boolean;

  @Column({ defaultValue: "stable" })
  provider: string;

  @Default(false)
  @AllowNull
  @Column
  isDefault: boolean;

  @Default(false)
  @AllowNull
  @Column
  allowGroup: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @HasMany(() => Ticket)
  tickets: Ticket[];

  @BelongsToMany(() => Queue, () => WhatsappQueue)
  queues: Array<Queue & { WhatsappQueue: WhatsappQueue }>;

  @HasMany(() => WhatsappQueue)
  whatsappQueues: WhatsappQueue[];

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column(DataType.TEXT)
  token: string;

  @Column(DataType.TEXT)
  facebookUserId: string;

  @Column(DataType.TEXT)
  facebookUserToken: string;

  @Column(DataType.TEXT)
  facebookPageUserId: string;

  @Column(DataType.TEXT)
  tokenMeta: string;

  @Column(DataType.TEXT)
  channel: string;

  @Default(3)
  @Column
  maxUseBotQueues: number;

  @Default(0)
  @Column
  timeUseBotQueues: string;

  @AllowNull(true)
  @Default(0)
  @Column
  expiresTicket: string;

  @Default(0)
  @Column
  timeSendQueue: number;

  @ForeignKey(() => Queue)
  @Column
  sendIdQueue: number;

  @BelongsTo(() => Queue)
  queueSend: Queue;

  @Column
  timeInactiveMessage: string;

  @Column
  inactiveMessage: string;

  @Column
  ratingMessage: string;

  @Column
  maxUseBotQueuesNPS: number;

  @Column
  expiresTicketNPS: number;

  @Column
  whenExpiresTicket: string;

  @Column
  expiresInactiveMessage: string;

  @Default("disabled")
  @Column
  groupAsTicket: string;

  @Column
  importOldMessages: Date;

  @Column
  importRecentMessages: Date;

  @Column
  statusImportMessages: string;

  @Column
  closedTicketsPostImported: boolean;

  @Column
  importOldMessagesGroups: boolean;

  @Column
  timeCreateNewTicket: number;

  @ForeignKey(() => QueueIntegrations)
  @Column
  integrationId: number;

  @BelongsTo(() => QueueIntegrations)
  queueIntegrations: QueueIntegrations;

  @ForeignKey(() => QueueIntegrations)
  @Column
  integrationTypeId: number;

  @BelongsTo(() => QueueIntegrations)
  integrationType: QueueIntegrations;

  @Column({
    type: DataType.JSONB
  })
  schedules: [];

  @ForeignKey(() => Prompt)
  @Column
  promptId: number;

  @BelongsTo(() => Prompt)
  prompt: Prompt;

  @Column
  anthropicMultiAgentId: number;

  @Column
  collectiveVacationMessage: string;

  @Column
  collectiveVacationStart: string;

  @Column
  collectiveVacationEnd: string;

  @ForeignKey(() => Queue)
  @Column
  queueIdImportMessages: number;

  @BelongsTo(() => Queue)
  queueImport: Queue;

  @Column
  phone_number_id: string;

  @Column
  waba_id: string;

  @Column(DataType.TEXT)
  send_token: string;

  @Column
  business_id: string;

  @Column
  phone_number: string;

  @Column
  waba_webhook: string;

  @Column
  waba_webhook_id: number;

  @Column
  meta_quality_rating: string;

  @Column
  meta_messaging_limit: string;

  @Column
  meta_verified_name: string;

  @Column
  meta_phone_status: string;

  @Column
  meta_health_synced_at: Date;

  @Default("")
  @Column
  color: string;

  @Column
  flowInactiveTime: number;

  @Default(1)
  @Column
  maxUseInactiveTime: number;

  @ForeignKey(() => FlowBuilderModel)
  @Column
  flowIdNotPhrase: number;

  @ForeignKey(() => FlowBuilderModel)
  @Column
  flowIdWelcome: number;

  @BelongsTo(() => FlowBuilderModel)
  flowBuilder: FlowBuilderModel;

  @ForeignKey(() => FlowBuilderModel)
  @Column
  flowIdInactiveTime: number;

  @Column
  timeToReturnQueue: number;

  @Column
  triggerIntegrationOnClose: boolean;

  @ForeignKey(() => FlowBuilderModel)
  @Column
  timeAwaitActiveFlowId: number;

  @Column
  timeAwaitActiveFlow: number;

  @Column
  wavoip: string;

  @Column(DataType.VIRTUAL)
  useAgentSettings: boolean;

  @Default(false)
  @AllowNull
  @Column
  agentDisabled: boolean;
}

export default Whatsapp;
