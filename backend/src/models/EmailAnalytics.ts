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

@Table({
  tableName: "EmailAnalytics"
})
export default class EmailAnalytics extends Model<EmailAnalytics> {
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

  @Index
  @Column(DataType.DATEONLY)
  date: string;

  @Column(DataType.INTEGER)
  totalSent: number;

  @Column(DataType.INTEGER)
  totalOpened: number;

  @Column(DataType.INTEGER)
  totalClicked: number;

  @Column(DataType.INTEGER)
  totalBounced: number;

  @Column(DataType.INTEGER)
  unsubscribeCount: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

