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

@Table({ tableName: "AnthropicMultiAgents" })
class AnthropicMultiAgent extends Model<AnthropicMultiAgent> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column
  name: string;

  @Column
  systemPrompt: string;

  @Column({ defaultValue: "claude-3-7-sonnet-latest" })
  model: string;

  @Column({ defaultValue: 1 })
  temperature: number;

  @Column({ defaultValue: 1 })
  topP: number;

  @Column({ defaultValue: true })
  enabled: boolean;

  @Column({ type: DataType.JSONB, allowNull: true })
  profileJson: Record<string, unknown> | null;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AnthropicMultiAgent;
