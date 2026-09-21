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
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt
} from "sequelize-typescript";
import Prompt from "./Prompt";
import Company from "./Company";

@Table
class AttendanceFlowStep extends Model<AttendanceFlowStep> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  stepNumber: number;

  @AllowNull(false)
  @Column({ type: "text" })
  agentPrompt: string;

  @AllowNull(true)
  @Column({ type: "json" })
  responseOptions: any;

  @AllowNull(true)
  @Column({ type: "json" })
  conditions: any;

  /** Anexos deste passo: [{ url, kind, originalName?, mimeType?, size? }] */
  @AllowNull(true)
  @Column({ type: "json" })
  attachments: any;

  /**
   * IR compilado pelo `compileAttendanceFlowIR`. Todas as colunas são opcionais
   * para manter retrocompat com agentes salvos antes do compilador novo.
   */

  /** Título humano da etapa (auto-gerado se ausente). */
  @AllowNull(true)
  @Column({ type: "string" })
  title: string | null;

  /** Objetivo (1 linha) — o que o agente precisa conseguir com essa etapa. */
  @AllowNull(true)
  @Column({ type: "text" })
  objective: string | null;

  /** Tipo esperado de resposta: text | choice | date | number | yes_no | open | none */
  @AllowNull(true)
  @Column({ type: "string" })
  expectedReply: string | null;

  /** Nome do slot no `answersByStep` (ex.: preferredDate, groupSize). */
  @AllowNull(true)
  @Column({ type: "string" })
  slotName: string | null;

  /** Regras do slot: { regex?, min?, max?, choices?: [...] } */
  @AllowNull(true)
  @Column({ type: "json" })
  slotSchema: any;

  /**
   * Branches semânticos/lógicos derivados do roteiro.
   * `[{ matcher: 'choice'|'regex'|'semantic'|'always', value, nextStepId, label }]`
   */
  @AllowNull(true)
  @Column({ type: "json" })
  branchesIR: any;

  /**
   * Gatilhos da etapa (hooks de ações inteligentes).
   * `[{ slug, smartActionId?, when: 'on_present'|'after_reply'|'on_enter'|'on_exit', deferred?: bool, kind?: string }]`
   */
  @AllowNull(true)
  @Column({ type: "json" })
  commandsIR: any;

  /** Texto pré-renderizado a ser enviado ao cliente (sem marcadores de treinamento). */
  @AllowNull(true)
  @Column({ type: "text" })
  customerVisibleText: string | null;

  /** Trechos do roteiro usados como treinamento: `{ examples: [...], objections: [...] }`. */
  @AllowNull(true)
  @Column({ type: "json" })
  trainingMarkers: any;

  /** Versão otimista do IR — incrementa a cada save. */
  @AllowNull(true)
  @Default(1)
  @Column
  version: number | null;

  @ForeignKey(() => Prompt)
  @Column
  promptId: number;

  @BelongsTo(() => Prompt)
  prompt: Prompt;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AttendanceFlowStep;
