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
  DataType,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";
import Project from "./Project";
import Contact from "./Contact";
import LeadSale from "./LeadSale";

@Table
class Activity extends Model<Activity> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  title: string;

  @Column(DataType.TEXT)
  description: string;

  @Column
  type: string;

  @Column
  status: string;

  @Column
  date: Date;

  @Column
  dateEnd: Date;

  @Column
  owner: string;

  @Column
  location: string;

  @Column
  address: string;

  @Column
  phone: string;

  @Column
  link: string;

  @Column
  eventColor: string;

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

  @ForeignKey(() => Project)
  @Column
  projectId: number;

  @BelongsTo(() => Project)
  project: Project;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

  @ForeignKey(() => LeadSale)
  @Column
  leadId: number;

  @BelongsTo(() => LeadSale)
  lead: LeadSale;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Activity;

