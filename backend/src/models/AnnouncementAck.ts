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
  BelongsTo
} from "sequelize-typescript";
import Announcement from "./Announcement";
import Company from "./Company";

@Table({
  tableName: "AnnouncementAcks"
})
class AnnouncementAck extends Model<AnnouncementAck> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Announcement)
  @Column
  announcementId: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Announcement)
  announcement: Announcement;

  @BelongsTo(() => Company)
  company: Company;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AnnouncementAck;
