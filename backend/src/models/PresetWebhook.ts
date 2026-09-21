/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// src/models/PresetWebhook.ts
import {
  Model,
  Table,
  Column,
  PrimaryKey,
  AutoIncrement,
  DataType,
  CreatedAt,
  UpdatedAt,
  AllowNull,
  Default
} from "sequelize-typescript";

export interface PresetWebhookCreationAttributes {
  name: string;
  description: string;
  provider: string;
  configuration: PresetConfiguration;
  isActive?: boolean;
  isSystem?: boolean;
}

export interface PresetConfiguration {
  url: string;
  method: string;
  headers?: Record<string, string>;
  queryParams?: Array<{ key: string; value: string }>;
  requestBody?: string;
  responseVariables?: Array<{ path: string; variableName: string }>;
  timeout?: number;
  validationFields?: Array<{ field: string; required: boolean; description: string }>;
}

@Table({
  tableName: "PresetWebhooks"
})
export class PresetWebhookModel extends Model<PresetWebhookModel, PresetWebhookCreationAttributes> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(true) // Null para presets do sistema
  @Column(DataType.INTEGER)
  companyId: number;

  @AllowNull(false)
  @Column(DataType.STRING)
  name: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  description: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  provider: string; // 'kiwify', 'mercadopago', 'stripe', etc.

  @AllowNull(false)
  @Column(DataType.JSON)
  configuration: PresetConfiguration;

  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isSystem: boolean; // presets criados pelo sistema vs customizados pelo usuário

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default PresetWebhookModel;