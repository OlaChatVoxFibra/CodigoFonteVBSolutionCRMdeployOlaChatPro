/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { PresetWebhookModel } from "../../models/PresetWebhook";

export const InitializeSystemPresetsService = async (): Promise<void> => {
  try {
    // Verificar se presets do sistema já existem
    const existingPresets = await PresetWebhookModel.findAll({
      where: { isSystem: true }
    });

    if (existingPresets.length > 0) {
      console.log('Presets do sistema já inicializados');
      return;
    }

    // Preset para Kiwify
    const kiwifyPreset = {
      name: "Kiwify - Webhook de Vendas",
      description: "Configuração padrão para receber webhooks de vendas da Kiwify",
      provider: "kiwify",
      isSystem: true,
      configuration: {
        url: "", // Será preenchido pelo usuário
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        responseVariables: [
          { path: "order_id", variableName: "kiwify_order_id" },
          { path: "order_status", variableName: "kiwify_order_status" },
          { path: "Customer.email", variableName: "customer_email" },
          { path: "Customer.full_name", variableName: "customer_name" },
          { path: "Customer.mobile", variableName: "customer_phone" },
          { path: "Product.product_name", variableName: "product_name" },
          { path: "Commissions.charge_amount", variableName: "charge_amount" },
          { path: "webhook_event_type", variableName: "event_type" }
        ],
        timeout: 30000,
        validationFields: [
          { 
            field: "webhook_secret", 
            required: true, 
            description: "Token secreto do webhook configurado na Kiwify" 
          }
        ]
      }
    };

    await PresetWebhookModel.create(kiwifyPreset);
    
    console.log('Presets do sistema inicializados com sucesso');
  } catch (error) {
    console.error('Erro ao inicializar presets do sistema:', error);
    throw error;
  }
};