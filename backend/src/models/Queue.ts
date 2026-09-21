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
  AutoIncrement,
  AllowNull,
  Unique,
  BelongsToMany,
  BelongsTo,
  ForeignKey,
  HasMany,
  DataType,
  Default,
  BeforeDestroy
} from "sequelize-typescript";
import User from "./User";
import UserQueue from "./UserQueue";
import Company from "./Company";

import Whatsapp from "./Whatsapp";
import WhatsappQueue from "./WhatsappQueue";
import Chatbot from "./Chatbot";
import QueueIntegrations from "./QueueIntegrations";
import Files from "./Files";
import Prompt from "./Prompt";
import ContactWallet from "./ContactWallet";

@Table
class Queue extends Model<Queue> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Unique
  @Column
  name: string;

  @AllowNull(false)
  @Unique
  @Column
  color: string;

  @Default("")
  @Column
  greetingMessage: string;

  @Column
  orderQueue: number;

  @AllowNull(false)
  @Column
  ativarRoteador: boolean;

  @AllowNull(false)
  @Column
  tempoRoteador: number;

  @Default("RANDOM")
  @Column
  typeRandomMode: string;

  @Default("")
  @Column
  outOfHoursMessage: string;

  @Default(true)
  @Column
  sendQueueEntryMessage: boolean;

  @Default("Você está na fila *{{queue}}*. Em breve será atendido!")
  @Column(DataType.TEXT)
  queueEntryMessage: string;

  @Column({
    type: DataType.JSONB
  })
  schedules: [];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @BelongsToMany(() => Whatsapp, () => WhatsappQueue)
  whatsapps: Array<Whatsapp & { WhatsappQueue: WhatsappQueue }>;

  @BelongsToMany(() => User, () => UserQueue)
  users: Array<User & { UserQueue: UserQueue }>;

  @HasMany(() => Chatbot, {
    onDelete: "DELETE",
    onUpdate: "DELETE",
    hooks: true
  })
  chatbots: Chatbot[];

  @ForeignKey(() => QueueIntegrations)
  @Column
  integrationId: number;

  @BelongsTo(() => QueueIntegrations)
  queueIntegrations: QueueIntegrations;

  @ForeignKey(() => Files)
  @Column
  fileListId: number;

  @BelongsTo(() => Files)
  files: Files;

  @Default(false)
  @Column
  closeTicket: boolean;

  @Default(false)
  @Column
  isSystem: boolean;

  @Default(false)
  @Column
  randomizeImmediate: boolean;

  @Default("")
  @Column
  tipoIntegracao: string;

  @HasMany(() => Prompt, {
    onUpdate: "SET NULL",
    onDelete: "SET NULL",
    hooks: true
  })
  prompt: Prompt[];

  @HasMany(() => ContactWallet)
  contactWallets: ContactWallet[];

  @HasMany(() => Chatbot, {
    foreignKey: 'optQueueId', // Chave estrangeira que referencia o ID da fila
    onDelete: 'SET NULL', // Ao excluir uma fila, define optQueueId como null nos chatbots associados
    onUpdate: 'CASCADE', // Ao atualizar o ID da fila, atualiza optQueueId nos chatbots associados
    hooks: true // Ativa hooks para esta associação
  })
  optQueue: Chatbot[];

  @BeforeDestroy
  static async updateChatbotsQueueReferences(queue: Queue) {
    // Atualizar os registros na tabela Chatbots onde optQueueId é igual ao ID da fila que será excluída
    await Chatbot.update({ optQueueId: null }, { where: { optQueueId: queue.id } });
    await Whatsapp.update({ sendIdQueue: null, timeSendQueue: 0 }, { where: { sendIdQueue: queue.id, companyId: queue.companyId } });
    await Prompt.update({ queueId: null }, { where: { queueId: queue.id } });
  }

}

export default Queue;
