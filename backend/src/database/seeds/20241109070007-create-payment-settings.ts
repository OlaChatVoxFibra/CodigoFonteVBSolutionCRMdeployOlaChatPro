/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface } from "sequelize";
import { hash } from "bcryptjs";

module.exports = {
    up: (queryInterface: QueryInterface) => {
        return queryInterface.sequelize.transaction(async t => {
            return Promise.all([
                queryInterface.bulkInsert(
                    "Settings",
                    [
                        {
                            key: "asaas",
                            value: "",
                            companyId: 1,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        },
                    	{
                            key: "efichavepix",
                            value: "",
                            companyId: 1,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        },
                        {
                            key: "eficlientid",
                            value: "",
                            companyId: 1,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        },
                        {
                            key: "eficlientsecret",
                            value: "",
                            companyId: 1,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        },
                    	{
                            key: "mpaccesstoken",
                            value: "",
                            companyId: 1,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        },
                        {
                            key: "stripeprivatekey",
                            value: "",
                            companyId: 1,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        },
                        {
                            key: "asaastoken",
                            value: "",
                            companyId: 1,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    ],
                    { transaction: t }
                )
            ]);
        });
    },

    down: async (queryInterface: QueryInterface) => {
        return queryInterface.bulkDelete("Settings", {});
    }
};
