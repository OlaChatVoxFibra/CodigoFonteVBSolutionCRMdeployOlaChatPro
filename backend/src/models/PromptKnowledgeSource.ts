/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  AllowNull,
  AutoIncrement,
  BelongsTo,
  Column,
  CreatedAt,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt
} from "sequelize-typescript";
import Company from "./Company";
import Prompt from "./Prompt";

@Table({ tableName: "PromptKnowledgeSources" })
class PromptKnowledgeSource extends Model<PromptKnowledgeSource> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => Prompt)
  @Column
  promptId: number;

  @BelongsTo(() => Prompt)
  prompt: Prompt;

  @AllowNull(false)
  @Column
  sourceType: string;

  @AllowNull(true)
  @Column
  title: string;

  @AllowNull(true)
  @Column({ type: "text" })
  content: string;

  @AllowNull(true)
  @Column
  fileUrl: string;

  @AllowNull(true)
  @Column({ type: "json" })
  metadata: Record<string, unknown>;

  @AllowNull(true)
  @Column({ type: "text" })
  embeddings: string;

  @AllowNull(true)
  @Column
  openAiFileId: string;

  @AllowNull(true)
  @Column
  openAiVectorStoreId: string;

  @AllowNull(true)
  @Column({ defaultValue: "pending" })
  indexStatus: string;

  @AllowNull(true)
  @Column
  indexedAt: Date;

  @AllowNull(true)
  @Column({ type: "text" })
  indexError: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default PromptKnowledgeSource;
