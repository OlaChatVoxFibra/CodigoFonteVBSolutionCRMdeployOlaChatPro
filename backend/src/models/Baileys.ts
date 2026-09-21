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
  Default,
  ForeignKey
} from "sequelize-typescript";
import Whatsapp from "./Whatsapp";

@Table
class Baileys extends Model<Baileys> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Default(null)
  @Column
  contacts: string;

  @Default(null)
  @Column
  chats: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;
}

export default Baileys;
