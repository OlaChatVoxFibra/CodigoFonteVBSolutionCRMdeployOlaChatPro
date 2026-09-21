/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: (queryInterface: QueryInterface) => {
        return Promise.all([
            queryInterface.addColumn("Companies", "document", {
                type: DataTypes.STRING,
                defaultValue: ""
            }),
            queryInterface.addColumn("Companies", "paymentMethod", {
                type: DataTypes.STRING,
                defaultValue: ""
            })
        ]);
    },

    down: (queryInterface: QueryInterface) => {
        return Promise.all([
            queryInterface.removeColumn("Companies", "document"),
            queryInterface.removeColumn("Companies", "paymentMethod")
        ]);
    }
};
