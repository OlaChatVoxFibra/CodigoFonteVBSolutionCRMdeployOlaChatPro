/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import path from "path";
import fs from "fs";
import Message from "../../models/Message";

import axios from "axios";
import FormData from "form-data";
import { Transcription } from "openai/resources/audio/transcriptions";

type Response = Transcription | string;

function resolveAudioFilePath(mediaUrl: string, companyId: string): string | null {
  const clean = String(mediaUrl || "").trim();
  if (!clean) return null;
  const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
  const candidates: string[] = [];

  try {
    const url = new URL(clean);
    const fileName = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "");
    if (fileName) {
      candidates.push(path.join(publicFolder, `company${companyId}`, fileName));
      candidates.push(path.join(publicFolder, fileName));
    }
  } catch {
    const fileName = decodeURIComponent(clean.split("?")[0].split("#")[0].split("/").filter(Boolean).pop() || clean);
    candidates.push(path.join(publicFolder, `company${companyId}`, fileName));
    candidates.push(path.join(publicFolder, clean));
    candidates.push(path.resolve(clean));
  }

  return candidates.find(candidate => fs.existsSync(candidate)) || null;
}

const TranscribeAudioMessageToText = async (wid: string, companyId: string): Promise<Response> => {
  try {
    // Busca a mensagem com os detalhes do arquivo de áudio
    const msg = await Message.findOne({
      where: {
        wid: wid,
        companyId: companyId,
      },
    });

    if (!msg) {
      throw new Error("Mensagem não encontrada");
    }

    const data = new FormData();
    let config;

    const mediaUrl = String(msg.mediaUrl || "").trim();
    if (!mediaUrl) {
      throw new Error("Mensagem sem arquivo de áudio");
    }

    // Verifica se a mediaUrl é uma URL remota válida
    if (/^https?:\/\//i.test(mediaUrl)) {
      // Se for uma URL, usa diretamente
      data.append('url', mediaUrl);
      config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${process.env.TRANSCRIBE_URL}/transcrever`,
        headers: {
          'Authorization': `Bearer ${process.env.TRANSCRIBE_API_KEY}`,
          ...data.getHeaders(),
        },
        data: data,
      };
    } else {
      const filePath = resolveAudioFilePath(mediaUrl, companyId);

      if (!filePath) {
        throw new Error(`Arquivo de áudio não encontrado: ${mediaUrl}`);
      }

      data.append('audio', fs.createReadStream(filePath));
      config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${process.env.TRANSCRIBE_URL}/transcrever`,
        headers: {
          'Authorization': `Bearer ${process.env.TRANSCRIBE_API_KEY}`,
          ...data.getHeaders(),
        },
        data: data,
      };
    }

    // Faz a requisição para o endpoint
    const res = await axios.request(config);

    await msg.update({
      body: res.data,
      transcrito: true,
    });

    return res.data;
  } catch (error) {
    console.error("Erro durante a transcrição:", error);
    return "Não foi possível transcrever este áudio. A reprodução continua disponível pelo player.";
  }
};

export default TranscribeAudioMessageToText;
