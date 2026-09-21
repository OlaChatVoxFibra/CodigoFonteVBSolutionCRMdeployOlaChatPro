/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useState, useRef, useCallback, useEffect } from "react";

const GENDER_STORAGE_KEY = "brainVoiceGender";
const CHUNK_MS = 2800;
const UTTERANCE_FLUSH_MS = 2600;
const SILENCE_FLUSH_MS = 700;
const MIN_CHARS_TO_SEND = 3;
const MIN_BLOB_BYTES = 1200;
const AUDIO_MERGE_CYCLES = 2;

function isIgnorableTranscribeError(err) {
  const msg = String(
    err?.response?.data?.error || err?.response?.data?.message || err?.message || ""
  ).toLowerCase();
  return (
    msg.includes("invalid file format") ||
    msg.includes("não foi possível transcrever") ||
    msg.includes("could not transcribe") ||
    msg.includes("audio file is too short") ||
    (msg.includes("400") && msg.includes("format"))
  );
}

const GREETINGS = {
  "pt-BR": "Olá, sou o Brain A I, em que posso ajudar você hoje?",
  en: "Hello, I'm Brain A I. How can I help you today?",
  es: "Hola, soy Brain A I. ¿En qué puedo ayudarte hoy?",
};

function getBestMimeType() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/wav"];
  if (typeof MediaRecorder === "undefined") return "";
  return types.find((t) => MediaRecorder.isTypeSupported(t)) || "";
}

function mapSpeechLang(code) {
  const c = String(code || "pt-BR").toLowerCase();
  if (c.startsWith("en")) return "en-US";
  if (c.startsWith("es")) return "es-ES";
  return "pt-BR";
}

function getGreeting(code) {
  const c = String(code || "pt-BR").toLowerCase();
  if (c.startsWith("en")) return GREETINGS.en;
  if (c.startsWith("es")) return GREETINGS.es;
  return GREETINGS["pt-BR"];
}

function normalizeSpeechKey(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\w\sáàâãéêíóôõúüç]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Une transcrições parciais sem repetir trechos sobrepostos */
function mergeTranscriptParts(existing, incoming) {
  const a = String(existing || "").trim();
  const b = String(incoming || "").trim();
  if (!a) return b;
  if (!b) return a;

  const aLow = a.toLowerCase();
  const bLow = b.toLowerCase();
  if (bLow.startsWith(aLow)) return b;
  if (aLow.startsWith(bLow)) return a;
  if (aLow.includes(bLow)) return a;
  if (bLow.includes(aLow)) return b;

  const aWords = a.split(/\s+/);
  const bWords = b.split(/\s+/);
  const maxOverlap = Math.min(aWords.length, bWords.length);
  for (let size = maxOverlap; size >= 1; size -= 1) {
    const tail = aWords.slice(-size).join(" ").toLowerCase();
    const head = bWords.slice(0, size).join(" ").toLowerCase();
    if (tail === head) {
      return `${a} ${bWords.slice(size).join(" ")}`.trim();
    }
  }

  return `${a} ${b}`.trim();
}

