/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  Default,
  HasMany
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";
import EmailTemplateAttachment from "./EmailTemplateAttachment";

@Table({
  tableName: "EmailTemplates"
})
export default class EmailTemplate extends Model<EmailTemplate> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @ForeignKey(() => Company)
  @Column(DataType.INTEGER)
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column(DataType.STRING)
  name: string;

  @Column(DataType.STRING)
  subject: string;

  @Column(DataType.TEXT)
  contentHtml: string;

  @Column(DataType.TEXT)
  contentText: string;

  @ForeignKey(() => User)
  @Column(DataType.INTEGER)
  createdBy: number;

  @BelongsTo(() => User)
  creator: User;

  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive: boolean;

  @Column(DataType.STRING)
  description: string;

  @Column(DataType.INTEGER)
  fontSize: number;

  @Column(DataType.STRING)
  signatureImagePath: string;

  @Column(DataType.BLOB)
  signatureImageData: Buffer;

  @HasMany(() => EmailTemplateAttachment, { as: "attachments", foreignKey: "templateId" })
  attachments: EmailTemplateAttachment[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

