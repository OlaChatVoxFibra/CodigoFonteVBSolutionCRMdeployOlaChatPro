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
  ForeignKey,
  BelongsTo,
  DataType
} from "sequelize-typescript";
import Company from "./Company";
import AiBrainConversation from "./AiBrainConversation";

@Table({ tableName: "AiBrainMessages" })
class AiBrainMessage extends Model<AiBrainMessage> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column({ defaultValue: "user" })
  role: string;

  @Column(DataType.TEXT)
  content: string;

  @Column(DataType.JSON)
  toolCalls: any;

  @ForeignKey(() => AiBrainConversation)
  @Column
  conversationId: number;

  @BelongsTo(() => AiBrainConversation)
  conversation: AiBrainConversation;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AiBrainMessage;
