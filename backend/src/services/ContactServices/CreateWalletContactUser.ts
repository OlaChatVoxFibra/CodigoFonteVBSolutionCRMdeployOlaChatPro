/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import ContactWallet from "../../models/ContactWallet";
import UserQueue from "../../models/UserQueue";

interface Wallet {
  walletId: number | string;
  queueId: number | string;
  contactId: number | string;
  companyId: number | string;
}

export async function createWalletContactUser(contactId: number, userId: number, queueId: number, companyId: number) {
  let _queueId = queueId;

  await ContactWallet.destroy({
    where: {
      companyId,
      contactId
    }
  });

  if (queueId === null || queueId === undefined || queueId as unknown === "null" || queueId as unknown === "undefined") {
    const queues = await UserQueue.findAll({
      where: {
        userId
      }
    });

    if (queues.length > 0) {
      const randomIndex = Math.floor(Math.random() * queues.length);
      _queueId = queues[randomIndex]?.queueId;
    }
  }

  const contactWallets: Wallet[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contactWallets.push({
    walletId: userId,
    queueId: queueId ? queueId : _queueId,
    contactId: contactId,
    companyId: companyId
  });

  await ContactWallet.bulkCreate(contactWallets);

}