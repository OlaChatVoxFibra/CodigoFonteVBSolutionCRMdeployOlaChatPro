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
    Default,
    AutoIncrement
} from "sequelize-typescript";

@Table
class ApiUsages extends Model<ApiUsages> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @Default(0)
    @Column
    companyId: number;

    @Default(null)
    @Column
    dateUsed: string;

    @Default(0)
    @Column
    UsedOnDay: number;

    @Default(0)
    @Column
    usedText: number;

    @Default(0)
    @Column
    usedPDF: number;

    @Default(0)
    @Column
    usedImage: number;

    @Default(0)
    @Column
    usedVideo: number;

    @Default(0)
    @Column
    usedOther: number;

    @Default(0)
    @Column
    usedCheckNumber: number;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
    dataValues: string | PromiseLike<string>;

}

export default ApiUsages;
