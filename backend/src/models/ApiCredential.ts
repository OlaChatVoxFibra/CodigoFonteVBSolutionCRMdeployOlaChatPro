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
  BelongsTo,
  DataType
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";

export type ApiCredentialScope =
  | "contacts:read"
  | "contacts:write"
  | "activities:read"
  | "activities:write"
  | "leads:read"
  | "leads:write"
  | "tickets:read"
  | "dashboard:read"
  | "organization:read"
  | "tools:execute"
  | "full";

@Table({
  tableName: "api_credentials",
  underscored: true,
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at"
})
class ApiCredential extends Model<ApiCredential> {
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
  name: string;

  @Column
  keyPrefix: string;

  @Column
  keyHash: string;

  @Column(DataType.TEXT)
  keyEncrypted: string | null;

  @Column(DataType.JSONB)
  scopes: ApiCredentialScope[];

  @ForeignKey(() => User)
  @Column
  createdByUserId: number | null;

  @BelongsTo(() => User)
  createdByUser: User;

  @Column
  lastUsedAt: Date | null;

  @Column
  expiresAt: Date | null;

  @Column
  revokedAt: Date | null;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ApiCredential;
