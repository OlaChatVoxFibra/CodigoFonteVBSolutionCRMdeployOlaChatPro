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
  BelongsToMany,
  ForeignKey,
  BelongsTo,
  HasMany
} from "sequelize-typescript";
import Company from "./Company";
import Ticket from "./Ticket";
import TicketTag from "./TicketTag";
import Contact from "./Contact";
import ContactTag from "./ContactTag";

@Table
class Tag extends Model<Tag> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @Column
  color: string;

  @Column
  kanban: number;

  @HasMany(() => TicketTag)
  ticketTags: TicketTag[];

  @BelongsToMany(() => Ticket, () => TicketTag)
  tickets: Ticket[];

  @BelongsToMany(() => Contact, () => ContactTag)
  contacts: Array<Contact & { ContactTag: ContactTag }>;

  @HasMany(() => ContactTag)
  contactTags: ContactTag[];

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @Column
  timeLane: number;

	@Column
  nextLaneId: number;
	
  @Column
  greetingMessageLane: string;

  @Column
  rollbackLaneId: number;

  @Column
  mediaFiles: string;
}

export default Tag;
