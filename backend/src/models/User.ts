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
  DataType,
  BeforeCreate,
  BeforeUpdate,
  PrimaryKey,
  AutoIncrement,
  Default,
  HasMany,
  BelongsToMany,
  ForeignKey,
  BelongsTo,
  BeforeDestroy,
  AfterCreate
} from "sequelize-typescript";
import logger from "../utils/logger"
import { hash, compare } from "bcryptjs";
import Ticket from "./Ticket";
import Queue from "./Queue";
import UserQueue from "./UserQueue";
import Company from "./Company";
import QuickMessage from "./QuickMessage";
import Whatsapp from "./Whatsapp";
import Chatbot from "./Chatbot";
import Chat from "./Chat";
import ChatUser from "./ChatUser";
import ContactWallet from "./ContactWallet";

@Table
class User extends Model<User> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @Column
  email: string;

  @Column(DataType.VIRTUAL)
  password: string;

  @Column
  passwordHash: string;

  @Default(0)
  @Column
  tokenVersion: number;

  @Default("admin")
  @Column
  profile: string;

  @Default(null)
  @Column
  profileImage: string;

  @Column(DataType.DATEONLY)
  birthDate: Date;

  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @Column
  super: boolean;

  @Column
  online: boolean;

  @Column
  lastSeen: Date;

  @Default("00:00")
  @Column
  startWork: string;

  @Default("23:59")
  @Column
  endWork: string;

  @Default("")
  @Column
  color: string;

  @Default("disable")
  @Column
  allTicket: string;

  @Default("own_only")
  @Column
  ticketVisibility: string;

  @Default(false)
  @Column
  allowGroup: boolean;

  @Default("light")
  @Column
  defaultTheme: string;

  @Default("closed")
  @Column
  defaultMenu: string;

  @Default("")
  @Column(DataType.TEXT)
  farewellMessage: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @HasMany(() => Ticket)
  tickets: Ticket[];

  @BelongsToMany(() => Queue, () => UserQueue)
  queues: Queue[];

  @HasMany(() => QuickMessage, {
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
    hooks: true
  })
  quickMessages: QuickMessage[];

  @HasMany(() => ContactWallet)
  contactWallets: ContactWallet[];

  @BeforeUpdate
  @BeforeCreate
  static hashPassword = async (instance: User): Promise<void> => {
    if (instance.password) {
      instance.passwordHash = await hash(instance.password, 8);
    }
  };

  public checkPassword = async (password: string): Promise<boolean> => {
    return compare(password, this.getDataValue("passwordHash"));
  };

  @Default("disabled")
  @Column
  allHistoric: string;

  @HasMany(() => Chatbot, {
    onUpdate: "SET NULL",
    onDelete: "SET NULL",
    hooks: true
  })
  chatbot: Chatbot[];

  @Default("disabled")
  @Column
  allUserChat: string;

  @Default("enabled")
  @Column
  userClosePendingTicket: string;

  @Default("disabled")
  @Column
  showDashboard: string;

  @Default(550)
  @Column
  defaultTicketsManagerWidth: number;

  @Default("disable")
  @Column
  allowRealTime: string;

  @Default("disable")
  @Column
  allowConnections: string;

  @Default("enabled")
  @Column
  showContacts: string;

  @Default("disabled")
  @Column
  showCampaign: string;

  @Default("enabled")
  @Column
  showFlow: string;

  @Default(false)
  @Column
  finalizacaoComValorVendaAtiva: boolean;

  @Default("enabled")
  @Column
  allowSeeMessagesInPendingTickets: string;

  @BeforeDestroy
  static async updateChatbotsUsersReferences(user: User) {
    await Chatbot.update(
      { optUserId: null },
      { where: { optUserId: user.id } }
    );
  }

  // @AfterCreate
  static async createInitialChat(user: User) {
    try {
      const chat = await Chat.create({
        title: user.name,
        isGroup: false,
        companyId: user.companyId,
        ownerId: user.id
      });

      await ChatUser.create({
        chatId: chat.id,
        userId: user.id,
        companyId: user.companyId
      });

      const admin = await User.findOne({
        where: {
          companyId: user.companyId,
          profile: "admin"
        }
      });

      if (admin) {
        await ChatUser.create({
          chatId: chat.id,
          userId: admin.id,
          companyId: user.companyId
        });
      }
    } catch (err) {
      console.error("Error creating initial chat:", err);
    }
  }

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
 * Busca todos os usuários aniversariantes de hoje de uma empresa
 */
static async getTodayBirthdays(companyId: number): Promise<User[]> {
  const moment = require('moment-timezone');
  const today = moment().tz("America/Sao_Paulo");
  const month = today.month() + 1;
  const day = today.date();

  logger.info(` [User.getTodayBirthdays] Buscando aniversariantes - Hoje: ${today.format('DD/MM/YYYY')}`);

  // Buscar todos os usuários com data de nascimento
  const users = await User.findAll({
    where: {
      companyId,
      birthDate: {
        [require('sequelize').Op.ne]: null
      }
    },
    include: ['company']
  });

  logger.info(` [User.getTodayBirthdays] Total de usuários com birthDate: ${users.length}`);

  // Filtrar no JavaScript para evitar problemas de timezone do banco
  const birthdayUsers = users.filter(user => {
    if (!user.birthDate) return false;

    const birthDate = moment(user.birthDate).tz("America/Sao_Paulo");
    const birthMonth = birthDate.month() + 1;
    const birthDay = birthDate.date();

    const isToday = birthMonth === month && birthDay === day;

    if (isToday) {
      logger.info(` [User.getTodayBirthdays] Aniversariante encontrado: ${user.name} - ${birthDate.format('DD/MM/YYYY')}`);
    }

    return isToday;
  });

  logger.info(` [User.getTodayBirthdays] Aniversariantes de hoje: ${birthdayUsers.length}`);

  return birthdayUsers;
}

}

export default User;
