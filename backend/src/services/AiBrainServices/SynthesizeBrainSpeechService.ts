/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import OpenAI from "openai";
import AppError from "../../errors/AppError";
import { resolveBrainOpenAiApiKey } from "./brainPlatformApiKeys";
import { chargeBrainTurn } from "./BrainCreditService";

export type BrainSpeechGender = "female" | "male";

const OPENAI_VOICE_BY_GENDER: Record<BrainSpeechGender, "nova" | "onyx"> = {
  female: "nova",
  male: "onyx"
};

const MAX_TTS_CHARS = 4096;

export function stripMarkdownForTts(text: string): string {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_~>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeGender(gender?: string): BrainSpeechGender {
  return String(gender || "").toLowerCase() === "male" ? "male" : "female";
}

export async function synthesizeBrainSpeech(
  companyId: number,
  userId: number,
  rawText: string,
  gender?: string
): Promise<Buffer> {
  const apiKey = resolveBrainOpenAiApiKey();

  const text = stripMarkdownForTts(rawText).slice(0, MAX_TTS_CHARS);
  if (!text) {
    throw new AppError("Texto vazio para síntese de voz.", 400);
  }

  const voiceGender = normalizeGender(gender);
  const voice = OPENAI_VOICE_BY_GENDER[voiceGender];
  const client = new OpenAI({ apiKey });

  try {
    const response = await client.audio.speech.create({
      model: "tts-1-hd",
      voice,
      input: text,
      response_format: "mp3",
      speed: 1
    });

    const arrayBuffer = await response.arrayBuffer();

    await chargeBrainTurn({
      companyId,
      userId,
      provider: "openai",
      model: "tts-1-hd",
      isSynthesize: true
    });

    return Buffer.from(arrayBuffer);
  } catch (err: unknown) {
    const message =
      err instanceof AppError
        ? err.message
        : (err as { message?: string })?.message || "Erro ao gerar áudio.";
    throw new AppError(message, 400);
  }
}
