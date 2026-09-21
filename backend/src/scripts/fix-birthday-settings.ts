/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// src/scripts/fix-birthday-settings.ts
import { QueryInterface, DataTypes } from 'sequelize';
import db from '../database';

const fixBirthdaySettings = async () => {
  try {
    console.log('🔧 Verificando e corrigindo tabela BirthdaySettings...');
    
    const queryInterface = db.getQueryInterface();
    
    // Verificar se a tabela existe
    const tableExists = await queryInterface.describeTable('BirthdaySettings');
    
    if (!tableExists) {
      console.log('❌ Tabela BirthdaySettings não existe. Criando...');
      
      await queryInterface.createTable('BirthdaySettings', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        companyId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'Companies',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        userBirthdayEnabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        contactBirthdayEnabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        userBirthdayMessage: {
          type: DataTypes.TEXT,
          allowNull: true,
          defaultValue: '🎉 Parabéns, {nome}! Hoje é seu dia especial! Desejamos muito sucesso e felicidade! '
        },
        contactBirthdayMessage: {
          type: DataTypes.TEXT,
          allowNull: true,
          defaultValue: '🎉 Parabéns, {nome}! Hoje é seu aniversário! Desejamos muito sucesso, saúde e felicidade! ✨'
        },
        sendBirthdayTime: {
          type: DataTypes.TIME,
          allowNull: false,
          defaultValue: '09:00:00'
        },
        createAnnouncementForUsers: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        whatsappId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'Whatsapps',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false
        }
      });

      // Criar índice único para companyId
      await queryInterface.addIndex('BirthdaySettings', ['companyId'], {
        unique: true,
        name: 'idx_birthday_settings_company_id'
      });

      console.log('✅ Tabela BirthdaySettings criada com sucesso!');
      
    } else {
      console.log('✅ Tabela BirthdaySettings existe.');
      
      // Verificar se a coluna whatsappId existe
      const hasWhatsappId = 'whatsappId' in tableExists;
      if (!hasWhatsappId) {
        console.log('❌ Coluna whatsappId não existe. Adicionando...');
        
        await queryInterface.addColumn('BirthdaySettings', 'whatsappId', {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'Whatsapps',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        });
        
        console.log('✅ Coluna whatsappId adicionada com sucesso!');
      } else {
        console.log('✅ Coluna whatsappId já existe.');
      }
    }

    // Inserir configurações padrão para empresas que não têm
    const [results] = await db.query(`
      INSERT INTO "BirthdaySettings" ("companyId", "userBirthdayEnabled", "contactBirthdayEnabled", "userBirthdayMessage", "contactBirthdayMessage", "sendBirthdayTime", "createAnnouncementForUsers", "whatsappId", "createdAt", "updatedAt")
      SELECT
        id as "companyId",
        true as "userBirthdayEnabled",
        true as "contactBirthdayEnabled",
        '🎉 Parabéns, {nome}! Hoje é seu dia especial! Desejamos muito sucesso e felicidade! ' as "userBirthdayMessage",
        '🎉 Parabéns, {nome}! Hoje é seu aniversário! Desejamos muito sucesso, saúde e felicidade! ✨' as "contactBirthdayMessage",
        '09:00:00' as "sendBirthdayTime",
        true as "createAnnouncementForUsers",
        NULL as "whatsappId",
        NOW() as "createdAt",
        NOW() as "updatedAt"
      FROM "Companies"
      WHERE NOT EXISTS (
        SELECT 1 FROM "BirthdaySettings" WHERE "companyId" = "Companies".id
      )
    `);

    console.log('✅ Configurações padrão inseridas para empresas existentes.');
    console.log('🎉 Correção da tabela BirthdaySettings concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao corrigir tabela BirthdaySettings:', error);
    throw error;
  }
};

// Executar se chamado diretamente
if (require.main === module) {
  fixBirthdaySettings()
    .then(() => {
      console.log('✅ Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro na execução do script:', error);
      process.exit(1);
    });
}

export default fixBirthdaySettings;
