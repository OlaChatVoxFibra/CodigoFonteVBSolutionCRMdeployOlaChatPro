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
import {
  decryptGithubSecret,
  encryptGithubSecret
} from "../services/GithubServices/githubTokenCrypto";

export type GithubIntegrationStatus =
  | "connected"
  | "disconnected"
  | "error";

export type GithubAuthType = "pat" | "oauth";

@Table({
  tableName: "integrations_github",
  underscored: true,
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at"
})
class GithubIntegration extends Model<GithubIntegration> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  workspaceId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column({ defaultValue: "pat" })
  authType: GithubAuthType;

  @Column(DataType.TEXT)
  patEnc: string;

  @Column(DataType.TEXT)
  oauthTokenEnc: string;

  @Column
  githubLogin: string;

  @Column
  githubName: string;

  @Column
  avatarUrl: string;

  @Column
  oauthScope: string;

  @Column({ defaultValue: true })
  enableBrainAi: boolean;

  @Column({ defaultValue: true })
  enablePublish: boolean;

  @Column({ defaultValue: true })
  enableReposRead: boolean;

  @Column({ defaultValue: "disconnected" })
  status: GithubIntegrationStatus;

  @Column
  lastSyncAt: Date | null;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  getPat(): string | null {
    if (!this.patEnc) return null;
    return decryptGithubSecret(this.patEnc);
  }

  setPat(token: string): void {
    this.patEnc = encryptGithubSecret(token);
  }

  getOauthToken(): string | null {
    if (!this.oauthTokenEnc) return null;
    return decryptGithubSecret(this.oauthTokenEnc);
  }

  setOauthToken(token: string): void {
    this.oauthTokenEnc = encryptGithubSecret(token);
  }
}

export default GithubIntegration;
