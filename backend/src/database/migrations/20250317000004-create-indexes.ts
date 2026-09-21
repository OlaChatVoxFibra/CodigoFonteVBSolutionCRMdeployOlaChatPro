/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Verificar se os índices já existem antes de tentar criá-los
    const indexChecks = async (tableName: string, indexName: string) => {
      try {
        const indexes = await queryInterface.showIndex(tableName);
        if (Array.isArray(indexes)) {
          return indexes.some((index: any) => index.name === indexName);
        }
        return false;
      } catch (error) {
        return false;
      }
    };

    const createIndexIfNotExists = async (tableName: string, columns: string[], options: any) => {
      const indexExists = await indexChecks(tableName, options.name);
      if (!indexExists) {
        await queryInterface.addIndex(tableName, columns, options);
        console.log(`✓ Índice ${options.name} criado em ${tableName}`);
      } else {
        console.log(`- Índice ${options.name} já existe em ${tableName}`);
      }
    };

    try {
      // ========== ÍNDICES PARA CHAVES ESTRANGEIRAS ==========
      
      // Announcements
      await createIndexIfNotExists("Announcements", ["companyId"], {
        name: "idx_announcements_company_id"
      });
      await createIndexIfNotExists("Announcements", ["priority"], {
        name: "idx_announcements_priority"
      });
      await createIndexIfNotExists("Announcements", ["status"], {
        name: "idx_announcements_status"
      });

      // ApiUsages - para consultas por empresa e data
      await createIndexIfNotExists("ApiUsages", ["companyId"], {
        name: "idx_apiusages_company_id"
      });
      await createIndexIfNotExists("ApiUsages", ["dateUsed"], {
        name: "idx_apiusages_date_used"
      });
      await createIndexIfNotExists("ApiUsages", ["companyId", "dateUsed"], {
        name: "idx_apiusages_company_date"
      });

      // Baileys
      await createIndexIfNotExists("Baileys", ["whatsappId"], {
        name: "idx_baileys_whatsapp_id"
      });

      // Campaigns - índices para filtros comuns
      await createIndexIfNotExists("Campaigns", ["status"], {
        name: "idx_campaigns_status"
      });
      await createIndexIfNotExists("Campaigns", ["scheduledAt"], {
        name: "idx_campaigns_scheduled_at"
      });
      await createIndexIfNotExists("Campaigns", ["companyId", "status"], {
        name: "idx_campaigns_company_status"
      });

      // CampaignSettings - para busca por chave
      await createIndexIfNotExists("CampaignSettings", ["key"], {
        name: "idx_campaign_settings_key"
      });
      await createIndexIfNotExists("CampaignSettings", ["companyId", "key"], {
        name: "idx_campaign_settings_company_key"
      });

      // CampaignShipping - para busca por número
      await createIndexIfNotExists("CampaignShipping", ["number"], {
        name: "idx_campaign_shipping_number"
      });

      // Chats
      await createIndexIfNotExists("Chats", ["ownerId"], {
        name: "idx_chats_owner_id"
      });
      await createIndexIfNotExists("Chats", ["isGroup"], {
        name: "idx_chats_is_group"
      });
      await createIndexIfNotExists("Chats", ["companyId", "isGroup"], {
        name: "idx_chats_company_is_group"
      });

      // Chatbots - relacionamentos importantes
      await createIndexIfNotExists("Chatbots", ["queueId"], {
        name: "idx_chatbots_queue_id"
      });
      await createIndexIfNotExists("Chatbots", ["chatbotId"], {
        name: "idx_chatbots_chatbot_id"
      });
      await createIndexIfNotExists("Chatbots", ["optQueueId"], {
        name: "idx_chatbots_opt_queue_id"
      });
      await createIndexIfNotExists("Chatbots", ["optUserId"], {
        name: "idx_chatbots_opt_user_id"
      });

      // ChatMessages
      await createIndexIfNotExists("ChatMessages", ["chatId"], {
        name: "idx_chat_messages_chat_id"
      });
      await createIndexIfNotExists("ChatMessages", ["senderId"], {
        name: "idx_chat_messages_sender_id"
      });
      await createIndexIfNotExists("ChatMessages", ["replyToId"], {
        name: "idx_chat_messages_reply_to_id"
      });
      await createIndexIfNotExists("ChatMessages", ["chatId", "createdAt"], {
        name: "idx_chat_messages_chat_created"
      });

      // ChatUsers
      await createIndexIfNotExists("ChatUsers", ["chatId"], {
        name: "idx_chat_users_chat_id"
      });
      await createIndexIfNotExists("ChatUsers", ["userId"], {
        name: "idx_chat_users_user_id"
      });

      // Companies
      await createIndexIfNotExists("Companies", ["planId"], {
        name: "idx_companies_plan_id"
      });
      await createIndexIfNotExists("Companies", ["status"], {
        name: "idx_companies_status"
      });

      // ContactCustomFields
      // Já existe: idx_ContactCustomFields_contact_id

      // ContactLists
      await createIndexIfNotExists("ContactLists", ["companyId"], {
        name: "idx_contact_lists_company_id"
      });

      // ContactListItems
      await createIndexIfNotExists("ContactListItems", ["number"], {
        name: "idx_contact_list_items_number"
      });
      await createIndexIfNotExists("ContactListItems", ["isWhatsappValid"], {
        name: "idx_contact_list_items_whatsapp_valid"
      });

      // ContactWallets - relacionamentos importantes
      await createIndexIfNotExists("ContactWallets", ["contactId"], {
        name: "idx_contact_wallets_contact_id"
      });
      await createIndexIfNotExists("ContactWallets", ["walletId"], {
        name: "idx_contact_wallets_wallet_id"
      });
      await createIndexIfNotExists("ContactWallets", ["queueId"], {
        name: "idx_contact_wallets_queue_id"
      });

      // DialogChatBots
      await createIndexIfNotExists("DialogChatBots", ["contactId"], {
        name: "idx_dialog_chatbots_contact_id"
      });
      await createIndexIfNotExists("DialogChatBots", ["queueId"], {
        name: "idx_dialog_chatbots_queue_id"
      });
      await createIndexIfNotExists("DialogChatBots", ["chatbotId"], {
        name: "idx_dialog_chatbots_chatbot_id"
      });

      // ========== ÍNDICES PARA STATUS E FILTROS ==========

      // Contacts - campos de filtro
      await createIndexIfNotExists("Contacts", ["active"], {
        name: "idx_contacts_active"
      });
      await createIndexIfNotExists("Contacts", ["channel"], {
        name: "idx_contacts_channel"
      });
      await createIndexIfNotExists("Contacts", ["isGroup"], {
        name: "idx_contacts_is_group"
      });
      await createIndexIfNotExists("Contacts", ["companyId", "active"], {
        name: "idx_contacts_company_active"
      });

      // FlowBuilders
      await createIndexIfNotExists("FlowBuilders", ["company_id"], {
        name: "idx_flow_builders_company_id"
      });

      // FlowCampaigns
      await createIndexIfNotExists("FlowCampaigns", ["status"], {
        name: "idx_flow_campaigns_status"
      });
      await createIndexIfNotExists("FlowCampaigns", ["whatsappId"], {
        name: "idx_flow_campaigns_whatsapp_id"
      });

      // Integrations
      await createIndexIfNotExists("Integrations", ["isActive"], {
        name: "idx_integrations_is_active"
      });
      await createIndexIfNotExists("Integrations", ["companyId", "isActive"], {
        name: "idx_integrations_company_active"
      });

      // ========== ÍNDICES TEMPORAIS ==========

      // Schedules - para consultas por data de envio
      await createIndexIfNotExists("Schedules", ["sendAt"], {
        name: "idx_schedules_send_at"
      });
      await createIndexIfNotExists("Schedules", ["status"], {
        name: "idx_schedules_status"
      });
      await createIndexIfNotExists("Schedules", ["companyId", "sendAt"], {
        name: "idx_schedules_company_send_at"
      });

      // ScheduledMessages
      await createIndexIfNotExists("ScheduledMessages", ["data_mensagem_programada"], {
        name: "idx_scheduled_messages_date"
      });
      await createIndexIfNotExists("ScheduledMessages", ["companyId"], {
        name: "idx_scheduled_messages_company_id"
      });

      // ScheduledMessagesEnvios
      await createIndexIfNotExists("ScheduledMessagesEnvios", ["data_envio"], {
        name: "idx_scheduled_messages_envio_date"
      });
      await createIndexIfNotExists("ScheduledMessagesEnvios", ["scheduledmessages"], {
        name: "idx_scheduled_messages_envio_parent"
      });

      // ========== ÍNDICES PARA SETTINGS ==========

      // Settings - busca por chave
      await createIndexIfNotExists("Settings", ["key"], {
        name: "idx_settings_key"
      });
      await createIndexIfNotExists("Settings", ["companyId", "key"], {
        name: "idx_settings_company_key"
      });

      // ========== ÍNDICES PARA RELACIONAMENTOS IMPORTANTES ==========

      // UserQueues
      await createIndexIfNotExists("UserQueues", ["userId"], {
        name: "idx_user_queues_user_id"
      });
      await createIndexIfNotExists("UserQueues", ["queueId"], {
        name: "idx_user_queues_queue_id"
      });

      // WhatsappQueues
      await createIndexIfNotExists("WhatsappQueues", ["whatsappId"], {
        name: "idx_whatsapp_queues_whatsapp_id"
      });
      await createIndexIfNotExists("WhatsappQueues", ["queueId"], {
        name: "idx_whatsapp_queues_queue_id"
      });

      // Files e FilesOptions
      await createIndexIfNotExists("Files", ["companyId"], {
        name: "idx_files_company_id"
      });
      await createIndexIfNotExists("FilesOptions", ["fileId"], {
        name: "idx_files_options_file_id"
      });

      // Prompts
      await createIndexIfNotExists("Prompts", ["queueId"], {
        name: "idx_prompts_queue_id"
      });
      await createIndexIfNotExists("Prompts", ["companyId"], {
        name: "idx_prompts_company_id"
      });

      // QueueIntegrations
      await createIndexIfNotExists("QueueIntegrations", ["companyId"], {
        name: "idx_queue_integrations_company_id"
      });

      // QueueOptions
      await createIndexIfNotExists("QueueOptions", ["queueId"], {
        name: "idx_queue_options_queue_id"
      });
      await createIndexIfNotExists("QueueOptions", ["parentId"], {
        name: "idx_queue_options_parent_id"
      });

      // QueueStates
      await createIndexIfNotExists("QueueStates", ["queueId"], {
        name: "idx_queue_states_queue_id"
      });

      // QuickMessages
      await createIndexIfNotExists("QuickMessages", ["userId"], {
        name: "idx_quick_messages_user_id"
      });
      await createIndexIfNotExists("QuickMessages", ["whatsappId"], {
        name: "idx_quick_messages_whatsapp_id"
      });
      await createIndexIfNotExists("QuickMessages", ["geral"], {
        name: "idx_quick_messages_geral"
      });

      // QuickMessageComponents
      await createIndexIfNotExists("QuickMessageComponents", ["quickMessageId"], {
        name: "idx_quick_message_components_quick_message_id"
      });

      // TicketNotes
      await createIndexIfNotExists("TicketNotes", ["ticketId"], {
        name: "idx_ticket_notes_ticket_id"
      });
      await createIndexIfNotExists("TicketNotes", ["userId"], {
        name: "idx_ticket_notes_user_id"
      });

      // TicketFinalizationReasons
      await createIndexIfNotExists("TicketFinalizationReasons", ["companyId"], {
        name: "idx_ticket_finalization_reasons_company_id"
      });

      // Whatsapps - relacionamentos importantes
      await createIndexIfNotExists("Whatsapps", ["sendIdQueue"], {
        name: "idx_whatsapps_send_id_queue"
      });
      await createIndexIfNotExists("Whatsapps", ["integrationId"], {
        name: "idx_whatsapps_integration_id"
      });
      await createIndexIfNotExists("Whatsapps", ["promptId"], {
        name: "idx_whatsapps_prompt_id"
      });
      await createIndexIfNotExists("Whatsapps", ["queueIdImportMessages"], {
        name: "idx_whatsapps_queue_import_messages"
      });

      // ========== ÍNDICES COMPOSTOS PARA CONSULTAS COMUNS ==========

      // Tickets - consultas mais comuns
      await createIndexIfNotExists("Tickets", ["companyId", "status", "createdAt"], {
        name: "idx_tickets_company_status_created"
      });
      await createIndexIfNotExists("Tickets", ["userId", "status"], {
        name: "idx_tickets_user_status"
      });
      await createIndexIfNotExists("Tickets", ["queueId", "status"], {
        name: "idx_tickets_queue_status"
      });

      // Messages - consultas por ticket e data
      await createIndexIfNotExists("Messages", ["ticketId", "createdAt"], {
        name: "idx_messages_ticket_created"
      });
      await createIndexIfNotExists("Messages", ["fromMe"], {
        name: "idx_messages_from_me"
      });

      // Users
      await createIndexIfNotExists("Users", ["profile"], {
        name: "idx_users_profile"
      });
      await createIndexIfNotExists("Users", ["online"], {
        name: "idx_users_online"
      });

      // Tags
      await createIndexIfNotExists("Tags", ["kanban"], {
        name: "idx_tags_kanban"
      });

      // Invoices
      await createIndexIfNotExists("Invoices", ["companyId"], {
        name: "idx_invoices_company_id"
      });
      await createIndexIfNotExists("Invoices", ["status"], {
        name: "idx_invoices_status"
      });
      await createIndexIfNotExists("Invoices", ["dueDate"], {
        name: "idx_invoices_due_date"
      });

      // Subscriptions
      await createIndexIfNotExists("Subscriptions", ["companyId"], {
        name: "idx_subscriptions_company_id"
      });
      await createIndexIfNotExists("Subscriptions", ["isActive"], {
        name: "idx_subscriptions_is_active"
      });

      // Webhooks
      await createIndexIfNotExists("Webhooks", ["company_id"], {
        name: "idx_webhooks_company_id"
      });
      await createIndexIfNotExists("Webhooks", ["user_id"], {
        name: "idx_webhooks_user_id"
      });

      console.log("\n🎯 Migração de índices de performance concluída com sucesso!");
      console.log("📈 Índices criados para melhorar performance em:");
      console.log("   - Consultas por companyId (multi-tenancy)");
      console.log("   - Filtros por status e campos booleanos");
      console.log("   - Consultas temporais (datas)");
      console.log("   - Relacionamentos importantes (FKs)");
      console.log("   - Consultas compostas comuns");

    } catch (error) {
      console.error("❌ Erro ao criar índices:", error);
      throw error;
    }
  },

  down: async (queryInterface: QueryInterface) => {
    // Lista de todos os índices criados para rollback
    const indexesToDrop = [
      // Announcements
      { table: "Announcements", index: "idx_announcements_company_id" },
      { table: "Announcements", index: "idx_announcements_priority" },
      { table: "Announcements", index: "idx_announcements_status" },
      
      // ApiUsages
      { table: "ApiUsages", index: "idx_apiusages_company_id" },
      { table: "ApiUsages", index: "idx_apiusages_date_used" },
      { table: "ApiUsages", index: "idx_apiusages_company_date" },
      
      // Baileys
      { table: "Baileys", index: "idx_baileys_whatsapp_id" },
      
      // Campaigns
      { table: "Campaigns", index: "idx_campaigns_status" },
      { table: "Campaigns", index: "idx_campaigns_scheduled_at" },
      { table: "Campaigns", index: "idx_campaigns_company_status" },
      
      // CampaignSettings
      { table: "CampaignSettings", index: "idx_campaign_settings_key" },
      { table: "CampaignSettings", index: "idx_campaign_settings_company_key" },
      
      // CampaignShipping
      { table: "CampaignShipping", index: "idx_campaign_shipping_number" },
      
      // Chats
      { table: "Chats", index: "idx_chats_owner_id" },
      { table: "Chats", index: "idx_chats_is_group" },
      { table: "Chats", index: "idx_chats_company_is_group" },
      
      // Chatbots
      { table: "Chatbots", index: "idx_chatbots_queue_id" },
      { table: "Chatbots", index: "idx_chatbots_chatbot_id" },
      { table: "Chatbots", index: "idx_chatbots_opt_queue_id" },
      { table: "Chatbots", index: "idx_chatbots_opt_user_id" },
      
      // ChatMessages
      { table: "ChatMessages", index: "idx_chat_messages_chat_id" },
      { table: "ChatMessages", index: "idx_chat_messages_sender_id" },
      { table: "ChatMessages", index: "idx_chat_messages_reply_to_id" },
      { table: "ChatMessages", index: "idx_chat_messages_chat_created" },
      
      // ChatUsers
      { table: "ChatUsers", index: "idx_chat_users_chat_id" },
      { table: "ChatUsers", index: "idx_chat_users_user_id" },
      
      // Companies
      { table: "Companies", index: "idx_companies_plan_id" },
      { table: "Companies", index: "idx_companies_status" },
      
      // ContactLists
      { table: "ContactLists", index: "idx_contact_lists_company_id" },
      
      // ContactListItems
      { table: "ContactListItems", index: "idx_contact_list_items_number" },
      { table: "ContactListItems", index: "idx_contact_list_items_whatsapp_valid" },
      
      // ContactWallets
      { table: "ContactWallets", index: "idx_contact_wallets_contact_id" },
      { table: "ContactWallets", index: "idx_contact_wallets_wallet_id" },
      { table: "ContactWallets", index: "idx_contact_wallets_queue_id" },
      
      // DialogChatBots
      { table: "DialogChatBots", index: "idx_dialog_chatbots_contact_id" },
      { table: "DialogChatBots", index: "idx_dialog_chatbots_queue_id" },
      { table: "DialogChatBots", index: "idx_dialog_chatbots_chatbot_id" },
      
      // Contacts
      { table: "Contacts", index: "idx_contacts_active" },
      { table: "Contacts", index: "idx_contacts_channel" },
      { table: "Contacts", index: "idx_contacts_is_group" },
      { table: "Contacts", index: "idx_contacts_company_active" },
      
      // FlowBuilders
      { table: "FlowBuilders", index: "idx_flow_builders_company_id" },
      
      // FlowCampaigns
      { table: "FlowCampaigns", index: "idx_flow_campaigns_status" },
      { table: "FlowCampaigns", index: "idx_flow_campaigns_whatsapp_id" },
      
      // Integrations
      { table: "Integrations", index: "idx_integrations_is_active" },
      { table: "Integrations", index: "idx_integrations_company_active" },
      
      // Schedules
      { table: "Schedules", index: "idx_schedules_send_at" },
      { table: "Schedules", index: "idx_schedules_status" },
      { table: "Schedules", index: "idx_schedules_company_send_at" },
      
      // ScheduledMessages
      { table: "ScheduledMessages", index: "idx_scheduled_messages_date" },
      { table: "ScheduledMessages", index: "idx_scheduled_messages_company_id" },
      
      // ScheduledMessagesEnvios
      { table: "ScheduledMessagesEnvios", index: "idx_scheduled_messages_envio_date" },
      { table: "ScheduledMessagesEnvios", index: "idx_scheduled_messages_envio_parent" },
      
      // Settings
      { table: "Settings", index: "idx_settings_key" },
      { table: "Settings", index: "idx_settings_company_key" },
      
      // UserQueues
      { table: "UserQueues", index: "idx_user_queues_user_id" },
      { table: "UserQueues", index: "idx_user_queues_queue_id" },
      
      // WhatsappQueues
      { table: "WhatsappQueues", index: "idx_whatsapp_queues_whatsapp_id" },
      { table: "WhatsappQueues", index: "idx_whatsapp_queues_queue_id" },
      
      // Files e FilesOptions
      { table: "Files", index: "idx_files_company_id" },
      { table: "FilesOptions", index: "idx_files_options_file_id" },
      
      // Prompts
      { table: "Prompts", index: "idx_prompts_queue_id" },
      { table: "Prompts", index: "idx_prompts_company_id" },
      
      // QueueIntegrations
      { table: "QueueIntegrations", index: "idx_queue_integrations_company_id" },
      
      // QueueOptions
      { table: "QueueOptions", index: "idx_queue_options_queue_id" },
      { table: "QueueOptions", index: "idx_queue_options_parent_id" },
      
      // QueueStates
      { table: "QueueStates", index: "idx_queue_states_queue_id" },
      
      // QuickMessages
      { table: "QuickMessages", index: "idx_quick_messages_user_id" },
      { table: "QuickMessages", index: "idx_quick_messages_whatsapp_id" },
      { table: "QuickMessages", index: "idx_quick_messages_geral" },
      
      // QuickMessageComponents
      { table: "QuickMessageComponents", index: "idx_quick_message_components_quick_message_id" },
      
      // TicketNotes
      { table: "TicketNotes", index: "idx_ticket_notes_ticket_id" },
      { table: "TicketNotes", index: "idx_ticket_notes_user_id" },
      
      // TicketFinalizationReasons
      { table: "TicketFinalizationReasons", index: "idx_ticket_finalization_reasons_company_id" },
      
      // Whatsapps
      { table: "Whatsapps", index: "idx_whatsapps_send_id_queue" },
      { table: "Whatsapps", index: "idx_whatsapps_integration_id" },
      { table: "Whatsapps", index: "idx_whatsapps_prompt_id" },
      { table: "Whatsapps", index: "idx_whatsapps_queue_import_messages" },
      
      // Índices compostos
      { table: "Tickets", index: "idx_tickets_company_status_created" },
      { table: "Tickets", index: "idx_tickets_user_status" },
      { table: "Tickets", index: "idx_tickets_queue_status" },
      { table: "Messages", index: "idx_messages_ticket_created" },
      { table: "Messages", index: "idx_messages_from_me" },
      { table: "Users", index: "idx_users_profile" },
      { table: "Users", index: "idx_users_online" },
      { table: "Tags", index: "idx_tags_kanban" },
      { table: "Invoices", index: "idx_invoices_company_id" },
      { table: "Invoices", index: "idx_invoices_status" },
      { table: "Invoices", index: "idx_invoices_due_date" },
      { table: "Subscriptions", index: "idx_subscriptions_company_id" },
      { table: "Subscriptions", index: "idx_subscriptions_is_active" },
      { table: "Webhooks", index: "idx_webhooks_company_id" },
      { table: "Webhooks", index: "idx_webhooks_user_id" },
      { table: "Webhooks", index: "idx_webhooks_active" }
    ];

    try {
      for (const { table, index } of indexesToDrop) {
        try {
          await queryInterface.removeIndex(table, index);
          console.log(`✓ Índice ${index} removido de ${table}`);
        } catch (error) {
          console.log(`- Índice ${index} não encontrado em ${table}`);
        }
      }
      
      console.log("🔄 Rollback da migração de índices concluído!");
    } catch (error) {
      console.error("❌ Erro no rollback:", error);
      throw error;
    }
  }
};