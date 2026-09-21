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
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import Queue from "./Queue";
import Whatsapp from "./Whatsapp";

@Table
class WhatsappQueue extends Model<WhatsappQueue> {
  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @ForeignKey(() => Queue)
  @Column
  queueId: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsTo(() => Queue)
  queue: Queue;
}

export default WhatsappQueue;
