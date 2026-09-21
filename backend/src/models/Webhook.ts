/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Model, Table, Column, PrimaryKey, AutoIncrement,DataType, CreatedAt, UpdatedAt } from 'sequelize-typescript';

@Table({
  tableName: "Webhooks"
})
export class WebhookModel extends Model<WebhookModel> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  user_id: number;

  @Column
  hash_id: string;

  @Column
  company_id: number;

  @Column
  name: string;

  @Column
  active: boolean;

  @Column
  requestMonth: number;

  @Column
  requestAll: number;

  @Column(DataType.JSON)
  config: {} | null;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}