export function stripMarkdownForSpeech(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_~>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function summarizeForSpeech(text) {
  const clean = stripMarkdownForSpeech(text);
  if (!clean) return "";

  const parts = clean.match(/[^.!?]+[.!?]+/g);
  if (parts?.length) {
    let spoken = "";
    for (const part of parts) {
      const next = `${spoken}${part}`.trim();
      if (next.length > 420) break;
      spoken = next;
      if (spoken.length >= 36) break;
    }
    if (spoken.trim()) return spoken.trim();
  }

  if (clean.length <= 420) return clean;
  return `${clean.slice(0, 417).trim()}…`;
}

function pickVoice(gender, langCode) {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return null;

  const langPrefix = mapSpeechLang(langCode).split("-")[0].toLowerCase();
  const langVoices = voices.filter((v) =>
    String(v.lang || "").toLowerCase().startsWith(langPrefix)
  );
  const pool = langVoices.length ? langVoices : voices;
  const femaleRe =
    /maria|francisca|luciana|female|mulher|feminina|woman|helo[ií]sa|vit[oó]ria|camila/i;
  const maleRe = /daniel|male|homem|masculino|man|tiago|jo[aã]o|ricardo|felipe/i;
  const re = gender === "male" ? maleRe : femaleRe;
  return pool.find((v) => re.test(v.name)) || pool[0] || voices[0];
}

function loadStoredGender() {
  try {
    const v = localStorage.getItem(GENDER_STORAGE_KEY);
    if (v === "male" || v === "female") return v;
  } catch {
    /* ignore */
  }
  return null;
}

function ensureVoicesReady() {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve([]);
      return;
    }
    const synth = window.speechSynthesis;
    const pick = () => synth.getVoices();
    const first = pick();
    if (first.length) {
      resolve(first);
      return;
    }
    const onChange = () => {
      synth.removeEventListener("voiceschanged", onChange);
      resolve(pick());
    };
    synth.addEventListener("voiceschanged", onChange);
    setTimeout(() => resolve(pick()), 800);
  });
}

export function unlockSpeechSynthesis() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    const synth = window.speechSynthesis;
    if (synth.paused) synth.resume();
  } catch {
    /* ignore */
  }
}

/**
 * Conversa Jarvis — microfone contínuo a cada 2s via MediaRecorder + Whisper.
 * Independente do ditado do composer.
 */
