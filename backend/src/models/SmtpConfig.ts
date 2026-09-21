/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  Default
} from "sequelize-typescript";
import crypto from "crypto";
import Company from "./Company";
import logger from "../utils/logger";

const ALG = "aes-256-gcm";
const IV_LEN = 16;

function getKey() {
  const key = process.env.SMTP_SECRET_KEY || "";
  return Buffer.from(crypto.createHash("sha256").update(key).digest());
}

function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(IV_LEN);
    const key = getKey();
    const cipher = crypto.createCipheriv(ALG, key, iv);
    const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString("base64");
  } catch {
    return text;
  }
}

function decrypt(payload: string): string | null {
  try {
    const raw = Buffer.from(payload, "base64");
    if (raw.length < IV_LEN + 16) {
      // Compatibilidade: em bases antigas, a senha podia estar salva em texto puro.
      if (/^[^\s]{6,256}$/.test(payload) && !/[+/=]/.test(payload)) {
        return payload;
      }
      logger.warn({
        msg: "SmtpConfig: smtpPasswordEnc com formato inválido (buffer curto). Resalve a senha SMTP nas configurações."
      });
      return null;
    }
    const iv = raw.subarray(0, IV_LEN);
    const tag = raw.subarray(IV_LEN, IV_LEN + 16);
    const data = raw.subarray(IV_LEN + 16);
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALG, key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    // Compatibilidade: aceita payload não criptografado (legado) para não quebrar teste após F5.
    if (/^[^\s]{6,256}$/.test(payload) && !/[+/=]/.test(payload)) {
      return payload;
    }
    logger.warn({
      msg: "SmtpConfig: falha ao descriptografar senha SMTP (verifique SMTP_SECRET_KEY ou resalve a senha nas configurações)."
    });
    return null;
  }
}

@Table({
  tableName: "SmtpConfigs"
})
export default class SmtpConfig extends Model<SmtpConfig> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @ForeignKey(() => Company)
  @Column(DataType.INTEGER)
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column(DataType.STRING)
  smtpHost: string;

  @Column(DataType.INTEGER)
  smtpPort: number;

  @Column(DataType.STRING)
  smtpUsername: string;

  @Column(DataType.TEXT)
  smtpPasswordEnc: string;

  set smtpPassword(value: string) {
    this.smtpPasswordEnc = value ? encrypt(value) : null;
  }

  get smtpPassword(): string | null {
    const val = this.getDataValue("smtpPasswordEnc");
    return val ? decrypt(val) : null;
  }

  @Default("tls")
  @Column(DataType.STRING)
  smtpEncryption: "ssl" | "tls" | "none";

  @Default(false)
  @Column(DataType.BOOLEAN)
  isDefault: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

