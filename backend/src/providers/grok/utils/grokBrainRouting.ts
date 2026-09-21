/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { isGrokModelId, resolveGrokModelId } from "../utils/isGrokModel";
import { assertBrainPlatformKey } from "../../../services/AiBrainServices/brainPlatformCredentials";
import { tryLoadGrokApiKeyForCompany } from "../services/GrokIntegrationService";

export function grokBrainProviderFromModel(model?: string | null): "grok" | null {
  return isGrokModelId(model) ? "grok" : null;
}

/**
 * Grok no Brain: chave da plataforma (preferida) ou integração Grok da empresa.
 */
export async function assertGrokBrainModelAvailable(
  companyId: number,
  model?: string | null
): Promise<{ provider: "grok"; modelId: string; apiKey: string }> {
  const modelId = resolveGrokModelId(model);
  try {
    const apiKey = assertBrainPlatformKey("grok");
    return { provider: "grok", modelId, apiKey };
  } catch {
    const companyKey = await tryLoadGrokApiKeyForCompany(companyId);
    if (companyKey) {
      return { provider: "grok", modelId, apiKey: companyKey };
    }
    throw new Error(
      "Chave Grok (xAI) não disponível. Configure BRAIN_PLATFORM_XAI_API_KEY no servidor ou a integração Grok em Conexões."
    );
  }
}
