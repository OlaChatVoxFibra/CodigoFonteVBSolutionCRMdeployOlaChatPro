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
  BelongsTo
} from "sequelize-typescript";
import Company from "./Company";
import EmailCampaign from "./EmailCampaign";
import EmailContact from "./EmailContact";

export type EmailScheduleStatus =
  | "scheduled"
  | "sent"
  | "failed"
  | "canceled"
  | "retrying";

@Table({
  tableName: "EmailSchedules"
})
export default class EmailSchedule extends Model<EmailSchedule> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @ForeignKey(() => Company)
  @Column(DataType.INTEGER)
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => EmailCampaign)
  @Column(DataType.INTEGER)
  campaignId: number;

  @BelongsTo(() => EmailCampaign)
  campaign: EmailCampaign;

  @ForeignKey(() => EmailContact)
  @Column(DataType.INTEGER)
  contactId: number;

  @BelongsTo(() => EmailContact)
  contact: EmailContact;

  @Column(DataType.DATE)
  scheduledAt: Date | null;

  @Column(DataType.DATE)
  sentAt: Date | null;

  @Column(DataType.STRING)
  status: EmailScheduleStatus;

  @Column(DataType.TEXT)
  errorMessage: string | null;

  @Column(DataType.INTEGER)
  retryCount: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

