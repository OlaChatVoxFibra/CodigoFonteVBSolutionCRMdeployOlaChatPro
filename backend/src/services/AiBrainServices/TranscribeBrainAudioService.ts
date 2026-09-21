/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import fs from "fs";
import OpenAI from "openai";
import AppError from "../../errors/AppError";
import { resolveBrainOpenAiApiKey } from "./brainPlatformApiKeys";
import { chargeBrainTurn } from "./BrainCreditService";

function mapWhisperLanguage(language?: string): string | undefined {
  const code = String(language || "pt-BR").toLowerCase();
  if (code.startsWith("pt")) return "pt";
  if (code.startsWith("es")) return "es";
  if (code.startsWith("en")) return "en";
  return undefined;
}

export async function transcribeBrainAudio(
  companyId: number,
  userId: number,
  filePath: string,
  language?: string
): Promise<string> {
  const apiKey = resolveBrainOpenAiApiKey();

  if (!fs.existsSync(filePath)) {
    throw new AppError("Arquivo de áudio não encontrado.", 400);
  }

  const client = new OpenAI({ apiKey });
  const whisperLang = mapWhisperLanguage(language);

  try {
    const transcription = await client.audio.transcriptions.create({
      model: "whisper-1",
      file: fs.createReadStream(filePath) as unknown as File,
      ...(whisperLang ? { language: whisperLang } : {})
    });

    const text = String(transcription.text || "").trim();
    if (!text) {
      throw new AppError("Não foi possível transcrever o áudio.", 400);
    }

    await chargeBrainTurn({
      companyId,
      userId,
      provider: "openai",
      model: "whisper-1",
      isTranscribe: true
    });

    return text;
  } catch (err: unknown) {
    const message =
      err instanceof AppError
        ? err.message
        : (err as { message?: string })?.message || "Erro ao transcrever áudio.";
    throw new AppError(message, 400);
  }
}
