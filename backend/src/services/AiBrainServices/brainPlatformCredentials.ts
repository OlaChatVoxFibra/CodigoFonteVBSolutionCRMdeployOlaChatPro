/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Chaves fixas da plataforma VB Solution para Brain.AI.
 * Não usa chaves das integrações por organização (WhatsApp/Prompts continuam com chave do user),
 * exceto Grok, que pode cair na integração da empresa se a chave da plataforma não existir.
 */
export type BrainPlatformProvider = "openai" | "anthropic" | "gemini" | "grok";

export function getBrainPlatformOpenAiKey(): string {
  return String(
    process.env.BRAIN_PLATFORM_OPENAI_API_KEY ||
      process.env.OPENAI_BRAIN_API_KEY ||
      ""
  ).trim();
}

export function getBrainPlatformAnthropicKey(): string {
  return String(
    process.env.BRAIN_PLATFORM_ANTHROPIC_API_KEY ||
      process.env.ANTHROPIC_BRAIN_API_KEY ||
      ""
  ).trim();
}

export function getBrainPlatformGeminiKey(): string {
  return String(
    process.env.BRAIN_PLATFORM_GEMINI_API_KEY ||
      process.env.GEMINI_BRAIN_API_KEY ||
      ""
  ).trim();
}

export function getBrainPlatformGrokKey(): string {
  return String(
    process.env.BRAIN_PLATFORM_XAI_API_KEY ||
      process.env.BRAIN_PLATFORM_GROK_API_KEY ||
      process.env.XAI_BRAIN_API_KEY ||
      process.env.GROK_BRAIN_API_KEY ||
      ""
  ).trim();
}

export function getBrainPlatformApiKey(provider: BrainPlatformProvider): string {
  switch (provider) {
    case "anthropic":
      return getBrainPlatformAnthropicKey();
    case "gemini":
      return getBrainPlatformGeminiKey();
    case "grok":
      return getBrainPlatformGrokKey();
    default:
      return getBrainPlatformOpenAiKey();
  }
}

export function assertBrainPlatformKey(provider: BrainPlatformProvider): string {
  const key = getBrainPlatformApiKey(provider);
  if (!key) {
    const labels: Record<BrainPlatformProvider, string> = {
      openai: "OpenAI",
      anthropic: "Anthropic Claude",
      gemini: "Google Gemini",
      grok: "Grok (xAI)"
    };
    throw new Error(
      `Chave da plataforma Brain.AI (${labels[provider]}) não configurada no servidor. Contate o administrador.`
    );
  }
  return key;
}

export function listBrainPlatformKeyStatus(): Record<
  BrainPlatformProvider,
  { configured: boolean }
> {
  return {
    openai: { configured: Boolean(getBrainPlatformOpenAiKey()) },
    anthropic: { configured: Boolean(getBrainPlatformAnthropicKey()) },
    gemini: { configured: Boolean(getBrainPlatformGeminiKey()) },
    grok: { configured: Boolean(getBrainPlatformGrokKey()) }
  };
}
