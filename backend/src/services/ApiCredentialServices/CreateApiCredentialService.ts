/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import * as Yup from "yup";
import AppError from "../../errors/AppError";
import ApiCredential, { ApiCredentialScope } from "../../models/ApiCredential";
import Company from "../../models/Company";
import {
  generateApiKey,
  hashApiKey
} from "../../helpers/apiKeyUtils";
import { encryptApiKeySecret } from "../../helpers/apiKeyCrypto";
import { normalizeScopes } from "../../helpers/apiKeyScopes";

interface Request {
  name?: string;
  companyId: number;
  scopes?: ApiCredentialScope[];
  expiresAt?: Date | null;
  createdByUserId?: number;
}

const CreateApiCredentialService = async ({
  name,
  companyId,
  scopes,
  expiresAt,
  createdByUserId
}: Request): Promise<{ credential: ApiCredential; key: string }> => {
  const credentialName = String(name || "API CRM").trim();

  const schema = Yup.object().shape({
    name: Yup.string().min(2).max(120).required(),
    companyId: Yup.number().required()
  });

  try {
    await schema.validate({ name: credentialName, companyId });
  } catch (err: any) {
    throw new AppError(err.message, 400);
  }

  const company = await Company.findByPk(companyId);
  if (!company) {
    throw new AppError("ERR_NO_COMPANY_FOUND", 404);
  }

  const { key, keyPrefix } = generateApiKey();
  const keyHash = await hashApiKey(key);

  const credential = await ApiCredential.create({
    name: credentialName,
    companyId,
    keyPrefix,
    keyHash,
    keyEncrypted: encryptApiKeySecret(key) || null,
    scopes: normalizeScopes(scopes),
    createdByUserId: createdByUserId || null,
    expiresAt: expiresAt || null,
    revokedAt: null,
    lastUsedAt: null
  });

  return { credential, key };
};

export default CreateApiCredentialService;
