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
  Default
} from "sequelize-typescript";
import Company from "./Company";
import EmailTemplate from "./EmailTemplate";
import User from "./User";

export type EmailCampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "paused"
  | "completed"
  | "failed";

@Table({
  tableName: "EmailCampaigns"
})
export default class EmailCampaign extends Model<EmailCampaign> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @ForeignKey(() => Company)
  @Column(DataType.INTEGER)
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => EmailTemplate)
  @Column(DataType.INTEGER)
  templateId: number;

  @BelongsTo(() => EmailTemplate)
  template: EmailTemplate;

  @Column(DataType.STRING)
  name: string;

  @Column(DataType.STRING)
  subject: string;

  @Default("draft")
  @Column(DataType.STRING)
  status: EmailCampaignStatus;

  @Column(DataType.DATE)
  scheduledAt: Date | null;

  @Column(DataType.DATE)
  sentAt: Date | null;

  @ForeignKey(() => User)
  @Column(DataType.INTEGER)
  createdBy: number;

  @BelongsTo(() => User)
  creator: User;

  @Default(0)
  @Column(DataType.INTEGER)
  totalRecipients: number;

  @Default(0)
  @Column(DataType.INTEGER)
  totalSent: number;

  @Default(0)
  @Column(DataType.INTEGER)
  totalOpened: number;

  @Default(0)
  @Column(DataType.INTEGER)
  totalClicked: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

