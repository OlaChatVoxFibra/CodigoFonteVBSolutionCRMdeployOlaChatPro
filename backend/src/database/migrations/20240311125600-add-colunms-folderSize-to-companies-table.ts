/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: (queryInterface: QueryInterface) => {
        return queryInterface.addColumn("Companies", "folderSize", {
            type: DataTypes.STRING,
            allowNull: true
        }),
            queryInterface.addColumn("Companies", "numberFileFolder", {
                type: DataTypes.STRING,
                allowNull: true
            }),
            queryInterface.addColumn("Companies", "updatedAtFolder", {
                type: DataTypes.STRING,
                allowNull: true
            });
    },

    down: (queryInterface: QueryInterface) => {
        return queryInterface.removeColumn("Companies", "folderSize"),
            queryInterface.removeColumn("Companies", "numberFileFolder"),
            queryInterface.removeColumn("Companies", "updatedAtFolder");
    }
};
