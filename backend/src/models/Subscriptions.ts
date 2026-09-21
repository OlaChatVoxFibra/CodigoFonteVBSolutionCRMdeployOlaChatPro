/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
    Table,
    Column,
    CreatedAt,
    UpdatedAt,
    Model,
    PrimaryKey,
    AutoIncrement,
    AllowNull
} from "sequelize-typescript";

@Table
class Subscriptions extends Model<Subscriptions> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @Column
    isActive: boolean;

    @AllowNull(true)
    @Column
    userPriceCents: number;

    @AllowNull(true)
    @Column
    whatsPriceCents: number;

    @AllowNull(true)
    @Column
    lastInvoiceUrl: string;

    @AllowNull(true)
    @Column
    lastPlanChange: Date;

    @AllowNull(true)
    @Column
    expiresAt: Date;

    @AllowNull(true)
    @Column
    providerSubscriptionId: string;

    @Column
    companyId: number;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default Subscriptions;
