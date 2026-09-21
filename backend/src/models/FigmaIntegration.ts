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

export type FigmaIntegrationStatus =
  | "connected"
  | "disconnected"
  | "error"
  | "syncing";

@Table({
  tableName: "integrations_figma",
  underscored: true,
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at"
})
class FigmaIntegration extends Model<FigmaIntegration> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  workspaceId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column
  credential: string;

  @Column({ defaultValue: true })
  enableBrainAi: boolean;

  @Column({ defaultValue: true })
  enablePrototypeAnalysis: boolean;

  @Column({ defaultValue: false })
  enableCommentsSync: boolean;

  @Column({ defaultValue: true })
  enableDesignSystem: boolean;

  @Column({ defaultValue: "disconnected" })
  status: FigmaIntegrationStatus;

  @Column
  lastSyncAt: Date | null;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default FigmaIntegration;
