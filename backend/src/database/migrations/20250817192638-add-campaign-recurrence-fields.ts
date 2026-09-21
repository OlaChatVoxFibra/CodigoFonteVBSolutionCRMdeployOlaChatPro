/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn('Campaigns', 'isRecurring', {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    await queryInterface.addColumn('Campaigns', 'recurrenceType', {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('Campaigns', 'recurrenceInterval', {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: true
    });

    await queryInterface.addColumn('Campaigns', 'recurrenceDaysOfWeek', {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('Campaigns', 'recurrenceDayOfMonth', {
      type: DataTypes.INTEGER,
      allowNull: true
    });

    await queryInterface.addColumn('Campaigns', 'recurrenceEndDate', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Campaigns', 'maxExecutions', {
      type: DataTypes.INTEGER,
      allowNull: true
    });

    await queryInterface.addColumn('Campaigns', 'executionCount', {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    });

    await queryInterface.addColumn('Campaigns', 'nextScheduledAt', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Campaigns', 'lastExecutedAt', {
      type: DataTypes.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    const columns = [
      'isRecurring', 'recurrenceType', 'recurrenceInterval', 
      'recurrenceDaysOfWeek', 'recurrenceDayOfMonth', 'recurrenceEndDate',
      'maxExecutions', 'executionCount', 'nextScheduledAt', 'lastExecutedAt'
    ];
    
    for (const column of columns) {
      await queryInterface.removeColumn('Campaigns', column);
    }
  }
};