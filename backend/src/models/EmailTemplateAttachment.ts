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
  Index
} from "sequelize-typescript";
import Company from "./Company";
import EmailTemplate from "./EmailTemplate";

@Table({
  tableName: "EmailTemplateAttachments"
})
export default class EmailTemplateAttachment extends Model<EmailTemplateAttachment> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @ForeignKey(() => Company)
  @Index
  @Column(DataType.INTEGER)
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => EmailTemplate)
  @Index
  @Column(DataType.INTEGER)
  templateId: number;

  @BelongsTo(() => EmailTemplate)
  template: EmailTemplate;

  @Column(DataType.STRING)
  filename: string;

  @Column(DataType.STRING)
  path: string;

  @Column(DataType.INTEGER)
  size: number;

  @Column(DataType.STRING)
  mimetype: string;

  @Column(DataType.BLOB)
  data: Buffer;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

