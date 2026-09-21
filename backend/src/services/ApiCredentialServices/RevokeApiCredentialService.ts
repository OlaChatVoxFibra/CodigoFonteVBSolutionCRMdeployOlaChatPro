/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AppError from "../../errors/AppError";
import ApiCredential from "../../models/ApiCredential";

const RevokeApiCredentialService = async (
  id: number,
  companyId: number
): Promise<void> => {
  const credential = await ApiCredential.findByPk(id);
  if (
    !credential ||
    credential.revokedAt ||
    Number(credential.companyId) !== Number(companyId)
  ) {
    throw new AppError("ERR_API_CREDENTIAL_NOT_FOUND", 404);
  }

  await credential.update({ revokedAt: new Date() });
};

export default RevokeApiCredentialService;
