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
import {
  decryptGithubSecret,
  encryptGithubSecret
} from "../services/GithubServices/githubTokenCrypto";

@Table({ tableName: "BrainGithubConnections" })
class BrainGithubConnection extends Model<BrainGithubConnection> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @Column
  githubLogin: string;

  @Column
  githubName: string;

  @Column
  avatarUrl: string;

  @Column(DataType.TEXT)
  accessTokenEnc: string;

  @Column
  scope: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  getAccessToken(): string | null {
    return decryptGithubSecret(this.accessTokenEnc);
  }

  setAccessToken(token: string): void {
    this.accessTokenEnc = encryptGithubSecret(token);
  }
}

export default BrainGithubConnection;
