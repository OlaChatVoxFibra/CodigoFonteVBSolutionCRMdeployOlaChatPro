/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  Model,
  Table,
  Column,
  PrimaryKey,
  AutoIncrement,
  DataType,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import Whatsapp from "./Whatsapp";
import { FlowBuilderModel } from "./FlowBuilder";

export interface PhraseCondition {
  text: string;
  type: 'exact' | 'partial';
}

@Table({
  tableName: "FlowCampaigns"
})
export class FlowCampaignModel extends Model<FlowCampaignModel> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  companyId: number;

  @Column
  userId: number;

  @Column
  name: string;

  @ForeignKey(() => FlowBuilderModel)
  @Column
  flowId: number;

  @Column({
    type: DataType.TEXT,
    get(this: FlowCampaignModel) {
      const rawValue = this.getDataValue('phrase' as any);
      if (!rawValue) return [];
      
      try {
        const parsed = JSON.parse(rawValue as string);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        return [{ text: parsed, type: 'exact' }];
      } catch {
        return [{ text: rawValue as string, type: 'exact' }];
      }
    },
    set(this: FlowCampaignModel, value: string | PhraseCondition[]) {
      if (typeof value === 'string') {
        this.setDataValue('phrase' as any, JSON.stringify([{ text: value, type: 'exact' }]));
      } else if (Array.isArray(value)) {
        this.setDataValue('phrase' as any, JSON.stringify(value));
      } else {
        this.setDataValue('phrase' as any, JSON.stringify([]));
      }
    }
  })
  phrase: PhraseCondition[];

  // ALTERAÇÃO: Mudança de whatsappId único para whatsappIds array
  @Column({
    type: DataType.TEXT,
    get(this: FlowCampaignModel) {
      const rawValue = this.getDataValue('whatsappIds' as any);
      if (!rawValue) return [];
      
      try {
        const parsed = JSON.parse(rawValue as string);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        // Compatibilidade com formato antigo (número único)
        const numValue = parseInt(rawValue as string);
        return isNaN(numValue) ? [] : [numValue];
      }
    },
    set(this: FlowCampaignModel, value: number | number[]) {
      if (Array.isArray(value)) {
        this.setDataValue('whatsappIds' as any, JSON.stringify(value));
      } else if (typeof value === 'number') {
        this.setDataValue('whatsappIds' as any, JSON.stringify([value]));
      } else {
        this.setDataValue('whatsappIds' as any, JSON.stringify([]));
      }
    }
  })
  whatsappIds: number[];

  // COMPATIBILIDADE: Manter whatsappId para não quebrar código existente
  @ForeignKey(() => Whatsapp)
  @Column({
    get(this: FlowCampaignModel) {
      const whatsappIds = this.whatsappIds;
      return whatsappIds && whatsappIds.length > 0 ? whatsappIds[0] : null;
    },
    set(this: FlowCampaignModel, value: number) {
      // Quando definir whatsappId único, converter para array
      if (value) {
        this.whatsappIds = [value];
      }
    }
  })
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @BelongsTo(() => FlowBuilderModel, 'flowId')
  flow: FlowBuilderModel;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  status: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  /**
   * Verifica se uma conexão específica está incluída nesta campanha
   */
  includesWhatsapp(whatsappId: number): boolean {
    const ids = this.whatsappIds || [];
    return ids.includes(whatsappId);
  }

  /**
   * Verifica se uma mensagem faz match com as condições da campanha
   * E se a conexão está habilitada para esta campanha
   */
  matchesMessage(messageBody: string, whatsappId: number): boolean {
    // Verificar se a conexão está habilitada para esta campanha
    if (!this.includesWhatsapp(whatsappId)) {
      return false;
    }

    // Validações básicas da mensagem
    if (!messageBody || typeof messageBody !== 'string') {
      return false;
    }

    const phrases = this.phrase || [];
    if (!Array.isArray(phrases) || phrases.length === 0) {
      return false;
    }

    const bodyLower = messageBody.toLowerCase().trim();
    
    return phrases.some((condition: PhraseCondition) => {
      if (!condition.text || typeof condition.text !== 'string') {
        return false;
      }

      const phraseLower = condition.text.toLowerCase().trim();
      
      if (condition.type === 'exact') {
        const match = bodyLower === phraseLower;
        if (match) {
          console.log(`[MATCH EXATO] Campanha ${this.id} (WhatsApp ${whatsappId}): "${messageBody}" === "${condition.text}"`);
        }
        return match;
      } else if (condition.type === 'partial') {
        const match = bodyLower.includes(phraseLower);
        if (match) {
          console.log(`[MATCH PARCIAL] Campanha ${this.id} (WhatsApp ${whatsappId}): "${messageBody}" contém "${condition.text}"`);
        }
        return match;
      }
      
      return false;
    });
  }

  /**
   * Get summary das conexões habilitadas
   */
  getWhatsappSummary(): string {
    const ids = this.whatsappIds || [];
    if (ids.length === 0) return "Nenhuma conexão selecionada";
    if (ids.length === 1) return `1 conexão (ID: ${ids[0]})`;
    return `${ids.length} conexões (IDs: ${ids.join(', ')})`;
  }

  // Override toJSON para incluir dados parseados
  toJSON() {
    const values = super.toJSON();
    return {
      ...values,
      phrase: this.phrase,
      whatsappIds: this.whatsappIds,
      whatsappId: this.whatsappId // Manter compatibilidade
    };
  }
}