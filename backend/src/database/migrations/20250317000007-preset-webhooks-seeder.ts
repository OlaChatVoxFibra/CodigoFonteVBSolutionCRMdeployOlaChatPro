'use strict';
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const presets = [
      // 1. KIWIFY - WEBHOOK PRINCIPAL (TODOS OS EVENTOS)
      {
        companyId: null,
        name: "Kiwify - Webhook Completo",
        description: "Configuração completa para receber todos os tipos de webhooks da Kiwify com todas as variáveis disponíveis",
        provider: "kiwify",
        isSystem: true,
        isActive: true,
        configuration: JSON.stringify({
          url: "",
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          responseVariables: [
            // Dados básicos do pedido
            { path: "order_id", variableName: "kiwify_order_id" },
            { path: "order_ref", variableName: "kiwify_order_ref" },
            { path: "order_status", variableName: "kiwify_order_status" },
            { path: "payment_method", variableName: "kiwify_payment_method" },
            { path: "store_id", variableName: "kiwify_store_id" },
            { path: "payment_merchant_id", variableName: "kiwify_payment_merchant_id" },
            { path: "installments", variableName: "kiwify_installments" },
            { path: "sale_type", variableName: "kiwify_sale_type" },
            { path: "approved_date", variableName: "kiwify_approved_date" },
            { path: "created_at", variableName: "kiwify_created_at" },
            { path: "updated_at", variableName: "kiwify_updated_at" },
            { path: "webhook_event_type", variableName: "kiwify_event_type" },
            { path: "product_type", variableName: "kiwify_product_type" },
            
            // Dados do cartão
            { path: "card_type", variableName: "kiwify_card_type" },
            { path: "card_last4digits", variableName: "kiwify_card_last4digits" },
            { path: "card_rejection_reason", variableName: "kiwify_card_rejection_reason" },
            
            // Dados PIX
            { path: "pix_code", variableName: "kiwify_pix_code" },
            { path: "pix_expiration", variableName: "kiwify_pix_expiration" },
            
            // Dados Boleto
            { path: "boleto_URL", variableName: "kiwify_boleto_url" },
            { path: "boleto_barcode", variableName: "kiwify_boleto_barcode" },
            { path: "boleto_expiry_date", variableName: "kiwify_boleto_expiry_date" },
            
            // Dados do produto
            { path: "Product.product_id", variableName: "kiwify_product_id" },
            { path: "Product.product_name", variableName: "kiwify_product_name" },
            
            // Dados do cliente
            { path: "Customer.full_name", variableName: "customer_name" },
            { path: "Customer.first_name", variableName: "customer_first_name" },
            { path: "Customer.email", variableName: "customer_email" },
            { path: "Customer.mobile", variableName: "customer_phone" },
            { path: "Customer.CPF", variableName: "customer_cpf" },
            { path: "Customer.ip", variableName: "customer_ip" },
            
            // Dados de comissão
            { path: "Commissions.charge_amount", variableName: "kiwify_charge_amount" },
            { path: "Commissions.currency", variableName: "kiwify_currency" },
            { path: "Commissions.product_base_price", variableName: "kiwify_product_base_price" },
            { path: "Commissions.product_base_price_currency", variableName: "kiwify_product_base_price_currency" },
            { path: "Commissions.kiwify_fee", variableName: "kiwify_fee" },
            { path: "Commissions.kiwify_fee_currency", variableName: "kiwify_fee_currency" },
            { path: "Commissions.my_commission", variableName: "kiwify_my_commission" },
            { path: "Commissions.funds_status", variableName: "kiwify_funds_status" },
            { path: "Commissions.estimated_deposit_date", variableName: "kiwify_estimated_deposit_date" },
            { path: "Commissions.deposit_date", variableName: "kiwify_deposit_date" },
            
            // Dados de tracking/UTM
            { path: "TrackingParameters.src", variableName: "kiwify_utm_src" },
            { path: "TrackingParameters.sck", variableName: "kiwify_utm_sck" },
            { path: "TrackingParameters.utm_source", variableName: "kiwify_utm_source" },
            { path: "TrackingParameters.utm_medium", variableName: "kiwify_utm_medium" },
            { path: "TrackingParameters.utm_campaign", variableName: "kiwify_utm_campaign" },
            { path: "TrackingParameters.utm_content", variableName: "kiwify_utm_content" },
            { path: "TrackingParameters.utm_term", variableName: "kiwify_utm_term" },
            
            // Dados de assinatura
            { path: "Subscription.subscription_id", variableName: "kiwify_subscription_id" },
            { path: "Subscription.start_date", variableName: "kiwify_subscription_start_date" },
            { path: "Subscription.next_payment", variableName: "kiwify_subscription_next_payment" },
            { path: "Subscription.status", variableName: "kiwify_subscription_status" },
            { path: "Subscription.customer_access.has_access", variableName: "kiwify_customer_has_access" },
            { path: "Subscription.customer_access.active_period", variableName: "kiwify_customer_active_period" },
            { path: "Subscription.customer_access.access_until", variableName: "kiwify_customer_access_until" },
            { path: "Subscription.plan.id", variableName: "kiwify_plan_id" },
            { path: "Subscription.plan.name", variableName: "kiwify_plan_name" },
            { path: "Subscription.plan.frequency", variableName: "kiwify_plan_frequency" },
            { path: "Subscription.plan.qty_charges", variableName: "kiwify_plan_qty_charges" },
            
            // Smart Installment
            { path: "SmartInstallment.id", variableName: "kiwify_smart_installment_id" },
            { path: "SmartInstallment.installment_number", variableName: "kiwify_installment_number" },
            { path: "SmartInstallment.installment_quantity", variableName: "kiwify_installment_quantity" },
            { path: "SmartInstallment.first_installment_date", variableName: "kiwify_first_installment_date" },
            { path: "SmartInstallment.last_installment_date", variableName: "kiwify_last_installment_date" },
            { path: "SmartInstallment.amount_total", variableName: "kiwify_amount_total" },
            { path: "SmartInstallment.fees_total", variableName: "kiwify_fees_total" },
            { path: "SmartInstallment.interest_total", variableName: "kiwify_interest_total" },
            
            // Outros campos importantes
            { path: "checkout_link", variableName: "kiwify_checkout_link" },
            { path: "access_url", variableName: "kiwify_access_url" }
          ],
          timeout: 30000,
          validationFields: [
            { 
              field: "webhook_secret", 
              required: true, 
              description: "Token secreto do webhook configurado na Kiwify para validação HMAC SHA1" 
            },
            {
              field: "webhook_url",
              required: true,
              description: "URL do webhook que receberá os dados da Kiwify"
            }
          ]
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // 2. KIWIFY - COMPRA APROVADA
      {
        companyId: null,
        name: "Kiwify - Compra Aprovada",
        description: "Webhook específico para quando uma compra é aprovada na Kiwify (order_approved)",
        provider: "kiwify",
        isSystem: true,
        isActive: true,
        configuration: JSON.stringify({
          url: "",
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          responseVariables: [
            { path: "order_id", variableName: "order_id" },
            { path: "order_status", variableName: "order_status" },
            { path: "webhook_event_type", variableName: "event_type" },
            { path: "Customer.email", variableName: "customer_email" },
            { path: "Customer.full_name", variableName: "customer_name" },
            { path: "Customer.mobile", variableName: "customer_phone" },
            { path: "Product.product_name", variableName: "product_name" },
            { path: "Commissions.charge_amount", variableName: "charge_amount" },
            { path: "access_url", variableName: "access_url" }
          ],
          timeout: 30000
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // 3. KIWIFY - PIX GERADO
      {
        companyId: null,
        name: "Kiwify - PIX Gerado",
        description: "Webhook para quando um PIX é gerado na Kiwify (pix_created)",
        provider: "kiwify",
        isSystem: true,
        isActive: true,
        configuration: JSON.stringify({
          url: "",
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          responseVariables: [
            { path: "order_id", variableName: "order_id" },
            { path: "webhook_event_type", variableName: "event_type" },
            { path: "payment_method", variableName: "payment_method" },
            { path: "pix_code", variableName: "pix_code" },
            { path: "pix_expiration", variableName: "pix_expiration" },
            { path: "Customer.email", variableName: "customer_email" },
            { path: "Customer.full_name", variableName: "customer_name" },
            { path: "Product.product_name", variableName: "product_name" },
            { path: "Commissions.charge_amount", variableName: "charge_amount" }
          ],
          timeout: 30000
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // 4. KIWIFY - BOLETO GERADO
      {
        companyId: null,
        name: "Kiwify - Boleto Gerado",
        description: "Webhook para quando um boleto é gerado na Kiwify (billet_created)",
        provider: "kiwify",
        isSystem: true,
        isActive: true,
        configuration: JSON.stringify({
          url: "",
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          responseVariables: [
            { path: "order_id", variableName: "order_id" },
            { path: "webhook_event_type", variableName: "event_type" },
            { path: "payment_method", variableName: "payment_method" },
            { path: "boleto_URL", variableName: "boleto_url" },
            { path: "boleto_barcode", variableName: "boleto_barcode" },
            { path: "boleto_expiry_date", variableName: "boleto_expiry_date" },
            { path: "Customer.email", variableName: "customer_email" },
            { path: "Customer.full_name", variableName: "customer_name" },
            { path: "Product.product_name", variableName: "product_name" },
            { path: "Commissions.charge_amount", variableName: "charge_amount" }
          ],
          timeout: 30000
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // 5. KIWIFY - COMPRA RECUSADA
      {
        companyId: null,
        name: "Kiwify - Compra Recusada",
        description: "Webhook para quando uma compra é recusada na Kiwify (order_rejected)",
        provider: "kiwify",
        isSystem: true,
        isActive: true,
        configuration: JSON.stringify({
          url: "",
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          responseVariables: [
            { path: "order_id", variableName: "order_id" },
            { path: "order_status", variableName: "order_status" },
            { path: "webhook_event_type", variableName: "event_type" },
            { path: "card_rejection_reason", variableName: "rejection_reason" },
            { path: "Customer.email", variableName: "customer_email" },
            { path: "Customer.full_name", variableName: "customer_name" },
            { path: "Product.product_name", variableName: "product_name" }
          ],
          timeout: 30000
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // 6. KIWIFY - REEMBOLSO
      {
        companyId: null,
        name: "Kiwify - Reembolso",
        description: "Webhook para quando um reembolso é processado na Kiwify (order_refunded)",
        provider: "kiwify",
        isSystem: true,
        isActive: true,
        configuration: JSON.stringify({
          url: "",
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          responseVariables: [
            { path: "order_id", variableName: "order_id" },
            { path: "order_status", variableName: "order_status" },
            { path: "webhook_event_type", variableName: "event_type" },
            { path: "Customer.email", variableName: "customer_email" },
            { path: "Customer.full_name", variableName: "customer_name" },
            { path: "Product.product_name", variableName: "product_name" },
            { path: "Commissions.charge_amount", variableName: "refund_amount" }
          ],
          timeout: 30000
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // 7. KIWIFY - CHARGEBACK
      {
        companyId: null,
        name: "Kiwify - Chargeback",
        description: "Webhook para quando há um chargeback na Kiwify (chargeback)",
        provider: "kiwify",
        isSystem: true,
        isActive: true,
        configuration: JSON.stringify({
          url: "",
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          responseVariables: [
            { path: "order_id", variableName: "order_id" },
            { path: "webhook_event_type", variableName: "event_type" },
            { path: "Customer.email", variableName: "customer_email" },
            { path: "Customer.full_name", variableName: "customer_name" },
            { path: "Product.product_name", variableName: "product_name" },
            { path: "Commissions.charge_amount", variableName: "chargeback_amount" }
          ],
          timeout: 30000
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // 8. KIWIFY - ASSINATURA CANCELADA
      {
        companyId: null,
        name: "Kiwify - Assinatura Cancelada",
        description: "Webhook para quando uma assinatura é cancelada na Kiwify (subscription_canceled)",
        provider: "kiwify",
        isSystem: true,
        isActive: true,
        configuration: JSON.stringify({
          url: "",
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          responseVariables: [
            { path: "order_id", variableName: "order_id" },
            { path: "webhook_event_type", variableName: "event_type" },
            { path: "Subscription.subscription_id", variableName: "subscription_id" },
            { path: "Subscription.status", variableName: "subscription_status" },
            { path: "Customer.email", variableName: "customer_email" },
            { path: "Customer.full_name", variableName: "customer_name" },
            { path: "Product.product_name", variableName: "product_name" }
          ],
          timeout: 30000
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // 9. KIWIFY - ASSINATURA ATRASADA
      {
        companyId: null,
        name: "Kiwify - Assinatura Atrasada",
        description: "Webhook para quando uma assinatura está atrasada na Kiwify (subscription_late)",
        provider: "kiwify",
        isSystem: true,
        isActive: true,
        configuration: JSON.stringify({
          url: "",
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          responseVariables: [
            { path: "order_id", variableName: "order_id" },
            { path: "webhook_event_type", variableName: "event_type" },
            { path: "Subscription.subscription_id", variableName: "subscription_id" },
            { path: "Subscription.status", variableName: "subscription_status" },
            { path: "Subscription.next_payment", variableName: "next_payment_date" },
            { path: "Customer.email", variableName: "customer_email" },
            { path: "Customer.full_name", variableName: "customer_name" },
            { path: "Product.product_name", variableName: "product_name" }
          ],
          timeout: 30000
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // 10. KIWIFY - ASSINATURA RENOVADA
      {
        companyId: null,
        name: "Kiwify - Assinatura Renovada",
        description: "Webhook para quando uma assinatura é renovada na Kiwify (subscription_renewed)",
        provider: "kiwify",
        isSystem: true,
        isActive: true,
        configuration: JSON.stringify({
          url: "",
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          responseVariables: [
            { path: "order_id", variableName: "order_id" },
            { path: "webhook_event_type", variableName: "event_type" },
            { path: "Subscription.subscription_id", variableName: "subscription_id" },
            { path: "Subscription.status", variableName: "subscription_status" },
            { path: "Subscription.next_payment", variableName: "next_payment_date" },
            { path: "Customer.email", variableName: "customer_email" },
            { path: "Customer.full_name", variableName: "customer_name" },
            { path: "Product.product_name", variableName: "product_name" },
            { path: "Commissions.charge_amount", variableName: "renewal_amount" }
          ],
          timeout: 30000
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // 11. KIWIFY - CARRINHO ABANDONADO
      {
        companyId: null,
        name: "Kiwify - Carrinho Abandonado",
        description: "Webhook para carrinho abandonado na Kiwify (não possui webhook_event_type)",
        provider: "kiwify",
        isSystem: true,
        isActive: true,
        configuration: JSON.stringify({
          url: "",
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          responseVariables: [
            { path: "order_id", variableName: "order_id" },
            { path: "Customer.email", variableName: "customer_email" },
            { path: "Customer.full_name", variableName: "customer_name" },
            { path: "Product.product_name", variableName: "product_name" },
            { path: "checkout_link", variableName: "checkout_link" },
            { path: "created_at", variableName: "abandoned_at" }
          ],
          timeout: 30000
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // 12. KIWIFY - PARCELAMENTO INTELIGENTE
      {
        companyId: null,
        name: "Kiwify - Parcelamento Inteligente",
        description: "Webhook específico para vendas com parcelamento inteligente da Kiwify",
        provider: "kiwify",
        isSystem: true,
        isActive: true,
        configuration: JSON.stringify({
          url: "",
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          responseVariables: [
            { path: "order_id", variableName: "order_id" },
            { path: "webhook_event_type", variableName: "event_type" },
            { path: "Customer.email", variableName: "customer_email" },
            { path: "Customer.full_name", variableName: "customer_name" },
            { path: "Product.product_name", variableName: "product_name" },
            { path: "SmartInstallment.id", variableName: "smart_installment_id" },
            { path: "SmartInstallment.installment_number", variableName: "installment_number" },
            { path: "SmartInstallment.installment_quantity", variableName: "total_installments" },
            { path: "SmartInstallment.amount_total", variableName: "total_amount_with_interest" },
            { path: "SmartInstallment.fees_total", variableName: "total_fees" },
            { path: "SmartInstallment.interest_total", variableName: "total_interest" },
            { path: "SmartInstallment.first_installment_date", variableName: "first_installment_date" },
            { path: "SmartInstallment.last_installment_date", variableName: "last_installment_date" }
          ],
          timeout: 30000
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // 13. WEBHOOK GENÉRICO - POST
      {
        companyId: null,
        name: "Webhook Genérico - POST",
        description: "Configuração básica para webhooks POST genéricos",
        provider: "generic",
        isSystem: true,
        isActive: true,
        configuration: JSON.stringify({
          url: "",
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          responseVariables: [],
          timeout: 30000
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // 14. WEBHOOK GENÉRICO - GET
      {
        companyId: null,
        name: "Webhook Genérico - GET",
        description: "Configuração básica para requisições GET",
        provider: "generic",
        isSystem: true,
        isActive: true,
        configuration: JSON.stringify({
          url: "",
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          },
          responseVariables: [],
          timeout: 30000
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await queryInterface.bulkInsert('PresetWebhooks', presets);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('PresetWebhooks', { isSystem: true });
  }
};