/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { FindOptions } from "sequelize/types";
import Queue from "../../models/Queue";
import Whatsapp from "../../models/Whatsapp";
import Prompt from "../../models/Prompt";
import {
  attachTelegramOficialListMeta,
  normalizeTelegramOficialStatus
} from "../TelegramUserServices/normalizeTelegramOficialStatus";

interface Request {
  companyId: number;
  session?: number | string;
  isSuper?: boolean;
}

const backfillInstagramPlaceholders = async (companyId: number): Promise<void> => {
  // Para cada conexão `facebook` garantir uma conexão `instagram`.
  // Ajuda quando o Graph não retorna o `instagram_business_account` e o UI não mostra o ícone.
  const facebookWhatsapps = await Whatsapp.findAll({
    where: { companyId, channel: "facebook" },
    attributes: [
      "facebookPageUserId",
      "facebookUserId",
      "facebookUserToken",
      "tokenMeta"
    ],
    raw: true
  });

  if (!facebookWhatsapps.length) return;

  const pageIds = facebookWhatsapps
    .map((w: any) => w.facebookPageUserId)
    .filter((id: any) => !!id);

  if (!pageIds.length) return;

  const existingInsta = await Whatsapp.findAll({
    where: { companyId, channel: "instagram", facebookPageUserId: pageIds },
    attributes: ["facebookPageUserId"],
    raw: true
  });

  const existingSet = new Set(
    existingInsta.map((w: any) => String(w.facebookPageUserId))
  );

  const missing = facebookWhatsapps.filter(
    (w: any) => !existingSet.has(String(w.facebookPageUserId))
  );

  if (!missing.length) return;

  await Promise.all(
    missing.map((w: any) =>
      Whatsapp.create({
        name: `Instagram_${companyId}_${w.facebookPageUserId}`,
        status: "CONNECTED",
        companyId,
        channel: "instagram",
        facebookUserId: w.facebookUserId,
        facebookUserToken: w.facebookUserToken,
        facebookPageUserId: w.facebookPageUserId,
        tokenMeta: w.tokenMeta || null,
        greetingMessage: "",
        farewellMessage: "",
        isDefault: false,
        plugged: false,
        battery: "",
        retries: 0,
        groupAsTicket: "disabled",
        agentDisabled: true
      } as any)
    )
  );
};

const ListWhatsAppsService = async ({
  session,
  companyId,
  isSuper
}: Request): Promise<Whatsapp[]> => {
  const whereCondition: any = {};
  
  if (!isSuper) {
    whereCondition.companyId = companyId;
  }

  const options: FindOptions = {
    where: whereCondition,
    include: [
      {
        model: Queue,
        as: "queues",
        attributes: ["id", "name", "color", "greetingMessage"]
      },
      {
        model: Prompt,
        as: "prompt",
      }
    ]
  };

  if (session !== undefined && session == 0) {
    options.attributes = { exclude: ["session"] };
  }

  if (!isSuper) {
    await backfillInstagramPlaceholders(companyId);
  }

  let whatsapps = await Whatsapp.findAll(options);

  if (!isSuper && whatsapps?.length) {
    // Quando existir conexão "instagram" para uma mesma Page (facebookPageUserId),
    // mostramos apenas a conexão instagram na lista para o usuário,
    // evitando parecer que "duplicou".
    const instagramPageIds = new Set(
      whatsapps
        .filter((w: any) => w.channel === "instagram" && w.facebookPageUserId)
        .map((w: any) => String(w.facebookPageUserId))
    );

    if (instagramPageIds.size > 0) {
      whatsapps = whatsapps.filter((w: any) => {
        if (w.channel !== "facebook") return true;
        if (!w.facebookPageUserId) return true;
        return !instagramPageIds.has(String(w.facebookPageUserId));
      });
    }
  }

  // Telegram/SMS não passam por sessão Baileys — OPENING era spinner infinito no UI
  const stuckOpening = whatsapps.filter(
    (w: any) =>
      (w.channel === "telegram" || w.channel === "sms" || w.channel === "linkedin") &&
      w.status === "OPENING" &&
      w.token
  );
  if (stuckOpening.length) {
    await Promise.all(
      stuckOpening.map((w: any) =>
        Whatsapp.update({ status: "CONNECTED" }, { where: { id: w.id } })
      )
    );
    whatsapps = whatsapps.map((w: any) => {
      if (
        (w.channel === "telegram" || w.channel === "sms" || w.channel === "linkedin") &&
        w.status === "OPENING"
      ) {
        return { ...w.toJSON(), status: "CONNECTED" };
      }
      return w;
    });
  }

  const tgOficial = whatsapps.filter(
    (w: any) => w.channel === "telegram_oficial"
  );
  if (tgOficial.length) {
    await Promise.all(
      tgOficial.map((w: any) => normalizeTelegramOficialStatus(w))
    );
    const refreshed = await Whatsapp.findAll({
      where: { id: tgOficial.map((w: any) => w.id) },
      attributes: { include: ["session", "tokenMeta"] }
    });
    const byId = new Map(refreshed.map((w) => [w.id, w]));
    whatsapps = whatsapps.map((w: any) => {
      const fresh = byId.get(w.id);
      return fresh || w;
    });
  }

  if (session !== undefined && session == 0) {
    return whatsapps.map((w: any) => {
      if (w.channel === "telegram_oficial") {
        return attachTelegramOficialListMeta(w);
      }
      const j = w.toJSON ? w.toJSON() : w;
      if (j.session !== undefined) delete j.session;
      return j;
    }) as any;
  }

  return whatsapps;
};



export default ListWhatsAppsService;
