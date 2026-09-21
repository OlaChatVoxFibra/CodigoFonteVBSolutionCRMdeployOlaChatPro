/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import sequelize from "../database";
import { getAccessTokenFromPage, getSubscribedApps } from "../services/FacebookServices/graphAPI";

async function main() {
  const companyId = 1;

  const rows: any = await sequelize.query(
    `SELECT "facebookPageUserId", "facebookUserToken"
     FROM "Whatsapps"
     WHERE "companyId" = :companyId AND LOWER("channel") = 'facebook'
     ORDER BY "updatedAt" DESC
     LIMIT 1;`,
    { replacements: { companyId }, type: (sequelize as any).QueryTypes?.SELECT ?? undefined }
  );

  const fbWhatsapp = Array.isArray(rows) ? rows[0] : rows?.[0];
  if (!fbWhatsapp) {
    console.log("NO_FACEBOOK_CONNECTION");
    process.exit(0);
  }

  const pageId = fbWhatsapp.facebookPageUserId;
  const pageToken = fbWhatsapp.facebookUserToken;
  if (!pageId || !pageToken) {
    console.log("MISSING_PAGE_ID_OR_TOKEN", { pageIdPresent: !!pageId, pageTokenLen: pageToken?.length ?? 0 });
    process.exit(0);
  }

  let longLivedPageToken = pageToken;
  try {
    longLivedPageToken = await getAccessTokenFromPage(pageToken);
  } catch {
    // fallback
  }

  const subscribed = await getSubscribedApps(pageId, longLivedPageToken);

  console.log("SUBSCRIBED_APPS_PAGE_RESULT", {
    pageId,
    tokenShort: longLivedPageToken?.slice(0, 8) + "..." + longLivedPageToken?.slice(-4),
    subscribed: typeof subscribed === "string" ? subscribed : JSON.stringify(subscribed, null, 2)
  });
}

main().catch((e) => {
  console.error("ERR", e);
  process.exit(1);
});

