/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  AllowNull,
  AutoIncrement,
  BelongsTo,
  Column,
  CreatedAt,
  ForeignKey,
  HasMany,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt
} from "sequelize-typescript";
import Queue from "./Queue";
import Company from "./Company";
import AttendanceFlowStep from "./AttendanceFlowStep";

@Table
class Prompt extends Model<Prompt> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(false)
  @Column
  prompt: string;

  @AllowNull(false)
  @Column
  apiKey: string;

  @Column({ defaultValue: 10 })
  maxMessages: number;

  @Column({ defaultValue: 2200 })
  maxTokens: number;

  @Column({ defaultValue: 1 })
  temperature: number;

  @Column({ defaultValue: 0 })
  promptTokens: number;

  @Column({ defaultValue: 0 })
  completionTokens: number;

  @Column({ defaultValue: 0 })
  totalTokens: number;

  @Column({ defaultValue: "gpt-5.5" })
  model: string;

  @AllowNull(false)
  @Column
  voice: string;

  @AllowNull(true)
  @Column
  voiceKey:string;

  @AllowNull(true)
  @Column
  voiceRegion:string;

  @AllowNull(true)
  @Column({ type: "json" })
  cargo: any;

  @AllowNull(true)
  @Column({ type: "json" })
  cerebro: any;

  @AllowNull(true)
  @Column({ type: "json" })
  produtividade: any;

  @AllowNull(true)
  @Column({ type: "json" })
  midias: any;

  @AllowNull(true)
  @ForeignKey(() => Queue)
  @Column
  queueId: number | null;

  @BelongsTo(() => Queue)
  queue: Queue;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @HasMany(() => AttendanceFlowStep, {
    foreignKey: "promptId",
    as: "attendanceFlowSteps"
  })
  attendanceFlowSteps: AttendanceFlowStep[];

  @AllowNull(true)
  @Column
  description: string;

  @AllowNull(true)
  @Column
  role: string;

  @AllowNull(true)
  @Column
  language: string;

  @Column({ defaultValue: true })
  emojisEnabled: boolean;

  @AllowNull(true)
  @Column
  responseDelay: number;

  @AllowNull(true)
  @Column({ type: "text" })
  generalRules: string;

  @AllowNull(true)
  @Column({ type: "text" })
  attendanceScript: string;

  @Column({ defaultValue: true })
  faqEnabled: boolean;

  @Column({ defaultValue: true })
  knowledgeEnabled: boolean;

  @AllowNull(true)
  @Column
  linkedAgentId: number;

  @AllowNull(true)
  @Column
  agentColor: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Prompt;
