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
import Company from "./Company";

@Table({ tableName: "GeminiIntegrations" })
class GeminiIntegration extends Model<GeminiIntegration> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column
  apiKeyEncrypted: string;

  @Column({ defaultValue: false })
  enabled: boolean;

  @Column({ defaultValue: "gemini-2.5-flash" })
  defaultModel: string;

  @Column({ defaultValue: "Pessoal" })
  scope: string;

  @Column({ defaultValue: 1 })
  temperature: number;

  @Column({ defaultValue: 0.95 })
  topP: number;

  @Column({ defaultValue: 40 })
  topK: number;

  @Column({ defaultValue: 8192 })
  maxOutputTokens: number;

  @Column({ defaultValue: true })
  multimodalEnabled: boolean;

  @Column({ defaultValue: true })
  toolsEnabled: boolean;

  @Column({ defaultValue: false })
  groundingEnabled: boolean;

  @Column
  capabilitiesJson: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default GeminiIntegration;
