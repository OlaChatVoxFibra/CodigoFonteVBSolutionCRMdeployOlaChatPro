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

@Table({ tableName: "PromptAgentMedias" })
class PromptAgentMedia extends Model<PromptAgentMedia> {
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
  slug: string;

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(true)
  @Column
  fileUrl: string;

  @AllowNull(true)
  @Column
  fileType: string;

  @AllowNull(true)
  @Column
  caption: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default PromptAgentMedia;
