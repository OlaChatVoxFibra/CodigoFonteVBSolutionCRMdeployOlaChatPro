/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// src/utils/AudioUtils.ts
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import path from "path";
import fs from "fs";

ffmpeg.setFfmpegPath(ffmpegStatic!);

/**
 * ✅ CORREÇÃO KISS: Utilitário simples para áudio mobile
 * Detecta e converte arquivos de áudio para formato compatível com WhatsApp Mobile
 */

// Tipos de áudio suportados pelo WhatsApp em dispositivos móveis
const MOBILE_AUDIO_CONFIG = {
  format: "ogg",
  codec: "libopus", 
  mimetype: "audio/ogg; codecs=opus",
  frequency: 16000, // 16kHz é otimal para voz
  bitrate: 32, // 32kbps é suficiente para voz
  channels: 1 // Mono para economizar dados
};

// Lista simples de extensões de áudio
const AUDIO_EXTENSIONS = ['.mp3', '.ogg', '.wav', '.webm', '.m4a', '.aac'];

// Lista simples de mimetypes de áudio
const AUDIO_MIMETYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 
  'audio/webm', 'audio/m4a', 'audio/aac', 'audio/x-wav'
];

/**
 * Detecta se um arquivo é áudio de forma simples e direta
 */
export const isAudio = (mimetype: string, filename: string = ''): boolean => {
  // Verificar mimetype
  if (AUDIO_MIMETYPES.includes(mimetype) || mimetype.startsWith('audio/')) {
    return true;
  }
  
  // Verificar extensão do arquivo
  const lowerFilename = filename.toLowerCase();
  if (AUDIO_EXTENSIONS.some(ext => lowerFilename.endsWith(ext))) {
    return true;
  }
  
  // Verificar padrões de nome de áudio gravado
  if (lowerFilename.includes('audio_') || lowerFilename.includes('áudio')) {
    return true;
  }
  
  return false;
};

/**
 * Converte áudio para formato otimizado para WhatsApp Mobile
 */
export const convertToMobileAudio = async (
  inputPath: string, 
  outputDir: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const timestamp = new Date().getTime();
    const outputFileName = `mobile_audio_${timestamp}.ogg`;
    const outputPath = path.join(outputDir, outputFileName);
    
    console.log(`🔄 Convertendo áudio: ${inputPath} -> ${outputPath}`);
    
    ffmpeg(inputPath)
      .outputFormat(MOBILE_AUDIO_CONFIG.format)
      .noVideo()
      .audioCodec(MOBILE_AUDIO_CONFIG.codec)
      .audioChannels(MOBILE_AUDIO_CONFIG.channels)
      .audioFrequency(MOBILE_AUDIO_CONFIG.frequency)
      .audioBitrate(MOBILE_AUDIO_CONFIG.bitrate)
      .addOutputOptions([
        "-avoid_negative_ts", "make_zero",
        "-application", "voip", // Otimizado para voz
        "-compression_level", "10", // Máxima compressão
        "-frame_duration", "20", // 20ms por frame (padrão WhatsApp)
        "-vbr", "off" // Desabilitar VBR para compatibilidade
      ])
      .on("start", (commandLine) => {
        console.log(`🎵 Iniciando conversão: ${commandLine}`);
      })
      .on("progress", (progress) => {
        if (progress.percent) {
          console.log(`📊 Progresso: ${Math.round(progress.percent)}%`);
        }
      })
      .on("end", () => {
        console.log(`✅ Conversão concluída: ${outputPath}`);
        resolve(outputPath);
      })
      .on("error", (err) => {
        console.log(`❌ Erro na conversão: ${err.message}`);
        // Tentar limpar arquivo de saída em caso de erro
        try {
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
        } catch {}
        reject(err);
      })
      .save(outputPath);
  });
};

/**
 * Limpa arquivos temporários de áudio
 */
export const cleanupTempAudio = (filePath: string, delayMs: number = 5000): void => {
  setTimeout(() => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🧹 Arquivo temporário removido: ${filePath}`);
      }
    } catch (error) {
      console.log(`⚠️ Erro ao remover arquivo temporário: ${error}`);
    }
  }, delayMs);
};

/**
 * Obter configuração de áudio mobile padrão
 */
export const getMobileAudioOptions = (audioBuffer: Buffer) => {
  return {
    audio: audioBuffer,
    mimetype: MOBILE_AUDIO_CONFIG.mimetype,
    ptt: true // Sempre como push-to-talk para melhor compatibilidade
  };
};

/**
 * Validar se arquivo de áudio é válido
 */
export const validateAudioFile = (filePath: string): Promise<boolean> => {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.log(`❌ Arquivo de áudio inválido: ${err.message}`);
        resolve(false);
        return;
      }
      
      // Verificar se tem stream de áudio
      const hasAudioStream = metadata.streams.some(stream => stream.codec_type === 'audio');
      
      if (!hasAudioStream) {
        console.log(`❌ Arquivo não contém stream de áudio`);
        resolve(false);
        return;
      }
      
      console.log(`✅ Arquivo de áudio válido`);
      resolve(true);
    });
  });
};

/**
 * Obter informações do arquivo de áudio
 */
export const getAudioInfo = (filePath: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      
      const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
      
      if (!audioStream) {
        reject(new Error('Nenhum stream de áudio encontrado'));
        return;
      }
      
      resolve({
        duration: metadata.format.duration,
        bitrate: metadata.format.bit_rate,
        codec: audioStream.codec_name,
        sampleRate: audioStream.sample_rate,
        channels: audioStream.channels
      });
    });
  });
};