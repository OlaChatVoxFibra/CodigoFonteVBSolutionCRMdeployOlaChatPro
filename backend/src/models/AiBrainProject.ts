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
  HasMany,
  DataType
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";
import AiBrainConversation from "./AiBrainConversation";
import AiBrainCodeWorkspace from "./AiBrainCodeWorkspace";

@Table({ tableName: "AiBrainProjects" })
class AiBrainProject extends Model<AiBrainProject> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  title: string;

  @Column(DataType.TEXT)
  description: string;

  @Column({ defaultValue: "#8b5cf6" })
  accentColor: string;

  @Column(DataType.JSON)
  codeFiles: Record<string, string> | null;

  @Column({ defaultValue: "index.html" })
  activePath: string;

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

  @HasMany(() => AiBrainConversation)
  conversations: AiBrainConversation[];

  @HasMany(() => AiBrainCodeWorkspace)
  codeWorkspaces: AiBrainCodeWorkspace[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AiBrainProject;
