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
  HasMany,
  BelongsTo,
  ForeignKey,
  BeforeCreate,
  Default
} from "sequelize-typescript";

import { v4 as uuidv4 } from "uuid";

import ChatMessage from "./ChatMessage";
import ChatUser from "./ChatUser";
import Company from "./Company";
import User from "./User";

@Table({ tableName: "Chats" })
class Chat extends Model<Chat> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Default(uuidv4())
  @Column
  uuid: string;

  @Column({ defaultValue: "" })
  title: string;

  @ForeignKey(() => User)
  @Column
  ownerId: number;

  @Column({ defaultValue: "" })
  lastMessage: string;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @Column
  isGroup: boolean;

  @Column
  groupName: string;

  @Column
  groupAdminId: number;

  @Column({ defaultValue: "" })
  description: string;

  @Column({ defaultValue: "" })
  groupImage: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsTo(() => Company)
  company: Company;

  @BelongsTo(() => User)
  owner: User;

  @BelongsTo(() => User, { foreignKey: "groupAdminId" })
  groupAdmin: User;

  @HasMany(() => ChatUser)
  users: ChatUser[];

  @HasMany(() => ChatMessage)
  messages: ChatMessage[];

  @BeforeCreate
  static setUUID(chat: Chat) {
    chat.uuid = uuidv4();
  }
}

export default Chat;
