/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// @ts-ignore: suppress editor diagnostic when local types for sequelize-typescript are not resolved
import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  AllowNull,
  PrimaryKey,
  AutoIncrement,
  Default,
  BelongsTo,
  ForeignKey
} from "sequelize-typescript";
import Contact from "./Contact";
import Ticket from "./Ticket";
import Company from "./Company";
import Queue from "./Queue";
import User from "./User";
import Whatsapp from "./Whatsapp";

@Table
class MessageApi extends Model<MessageApi> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

  @AllowNull(false)
  @Column
  number: string;

  @Column(DataType.TEXT)
  body: string;

  @Column(DataType.TEXT)
  bodyBase64: string;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Queue)
  @Column
  queueId: number;

  @BelongsTo(() => Queue)
  queue: Queue;

  @Default(false)
  @Column
  sendSignature: boolean;

  @Default(false)
  @Column
  closeTicket: boolean;

  @Default(false)
  @Column
  base64: boolean;

  @Column
  schedule: Date;

  @Default(false)
  @Column
  isSending: boolean;

  @Column
  originalName: string;

  @Column
  encoding: string;

  @Column
  mimeType: string;

  @Column
  size: string;

  @Column
  destination: string;

  @Column
  filename: string;

  @Column
  path: string;

  @Column
  buffer: string;

  @Column
  mediaType: string;

  @Column
  mediaUrl: string;

  @Column(DataType.TEXT)
  error: string;

  @Column
  sentAt: Date;

  @CreatedAt
  @Column
  createdAt: Date;

  @UpdatedAt
  @Column
  updatedAt: Date;
}

export default MessageApi;
