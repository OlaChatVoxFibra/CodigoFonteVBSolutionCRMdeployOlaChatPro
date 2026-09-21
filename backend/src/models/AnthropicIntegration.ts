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
  BelongsTo
} from "sequelize-typescript";
import Company from "./Company";

@Table({ tableName: "AnthropicIntegrations" })
class AnthropicIntegration extends Model<AnthropicIntegration> {
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
  apiKeyEncrypted: string;

  @Column({ defaultValue: false })
  enabled: boolean;

  @Column({ defaultValue: "claude-3-7-sonnet-latest" })
  defaultModel: string;

  @Column({ defaultValue: "Pessoal" })
  scope: string;

  @Column({ defaultValue: 1 })
  temperature: number;

  @Column({ defaultValue: 1 })
  topP: number;

  @Column({ defaultValue: 0 })
  presencePenalty: number;

  @Column({ defaultValue: 0 })
  frequencyPenalty: number;

  @Column
  stopSequences: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AnthropicIntegration;