export default function useBrainVoiceMode({
  language = "pt-BR",
  sendMessage,
  transcribeChunk,
  onSessionStart,
  enabled = false,
}) {
  const [gender, setGenderState] = useState(loadStoredGender);
  const [phase, setPhase] = useState("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [lastSpoken, setLastSpoken] = useState("");
  const [error, setError] = useState(null);

  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const cycleTimerRef = useRef(null);
  const cyclePartsRef = useRef([]);
  const activeMimeRef = useRef("audio/webm");
  const micActiveRef = useRef(false);
  const phaseRef = useRef("idle");
  const enabledRef = useRef(false);
  const sendMessageRef = useRef(sendMessage);
  const transcribeChunkRef = useRef(transcribeChunk);
  const onSessionStartRef = useRef(onSessionStart);
  const genderRef = useRef(gender);
  const languageRef = useRef(language);
  const processingRef = useRef(false);
  const queueRef = useRef([]);
  const chunkQueueRef = useRef([]);
  const processingChunkRef = useRef(false);
  const sessionStartedRef = useRef(false);
  const lastProcessedKeyRef = useRef("");
  const lastProcessedAtRef = useRef(0);
  const executeTurnRef = useRef(() => {});
  const utteranceBufferRef = useRef("");
  const utteranceFlushTimerRef = useRef(null);
  const flushUtteranceRef = useRef(() => {});
  const pendingBlobsRef = useRef([]);
  const pendingBlobFlushTimerRef = useRef(null);

  sendMessageRef.current = sendMessage;
  transcribeChunkRef.current = transcribeChunk;
  onSessionStartRef.current = onSessionStart;
  genderRef.current = gender;
  languageRef.current = language;

  const setPhaseSafe = useCallback((next) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const stopMic = useCallback(() => {
    micActiveRef.current = false;
    if (cycleTimerRef.current) {
      clearTimeout(cycleTimerRef.current);
      cycleTimerRef.current = null;
    }
    if (utteranceFlushTimerRef.current) {
      clearTimeout(utteranceFlushTimerRef.current);
      utteranceFlushTimerRef.current = null;
    }
    if (pendingBlobFlushTimerRef.current) {
      clearTimeout(pendingBlobFlushTimerRef.current);
      pendingBlobFlushTimerRef.current = null;
    }
    const rec = recorderRef.current;
    recorderRef.current = null;
    cyclePartsRef.current = [];
    if (rec) {
      try {
        rec.ondataavailable = null;
        rec.onerror = null;
        rec.onstop = null;
        if (rec.state !== "inactive") rec.stop();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const stopMicStream = useCallback(() => {
    stopMic();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, [stopMic]);

  const cancelSpeech = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const setGender = useCallback((value) => {
    if (value !== "male" && value !== "female") return;
    setGenderState(value);
    genderRef.current = value;
    try {
      localStorage.setItem(GENDER_STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
  }, []);

  const speakText = useCallback(
    async (rawText) => {
      const fallback = stripMarkdownForSpeech(rawText);
      const text = summarizeForSpeech(rawText) || fallback;
      if (!text || typeof window === "undefined" || !window.speechSynthesis) {
        return false;
      }

      await ensureVoicesReady();
      unlockSpeechSynthesis();
      cancelSpeech();
      setLastSpoken(text);

      const synth = window.speechSynthesis;

      return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = pickVoice(genderRef.current || "female", languageRef.current);
        if (voice) utterance.voice = voice;
        utterance.lang = mapSpeechLang(languageRef.current);
        utterance.rate = 1;
        utterance.pitch = genderRef.current === "male" ? 0.9 : 1.05;
        utterance.volume = 1;

        let settled = false;
        const finish = (ok) => {
          if (settled) return;
          settled = true;
          resolve(ok);
        };

        utterance.onend = () => finish(true);
        utterance.onerror = () => finish(false);

        try {
          if (synth.paused) synth.resume();
          synth.speak(utterance);
        } catch {
          finish(false);
        }

        setTimeout(() => finish(true), Math.max(14000, text.length * 100 + 2500));
      });
    },
    [cancelSpeech]
  );

  const executeTurn = useCallback(
    async (text) => {
      const trimmed = String(text || "").trim();
      if (!trimmed || trimmed.length < MIN_CHARS_TO_SEND || !enabledRef.current) return;

      const key = normalizeSpeechKey(trimmed);
      const now = Date.now();
      if (key && key === lastProcessedKeyRef.current && now - lastProcessedAtRef.current < 8000) {
        return;
      }
      lastProcessedKeyRef.current = key;
      lastProcessedAtRef.current = now;

      processingRef.current = true;
      stopMic();
      utteranceBufferRef.current = "";
      if (utteranceFlushTimerRef.current) {
        clearTimeout(utteranceFlushTimerRef.current);
        utteranceFlushTimerRef.current = null;
      }
      setPhaseSafe("thinking");
      setError(null);

      let reply = "";
      try {
        const result = await sendMessageRef.current(trimmed, {
          voice: true,
          jarvis: true,
        });
        reply = String(result?.response || "").trim();
        if (!reply) {
          reply = "Não consegui processar agora. Pode repetir?";
        }
      } catch (err) {
        reply =
          err?.response?.data?.error ||
          err?.message ||
          "Desculpe, tive um problema. Pode repetir?";
        setError(reply);
      }

      if (reply && enabledRef.current) {
        setPhaseSafe("speaking");
        await speakText(reply);
      }

      processingRef.current = false;

      if (!enabledRef.current) {
        setPhaseSafe("idle");
        return;
      }

      while (queueRef.current.length > 0 && enabledRef.current) {
        const next = queueRef.current.shift();
        if (next?.trim()) {
          await executeTurnRef.current(next);
        }
      }

      setLiveTranscript("");
      setPhaseSafe("listening");
      startMicRef.current();
    },
    [setPhaseSafe, speakText, stopMic]
  );

  executeTurnRef.current = executeTurn;

  const flushUtterance = useCallback(async () => {
    if (utteranceFlushTimerRef.current) {
      clearTimeout(utteranceFlushTimerRef.current);
      utteranceFlushTimerRef.current = null;
    }

    const text = utteranceBufferRef.current.trim();
    utteranceBufferRef.current = "";
    if (text.length < MIN_CHARS_TO_SEND || !enabledRef.current) return;

    if (processingRef.current) {
      if (!queueRef.current.includes(text)) {
        queueRef.current.push(text);
      }
      return;
    }

    await executeTurnRef.current(text);
  }, []);

  flushUtteranceRef.current = flushUtterance;

  const scheduleUtteranceFlush = useCallback((delay = UTTERANCE_FLUSH_MS) => {
    if (utteranceFlushTimerRef.current) {
      clearTimeout(utteranceFlushTimerRef.current);
    }
    utteranceFlushTimerRef.current = setTimeout(() => {
      flushUtteranceRef.current();
    }, delay);
  }, []);

  const appendUtteranceText = useCallback(
    (incoming) => {
      const part = String(incoming || "").trim();
      if (!part) return false;

      utteranceBufferRef.current = mergeTranscriptParts(
        utteranceBufferRef.current,
        part
      );
      setLiveTranscript(utteranceBufferRef.current);
      scheduleUtteranceFlush(UTTERANCE_FLUSH_MS);
      return true;
    },
    [scheduleUtteranceFlush]
  );

  const handleAudioChunk = useCallback(
    async (blob) => {
      if (!enabledRef.current) return;
      if (phaseRef.current === "speaking") return;
      if (!blob || blob.size < MIN_BLOB_BYTES) return;
      if (typeof transcribeChunkRef.current !== "function") return;

      try {
        const text = String((await transcribeChunkRef.current(blob)) || "").trim();

        if (!text || text.length < MIN_CHARS_TO_SEND) {
          if (utteranceBufferRef.current.trim().length >= MIN_CHARS_TO_SEND) {
            scheduleUtteranceFlush(SILENCE_FLUSH_MS);
          }
          return;
        }

        setError(null);
        appendUtteranceText(text);
      } catch (err) {
        if (isIgnorableTranscribeError(err)) return;
        const msg = err?.response?.data?.error || err?.message || "";
        if (msg && !isIgnorableTranscribeError({ message: msg })) {
          setError(msg);
        }
      }
    },
    [appendUtteranceText, scheduleUtteranceFlush]
  );

  const drainChunkQueue = useCallback(async () => {
    if (processingChunkRef.current || !chunkQueueRef.current.length) return;
    processingChunkRef.current = true;
    const blob = chunkQueueRef.current.shift();
    try {
      await handleAudioChunk(blob);
    } finally {
      processingChunkRef.current = false;
      if (chunkQueueRef.current.length) {
        drainChunkQueue();
      }
    }
  }, [handleAudioChunk]);

  const flushPendingBlobs = useCallback(() => {
    if (pendingBlobFlushTimerRef.current) {
      clearTimeout(pendingBlobFlushTimerRef.current);
      pendingBlobFlushTimerRef.current = null;
    }
    const blobs = pendingBlobsRef.current;
    pendingBlobsRef.current = [];
    if (!blobs.length) return;

    const merged = new Blob(blobs, { type: activeMimeRef.current });
    if (merged.size < MIN_BLOB_BYTES) return;

    chunkQueueRef.current.push(merged);
    drainChunkQueue();
  }, [drainChunkQueue]);

  const enqueueAudioChunk = useCallback(
    (blob) => {
      if (!blob || blob.size < MIN_BLOB_BYTES) return;

      pendingBlobsRef.current.push(blob);

      if (pendingBlobsRef.current.length >= AUDIO_MERGE_CYCLES) {
        flushPendingBlobs();
        return;
      }

      if (pendingBlobFlushTimerRef.current) {
        clearTimeout(pendingBlobFlushTimerRef.current);
      }
      pendingBlobFlushTimerRef.current = setTimeout(() => {
        flushPendingBlobs();
      }, CHUNK_MS + 400);
    },
    [flushPendingBlobs]
  );

  const beginMicCycle = useCallback(() => {
    if (!enabledRef.current || micActiveRef.current || processingRef.current) return;
    if (!streamRef.current || typeof MediaRecorder === "undefined") return;

    const mimeType = getBestMimeType() || "audio/webm";
    activeMimeRef.current = mimeType;
    cyclePartsRef.current = [];

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorderRef.current = recorder;
    micActiveRef.current = true;

    recorder.ondataavailable = (event) => {
      if (event.data?.size > 0) {
        cyclePartsRef.current.push(event.data);
      }
    };

    recorder.onerror = () => {
      micActiveRef.current = false;
    };

    recorder.onstop = () => {
      micActiveRef.current = false;
      recorderRef.current = null;

      const blob = new Blob(cyclePartsRef.current, { type: activeMimeRef.current });
      cyclePartsRef.current = [];

      if (
        blob.size >= MIN_BLOB_BYTES &&
        enabledRef.current &&
        phaseRef.current === "listening"
      ) {
        enqueueAudioChunk(blob);
      }

      if (enabledRef.current && phaseRef.current === "listening" && !processingRef.current) {
        setTimeout(() => beginMicCycleRef.current(), 80);
      }
    };

    try {
      recorder.start();
      cycleTimerRef.current = setTimeout(() => {
        if (recorder.state === "recording") {
          try {
            recorder.stop();
          } catch {
            micActiveRef.current = false;
          }
        }
      }, CHUNK_MS);
    } catch {
      micActiveRef.current = false;
    }
  }, [enqueueAudioChunk]);

  const beginMicCycleRef = useRef(beginMicCycle);
  beginMicCycleRef.current = beginMicCycle;

  const startMicRef = useRef(() => {});

  const startMic = useCallback(async () => {
    if (!enabledRef.current || processingRef.current) return;
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Microfone não suportado neste navegador.");
      return;
    }

    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }

      stopMic();
      setPhaseSafe("listening");
      setError(null);
      beginMicCycleRef.current();
    } catch (err) {
      micActiveRef.current = false;
      setError(err?.message || "Permita o microfone no navegador.");
      setPhaseSafe("idle");
    }
  }, [setPhaseSafe, stopMic]);

  startMicRef.current = startMic;

  const stopVoiceMode = useCallback(() => {
    enabledRef.current = false;
    processingRef.current = false;
    stopMicStream();
    cancelSpeech();
    queueRef.current = [];
    chunkQueueRef.current = [];
    pendingBlobsRef.current = [];
    utteranceBufferRef.current = "";
    processingChunkRef.current = false;
    lastProcessedKeyRef.current = "";
    lastProcessedAtRef.current = 0;
    sessionStartedRef.current = false;
    setLiveTranscript("");
    setLastSpoken("");
    setError(null);
    setPhaseSafe("idle");
  }, [cancelSpeech, setPhaseSafe, stopMicStream]);

  const startVoiceMode = useCallback(
    async (genderOverride) => {
      if (genderOverride === "male" || genderOverride === "female") {
        genderRef.current = genderOverride;
        setGenderState(genderOverride);
        try {
          localStorage.setItem(GENDER_STORAGE_KEY, genderOverride);
        } catch {
          /* ignore */
        }
      }
      if (!genderRef.current) return false;
      if (typeof transcribeChunkRef.current !== "function") {
        setError("Transcrição por voz indisponível.");
        return false;
      }

      enabledRef.current = true;
      unlockSpeechSynthesis();
      processingRef.current = false;
      queueRef.current = [];
      setLiveTranscript("");
      setLastSpoken("");
      setError(null);

      if (!sessionStartedRef.current) {
        sessionStartedRef.current = true;
        onSessionStartRef.current?.();
      }

      setPhaseSafe("speaking");
      await speakText(getGreeting(languageRef.current));

      if (!enabledRef.current) return false;

      await startMicRef.current();
      return true;
    },
    [speakText, setPhaseSafe]
  );

  useEffect(() => {
    if (enabled) {
      enabledRef.current = true;
    } else {
      stopVoiceMode();
    }
  }, [enabled, stopVoiceMode]);

  useEffect(() => {
    return () => {
      stopVoiceMode();
    };
  }, [stopVoiceMode]);

  const chunkSupported =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof transcribeChunk === "function";

  const isSupported =
    chunkSupported && typeof window.speechSynthesis !== "undefined";

  return {
    gender,
    setGender,
    phase,
    liveTranscript,
    lastSpoken,
    error,
    isSupported,
    startVoiceMode,
    stopVoiceMode,
    unlockSpeechSynthesis,
  };
}
