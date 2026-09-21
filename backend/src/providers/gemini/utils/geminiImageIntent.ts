/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { isGeminiImageGenerationModel } from "./geminiModelCapabilities";
import { GEMINI_BRAIN_IMAGE_MODEL_FALLBACKS } from "./geminiApiErrors";

/** Modelo Nano Banana padrão quando o chat pede imagem (como no app Google Gemini). */
export const GEMINI_BRAIN_DEFAULT_IMAGE_MODEL = GEMINI_BRAIN_IMAGE_MODEL_FALLBACKS[0];

const IMAGE_INTENT_PATTERNS = [
  /\b(gera|gerar|gere|cria|criar|crie|desenha|desenhe|desenhar|fa[cç]a|fazer|produza|produzir|monta|montar)\b.{0,50}\b(imagem|imagens|foto|fotos|ilustra[cç][aã]o|arte|ícone|icone|logo|banner|figurinha|criativo|creativo|visual|post)\b/i,
  /\b(criativo|creativo|banner|post visual)\b.{0,40}\b(sobre|para|do|da|de|com)\b/i,
  /\b(imagem|foto|ilustra[cç][aã]o)\b.{0,30}\b(de|do|da|com|mostrando)\b/i,
  /\b(nano\s*banana|generate\s*image|create\s*image|draw\s*me|image\s*of)\b/i,
  /\bme\s+(manda|envia|mostra)\b.{0,20}\b(uma\s+)?(imagem|foto|criativo)\b/i
];

/**
 * Detecta pedido explícito de geração de imagem (não confunde com "analise esta imagem").
 */
export function userRequestsGeminiImageGeneration(text?: string | null): boolean {
  const raw = String(text || "").trim();
  if (!raw) return false;
  if (/\b(analis|descrev|o\s+que\s+h[aá]|nesta|nessa|anexo)\b.{0,30}\b(imagem|foto)\b/i.test(raw)) {
    return false;
  }
  return IMAGE_INTENT_PATTERNS.some((re) => re.test(raw));
}

/** Modelo de imagem usado no turno (Nano Banana), mantendo o modelo de chat escolhido no Brain. */
export function resolveGeminiBrainImageModelForTurn(chatModelId?: string | null): string {
  const chat = String(chatModelId || "").trim();
  if (isGeminiImageGenerationModel(chat)) {
    return chat;
  }
  return GEMINI_BRAIN_DEFAULT_IMAGE_MODEL;
}

/** Ordem de tentativa de modelos de imagem no Brain (Nano Banana). */
export function listGeminiBrainImageModelsToTry(preferred?: string | null): string[] {
  const first = String(preferred || "").trim() || GEMINI_BRAIN_DEFAULT_IMAGE_MODEL;
  const ordered = [first, ...GEMINI_BRAIN_IMAGE_MODEL_FALLBACKS];
  return [...new Set(ordered)];
}
