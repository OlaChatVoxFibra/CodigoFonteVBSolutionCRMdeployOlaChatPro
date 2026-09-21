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
  ForeignKey,
  BelongsTo,
  AutoIncrement
} from "sequelize-typescript";

import QuickMessage from "./QuickMessage";

@Table
class QuickMessageComponent extends Model<QuickMessageComponent> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => QuickMessage)
  @Column
  quickMessageId: number;

  @BelongsTo(() => QuickMessage)
  quickMessage: QuickMessage;

  @Column
  type: string;

  @Column
  text: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @Column
  format: string;

  @Column
  example: string;

  @Column
  buttons: string;
}

export default QuickMessageComponent;
