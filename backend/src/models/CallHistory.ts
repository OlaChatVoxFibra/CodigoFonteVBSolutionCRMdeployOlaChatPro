/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  Table,
  Column,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  CreatedAt,
  Default,
  BelongsTo
} from "sequelize-typescript";
import User from "./User";
import Whatsapp from "./Whatsapp";
import Contact from "./Contact";
import Company from "./Company";

@Table({
  tableName: "CallHistory",
  timestamps: false 
})
class CallHistory extends Model<CallHistory> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => User)
  @Column
  user_id: number;

  @BelongsTo(() => User)
  user: User;

  @BelongsTo(() => Company)
  company: Company;

  @Column
  token_wavoip: string;

  @ForeignKey(() => Whatsapp)
  @Column
  whatsapp_id: number;

  @ForeignKey(() => Contact)
  @Column
  contact_id: number;

  @ForeignKey(() => Company)
  @Column
  company_id: number;

  @Column
  phone_to: string;

  @Column
  name: string;

  @Column
  url: string;

  @CreatedAt
  @Default(new Date())
  @Column
  createdAt: Date;

  @CreatedAt
  @Default(new Date())
  @Column
  updatedAt: Date;
}

export default CallHistory;
