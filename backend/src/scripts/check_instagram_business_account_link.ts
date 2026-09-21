/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import sequelize from "../database";
import {
  getAccessTokenFromPage,
  getInstagramBusinessAccountFromPage,
  getPageProfile
} from "../services/FacebookServices/graphAPI";

async function main() {
  const companyId = 1;

  // Pega uma conexão facebook existente para testar o vínculo IG (SQL direto evita problema
  // de init do modelo em scripts avulsos).
  const rows: any = await sequelize.query(
    `SELECT "facebookPageUserId", "facebookUserToken", "tokenMeta", "facebookUserId"
     FROM "Whatsapps"
     WHERE "companyId" = :companyId AND LOWER("channel") = 'facebook'
     ORDER BY "updatedAt" DESC
     LIMIT 1;`,
    { replacements: { companyId }, type: (sequelize as any).QueryTypes?.SELECT ?? undefined }
  );

  const fbWhatsapp = Array.isArray(rows) ? rows[0] : rows?.[0];

  if (!fbWhatsapp) {
    console.log("NO_FACEBOOK_CONNECTION_FOR_COMPANY", { companyId });
    process.exit(0);
  }

  const pageId = fbWhatsapp.facebookPageUserId;
  const pageToken = fbWhatsapp.facebookUserToken; // token da Page já salvo no banco
  const userToken = fbWhatsapp.tokenMeta; // token do usuário que fez o login
  const facebookUserId = fbWhatsapp.facebookUserId;

  if (!pageId || !pageToken) {
    console.log("MISSING_PAGE_ID_OR_TOKEN", {
      pageId: !!pageId,
      pageTokenLen: pageToken?.length ?? 0,
      userTokenLen: userToken?.length ?? 0
    });
    process.exit(0);
  }

  if (!facebookUserId || !userToken) {
    console.log("MISSING_USER_TOKEN", { facebookUserId: !!facebookUserId, userTokenLen: userToken?.length ?? 0 });
    process.exit(0);
  }

  let longLivedPageToken = pageToken;
  try {
    longLivedPageToken = await getAccessTokenFromPage(pageToken);
  } catch {
    // fallback: continua com o token original da Page
  }

  const igWithPageToken = await getInstagramBusinessAccountFromPage(pageId, longLivedPageToken);
  const igWithUserToken = userToken
    ? await getInstagramBusinessAccountFromPage(pageId, userToken)
    : null;

  // Testa também se o getPageProfile já devolve a ligação instagram_business_account na lista
  let pageProfileIG = null;
  try {
    const rawPages = await getPageProfile(facebookUserId, userToken);
    const data = rawPages?.data;
    const pageObj = Array.isArray(data) ? data.find((p: any) => String(p?.id) === String(pageId)) : null;
    pageProfileIG = pageObj?.instagram_business_account || pageObj?.instagram_business_accounts || null;
  } catch {
    // ignora
  }

  console.log(
    "IG_RESOLVE_RESULT",
    {
      pageId,
      pageTokenLen: pageToken?.length ?? 0,
      userTokenLen: userToken?.length ?? 0,
      facebookUserIdPresent: !!facebookUserId,
      withLongLivedPageToken: igWithPageToken
        ? { id: igWithPageToken.id ?? null, username: igWithPageToken.username ?? null, name: igWithPageToken.name ?? null }
        : null,
      withUserToken: igWithUserToken
        ? { id: igWithUserToken.id ?? null, username: igWithUserToken.username ?? null, name: igWithUserToken.name ?? null }
        : null
      ,
      pageProfileIGCandidate: pageProfileIG
    }
  );

  // Normalmente a resolução retorna id+username.
  // Se vier null, a Page não está com IG business vinculado (ou a permissão/token não permite ler isso).
  process.exit(0);
}

main().catch((e) => {
  console.error("ERR", e);
  process.exit(1);
});

