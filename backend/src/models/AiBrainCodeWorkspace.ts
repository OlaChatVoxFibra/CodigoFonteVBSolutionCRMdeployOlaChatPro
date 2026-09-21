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
import User from "./User";
import AiBrainProject from "./AiBrainProject";

@Table({ tableName: "AiBrainCodeWorkspaces" })
class AiBrainCodeWorkspace extends Model<AiBrainCodeWorkspace> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => AiBrainProject)
  @Column
  brainProjectId: number;

  @BelongsTo(() => AiBrainProject)
  brainProject: AiBrainProject;

  @Column
  title: string;

  @Column(DataType.JSON)
  codeFiles: Record<string, string> | null;

  @Column({ defaultValue: "index.html" })
  activePath: string;

  @Column({ defaultValue: 0 })
  sortOrder: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AiBrainCodeWorkspace;
