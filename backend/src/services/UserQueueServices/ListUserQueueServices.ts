/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op, Sequelize } from "sequelize";
import AppError from "../../errors/AppError";
import UserQueue from "../../models/UserQueue";
import Queue from "../../models/Queue";
import User from "../../models/User";
import Ticket from "../../models/Ticket";

const ListUserQueueServices = async (queueId: string | number): Promise<UserQueue> => {

    // Buscar a fila para verificar o tipo de roteamento
    const queue = await Queue.findByPk(queueId, {
        include: [
            {
                model: User,
                as: "users",
                through: { attributes: [] }
            }
        ]
    });

    if (!queue) {
        throw new AppError("ERR_QUEUE_NOT_FOUND", 404);
    }

    const usersInQueue = queue.users || [];
    if (usersInQueue.length === 0) {
        throw new AppError("ERR_NOT_FOUND_USER_IN_QUEUE", 404);
    }

    // Mapa de contagem de tickets pendentes por usuário na fila
    const userIds = usersInQueue.map(u => u.id);
    const pendingRows = await Ticket.findAll({
        attributes: [
            "userId",
            [Sequelize.fn("COUNT", Sequelize.col("id")), "pendingCount"]
        ],
        where: {
            queueId,
            status: "pending",
            userId: { [Op.in]: userIds }
        },
        group: ["userId"]
    });

    const pendingByUserId = new Map<number, number>();
    for (const row of pendingRows as any[]) {
        const r = row.get ? row.get() : row;
        pendingByUserId.set(Number(r.userId), Number(r.pendingCount));
    }

    // Preenche com zero para usuários sem tickets pendentes
    for (const u of usersInQueue) {
        if (!pendingByUserId.has(u.id)) pendingByUserId.set(u.id, 0);
    }

    if (queue.typeRandomMode === "ORDENADO") {
        // Escolhe o usuário com menor quantidade de pendentes; desempate por nome ASC
        const usersWithCounts = usersInQueue
            .map(u => ({ user: u, count: pendingByUserId.get(u.id) || 0 }))
            .sort((a, b) => {
                if (a.count !== b.count) return a.count - b.count;
                return a.user.name.localeCompare(b.user.name);
            });

        const chosenUser = usersWithCounts[0]?.user;
        if (!chosenUser) {
            throw new AppError("ERR_NOT_FOUND_USER_IN_QUEUE", 404);
        }

        const chosenUserQueue = await UserQueue.findOne({
            where: { queueId, userId: chosenUser.id },
            include: [
                { model: User, as: "user", attributes: ["id", "name"] }
            ]
        });

        if (!chosenUserQueue) {
            throw new AppError("ERR_NOT_FOUND_USER_IN_QUEUE", 404);
        }

        return chosenUserQueue;
    }

    // RANDOM: seleciona em memória para evitar dependência de função de banco (RAND/RANDOM)
    const userQueues = await UserQueue.findAll({
        where: { queueId },
        include: [
            {
                model: User,
                as: "user",
                attributes: ["id", "name"]
            }
        ]
    });

    if (!userQueues || userQueues.length === 0) {
        throw new AppError("ERR_NOT_FOUND_USER_IN_QUEUE", 404);
    }

    const randomIndex = Math.floor(Math.random() * userQueues.length);
    return userQueues[randomIndex];
};

export default ListUserQueueServices;
