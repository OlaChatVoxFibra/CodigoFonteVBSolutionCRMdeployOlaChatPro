/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// src/models/Contact.ts - Versão atualizada com birthDate
import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Unique,
  Default,
  HasMany,
  ForeignKey,
  BelongsTo,
  BelongsToMany,
  DataType,
  HasOne
} from "sequelize-typescript";
import logger from "../utils/logger";
import ContactCustomField from "./ContactCustomField";
import Ticket from "./Ticket";
import Company from "./Company";
import Schedule from "./Schedule";
import ContactTag from "./ContactTag";
import Tag from "./Tag";
import ContactWallet from "./ContactWallet";
import User from "./User";
import Whatsapp from "./Whatsapp";
import WhatsappLidMap from "./WhatsapplidMap";

@Table
class Contact extends Model<Contact> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @AllowNull(false)
  @Unique
  @Column
  number: string;

  @AllowNull(false)
  @Default("")
  @Column
  email: string;

  @Default("")
  @Column
  profilePicUrl: string;

  @Default(false)
  @Column
  isGroup: boolean;

  @Default(false)
  @Column
  disableBot: boolean;

  @Default(true)
  @Column
  acceptAudioMessage: boolean;

  @Default(true)
  @Column
  active: boolean;

  @Default("whatsapp")
  @Column
  channel: string;

  //  NOVA COLUNA: Data de nascimento
  @Column(DataType.DATEONLY)
  birthDate: Date;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @HasMany(() => Ticket)
  tickets: Ticket[];

  @HasMany(() => ContactCustomField)
  extraInfo: ContactCustomField[];

  @HasOne(() => WhatsappLidMap)
  whatsappLidMap: WhatsappLidMap;

  @HasMany(() => ContactTag)
  contactTags: ContactTag[];

  @BelongsToMany(() => Tag, () => ContactTag)
  tags: Tag[];

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @HasMany(() => Schedule, {
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
    hooks: true
  })
  schedules: Schedule[];

  @Column
  remoteJid: string;

  @Column
  lid: string;

  @Column
  lgpdAcceptedAt: Date;

  @Column
  pictureUpdated: boolean;

  @Column
  get urlPicture(): string | null {
    if (this.getDataValue("urlPicture")) {
      return this.getDataValue("urlPicture") === "nopicture.png"
        ? `${process.env.FRONTEND_URL}/nopicture.png`
        : `${process.env.BACKEND_URL}${process.env.PROXY_PORT ? `:${process.env.PROXY_PORT}` : ""
        }/public/company${this.companyId}/contacts/${this.getDataValue(
          "urlPicture"
        )}`;
    }
    return null;
  }

  @BelongsToMany(() => User, () => ContactWallet, "contactId", "walletId")
  wallets: ContactWallet[];

  @HasMany(() => ContactWallet)
  contactWallets: ContactWallet[];

  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  //  MÉTODOS PARA ANIVERSÁRIO

// Adicionar no modelo Contact.ts - Método corrigido para buscar aniversariantes

/**
 * Verifica se hoje é aniversário do contato
 */
get isBirthdayToday(): boolean {
  if (!this.birthDate) return false;

  const moment = require('moment-timezone');
  const today = moment().tz("America/Sao_Paulo");
  const birthDate = moment(this.birthDate).tz("America/Sao_Paulo");

  return (
    today.month() === birthDate.month() &&
    today.date() === birthDate.date()
  );
}

/**
 * Calcula a idade atual do contato
 */
get currentAge(): number | null {
  if (!this.birthDate) return null;

  const moment = require('moment-timezone');
  const today = moment().tz("America/Sao_Paulo");
  const birthDate = moment(this.birthDate).tz("America/Sao_Paulo");

  let age = today.year() - birthDate.year();

  // Ajustar se ainda não fez aniversário este ano
  const monthDiff = today.month() - birthDate.month();
  if (monthDiff < 0 || (monthDiff === 0 && today.date() < birthDate.date())) {
    age--;
  }

  return age;
}

/**
 * Busca todos os contatos aniversariantes de hoje de uma empresa
 */
static async getTodayBirthdays(companyId: number): Promise<Contact[]> {
  const moment = require('moment-timezone');
  const today = moment().tz("America/Sao_Paulo");
  const month = today.month() + 1;
  const day = today.date();

  logger.info(` [Contact.getTodayBirthdays] Buscando aniversariantes - Hoje: ${today.format('DD/MM/YYYY')}`);

  // Buscar todos os contatos com data de nascimento
  const contacts = await Contact.findAll({
    where: {
      companyId,
      active: true,
      birthDate: {
        [require('sequelize').Op.ne]: null
      }
    },
    include: [
      'company',
      'whatsapp',
      {
        model: ContactWallet,
        include: [
          {
            model: User,
            attributes: ['id', 'name']
          }
        ]
      }
    ]
  });

  logger.info(` [Contact.getTodayBirthdays] Total de contatos com birthDate: ${contacts.length}`);

  // Filtrar no JavaScript para evitar problemas de timezone do banco
  const birthdayContacts = contacts.filter(contact => {
    if (!contact.birthDate) return false;

    const birthDate = moment(contact.birthDate).tz("America/Sao_Paulo");
    const birthMonth = birthDate.month() + 1;
    const birthDay = birthDate.date();

    const isToday = birthMonth === month && birthDay === day;

    if (isToday) {
      logger.info(` [Contact.getTodayBirthdays] Aniversariante encontrado: ${contact.name} - ${birthDate.format('DD/MM/YYYY')}`);
    }

    return isToday;
  });

  logger.info(` [Contact.getTodayBirthdays] Aniversariantes de hoje: ${birthdayContacts.length}`);

  return birthdayContacts;
}
}

export default Contact;
