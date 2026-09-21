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

/**
 * Metadados globais do fluxo de atendimento (1:1 com Prompt) — guarda a saída do
 * compilador (`compileAttendanceFlowIR`) e da pré-compreensão LLM
 * (`AttendanceFlowUnderstandingService`). Não é por turno; é por prompt.
 */
@Table({ tableName: "AttendanceFlowDefinitions" })
class AttendanceFlowDefinition extends Model<AttendanceFlowDefinition> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @AllowNull(false)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => Prompt)
  @AllowNull(false)
  @Column
  promptId: number;

  @BelongsTo(() => Prompt)
  prompt: Prompt;

  /** Etapa de entrada (geralmente o stepNumber=1 do IR). */
  @AllowNull(true)
  @Column({ type: "string" })
  entryStepId: string | null;

  /** Etapa de fallback quando o cliente cai em estado desconhecido. */
  @AllowNull(true)
  @Column({ type: "string" })
  fallbackStepId: string | null;

  /**
   * Política do fluxo:
   * `{ maxTurnsPerStep, allowBackJump, allowCorrection, strictMode, semanticSplit, strictUnderstanding }`
   */
  @AllowNull(true)
  @Column({ type: "json" })
  policy: any;

  /** Versão do compilador que produziu este IR (para futuras migrações in-place). */
  @AllowNull(true)
  @Default(1)
  @Column
  compilerVersion: number | null;

  /** Timestamp da última compilação (informativo). */
  @AllowNull(true)
  @Column({ type: "date" })
  lastCompiledAt: Date | null;

  /**
   * Saída validada da pré-compreensão LLM do fluxo:
   * `{ globalObjective, audience, stepMap[], slotsExpected[], transitionTriggers[], terminalStates[], risksDetected[], confidence }`
   * Cacheada — usada em runtime sem custo recorrente.
   */
  @AllowNull(true)
  @Column({ type: "json" })
  flowUnderstanding: any;

  /** Versão da pré-compreensão (só incrementa quando o IR muda + understand foi re-rodado). */
  @AllowNull(true)
  @Default(0)
  @Column
  flowUnderstandingVersion: number | null;

  /**
   * Gatilhos GLOBAIS de transição configuráveis pela UI (independente do texto do roteiro):
   * `[{ from: stepId|'*', to: stepId|'end', action: { smartActionId, slug }, condition?: 'always'|'on_match'|'on_correction' }]`
   */
  @AllowNull(true)
  @Column({ type: "json" })
  transitionHooks: any;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AttendanceFlowDefinition;
