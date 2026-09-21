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
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt
} from "sequelize-typescript";
import Company from "./Company";
import Prompt from "./Prompt";

@Table({ tableName: "PromptSmartActions" })
class PromptSmartAction extends Model<PromptSmartAction> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => Prompt)
  @Column
  promptId: number;

  @BelongsTo(() => Prompt)
  prompt: Prompt;

  @Column
  anthropicMultiAgentId: number;

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(true)
  @Column
  slug: string;

  @AllowNull(false)
  @Column
  type: string;

  @AllowNull(true)
  @Column
  description: string;

  @AllowNull(true)
  @Column
  triggerType: string;

  @AllowNull(true)
  @Column
  triggerValue: string;

  @AllowNull(true)
  @Column
  conditionExpr: string;

  @AllowNull(true)
  @Column(DataType.JSONB)
  variables: Record<string, unknown>;

  @AllowNull(true)
  @Column
  apiUrl: string;

  @AllowNull(true)
  @Column
  workflowId: number;

  @Column({ defaultValue: false })
  confirm: boolean;

  @Column({ defaultValue: false })
  autoExecute: boolean;

  @AllowNull(true)
  @Column
  responseMessage: string;

  /** PR 16: aba Ações — flag de habilitação independente do roteiro. */
  @AllowNull(true)
  @Column({ defaultValue: true })
  enabled: boolean;

  /** PR 16: padrões (regex/keywords) que disparam na MENSAGEM DO AGENTE. */
  @AllowNull(true)
  @Column(DataType.JSONB)
  agentTriggerPatterns: any;

  /** PR 16: padrões (regex/keywords) que disparam na RESPOSTA DO USUÁRIO. */
  @AllowNull(true)
  @Column(DataType.JSONB)
  userTriggerPatterns: any;

  /** PR 16: slots requeridos pela intent (date, contact, value, ...). */
  @AllowNull(true)
  @Column(DataType.JSONB)
  intentSlotSchema: any;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default PromptSmartAction;
