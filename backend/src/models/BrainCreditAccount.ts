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
  Default,
  AllowNull
} from "sequelize-typescript";
import Company from "./Company";

@Table({ tableName: "BrainCreditAccounts" })
class BrainCreditAccount extends Model<BrainCreditAccount> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Default(0)
  @Column
  balance: number;

  @Default(100)
  @Column
  monthlyQuota: number;

  @AllowNull(true)
  @Column
  brainAddonPlan: string;

  @AllowNull(true)
  @Column
  cycleStartAt: Date;

  @AllowNull(true)
  @Column
  cycleEndsAt: Date;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default BrainCreditAccount;
