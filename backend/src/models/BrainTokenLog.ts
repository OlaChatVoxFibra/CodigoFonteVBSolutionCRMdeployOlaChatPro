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
  Default,
  AllowNull,
  DataType
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";

@Table({ tableName: "BrainTokenLogs" })
class BrainTokenLog extends Model<BrainTokenLog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @AllowNull(true)
  @Column
  conversationId: number;

  @Default("chat_simples")
  @Column
  actionType: string;

  @Default("openai")
  @Column
  provider: string;

  @AllowNull(true)
  @Column
  model: string;

  @Default(0)
  @Column
  creditsUsed: number;

  @Default(0)
  @Column
  promptTokens: number;

  @Default(0)
  @Column
  completionTokens: number;

  @Default(0)
  @Column
  totalTokens: number;

  @Default(0)
  @Column(DataType.DECIMAL(12, 6))
  costUsdEstimate: number;

  @AllowNull(true)
  @Column(DataType.JSON)
  toolsUsed: string[];

  @AllowNull(true)
  @Column(DataType.JSON)
  metadata: Record<string, unknown>;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default BrainTokenLog;
