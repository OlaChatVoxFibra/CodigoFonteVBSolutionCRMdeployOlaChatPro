/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: (queryInterface: QueryInterface) => {
        return queryInterface.addColumn("Companies", "generateInvoice", {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: true
        })
    },

    down: (queryInterface: QueryInterface) => {
        return queryInterface.removeColumn("Companies", "generateInvoice");
    }
};
