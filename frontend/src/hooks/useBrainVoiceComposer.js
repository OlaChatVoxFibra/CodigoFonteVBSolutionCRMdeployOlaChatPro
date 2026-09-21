/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useState, useRef, useCallback, useEffect } from "react";

const CHUNK_MS = 2000;

export function getSpeechRecognitionCtor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function getBestMimeType() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/wav"];
  if (typeof MediaRecorder === "undefined") return "";
  return types.find((t) => MediaRecorder.isTypeSupported(t)) || "";
}

export default function useBrainVoiceComposer({
  language = "pt-BR",
  onTextChange,
  transcribeChunk,
}) {
  const [isActive, setIsActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [liveText, setLiveText] = useState("");

  const baseMessageRef = useRef("");
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const processingQueueRef = useRef(false);
  const pendingRealtimeRef = useRef(false);
  const lastRealtimeTextRef = useRef("");
  const chunkErrorCountRef = useRef(0);
  const activeRef = useRef(false);
  const savingRef = useRef(false);
  const pausedRef = useRef(false);
  const onTextChangeRef = useRef(onTextChange);
  const transcribeChunkRef = useRef(transcribeChunk);
  const chunkSupported =
    typeof MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof transcribeChunk === "function";
  void language;

  onTextChangeRef.current = onTextChange;
  transcribeChunkRef.current = transcribeChunk;

  const formatDuration = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  }, [stopTimer]);

  const buildComposerText = useCallback(() => {
    const base = baseMessageRef.current.trim();
    const spoken = [finalTranscriptRef.current, interimTranscriptRef.current]
      .map((s) => String(s || "").trim())
      .filter(Boolean)
      .join(" ");
    if (!base) return spoken;
    if (!spoken) return base;
    return `${base} ${spoken}`;
  }, []);

  const pushLiveText = useCallback(() => {
    const text = buildComposerText();
    setLiveText(text);
    onTextChangeRef.current(text);
  }, [buildComposerText]);

  const stopMicStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const stopChunkRecorder = useCallback(() => {
    const rec = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    if (!rec) return;
    try {
      if (rec.state !== "inactive") rec.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const appendTranscript = useCallback(
    (text) => {
      const normalized = String(text || "").trim();
      if (!normalized) return;
      finalTranscriptRef.current = normalized;
      interimTranscriptRef.current = "";
      pushLiveText();
    },
    [pushLiveText]
  );

  const requestMicStream = useCallback(async () => {
    if (streamRef.current) return streamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    streamRef.current = stream;
    return stream;
  }, []);

  const processRealtimeTranscription = useCallback(async () => {
    if (processingQueueRef.current) return;
    processingQueueRef.current = true;
    try {
      do {
        pendingRealtimeRef.current = false;
        if (!activeRef.current || pausedRef.current || savingRef.current) break;
        if (!transcribeChunkRef.current || audioChunksRef.current.length === 0) break;
        if (chunkErrorCountRef.current >= 3) break;

        const joined = new Blob(audioChunksRef.current, {
          type: audioChunksRef.current[0]?.type || "audio/webm"
        });
        if (joined.size < 1200) break;

        try {
          const text = String((await transcribeChunkRef.current(joined)) || "").trim();
          if (text && text !== lastRealtimeTextRef.current) {
            lastRealtimeTextRef.current = text;
            chunkErrorCountRef.current = 0;
            appendTranscript(text);
          }
        } catch {
          chunkErrorCountRef.current += 1;
        }
      } while (pendingRealtimeRef.current);
    } finally {
      processingQueueRef.current = false;
    }
  }, [appendTranscript]);

  const queueRealtimeTranscription = useCallback(async () => {
    pendingRealtimeRef.current = true;
    if (!processingQueueRef.current) {
      await processRealtimeTranscription();
    }
  }, [processRealtimeTranscription]);

  const startBufferRecorder = useCallback(async () => {
    if (typeof MediaRecorder === "undefined" || mediaRecorderRef.current) return;
    const stream = await requestMicStream();
    const mimeType = getBestMimeType();
    const options = mimeType ? { mimeType } : {};
    const recorder = new MediaRecorder(stream, options);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = async (event) => {
      if (!activeRef.current || pausedRef.current || savingRef.current) return;
      if (event.data && event.data.size > 700) {
        audioChunksRef.current.push(event.data);
        await queueRealtimeTranscription();
      }
    };

    recorder.start(CHUNK_MS);
  }, [requestMicStream, queueRealtimeTranscription]);

  const start = useCallback(
    async (currentMessage = "") => {
      if (!chunkSupported) {
        throw new Error("Ditado por voz não disponível neste navegador.");
      }

      baseMessageRef.current = String(currentMessage || "").trim();
      finalTranscriptRef.current = "";
      interimTranscriptRef.current = "";
      audioChunksRef.current = [];
      processingQueueRef.current = false;
      pendingRealtimeRef.current = false;
      lastRealtimeTextRef.current = "";
      chunkErrorCountRef.current = 0;
      activeRef.current = true;
      savingRef.current = false;
      pausedRef.current = false;

      const initialText = baseMessageRef.current;
      setLiveText(initialText);
      onTextChangeRef.current(initialText);
      setIsActive(true);
      setIsPaused(false);
      setDuration(0);

      await startBufferRecorder();
      startTimer();
    },
    [
      chunkSupported,
      startBufferRecorder,
      startTimer,
    ]
  );

  const cancel = useCallback(() => {
    activeRef.current = false;
    savingRef.current = false;
    pausedRef.current = false;
    stopChunkRecorder();
    stopMicStream();
    stopTimer();

    const restored = baseMessageRef.current;
    setLiveText(restored);
    onTextChangeRef.current(restored);

    baseMessageRef.current = "";
    finalTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    audioChunksRef.current = [];
    lastRealtimeTextRef.current = "";
    processingQueueRef.current = false;
    setIsActive(false);
    setIsPaused(false);
    setDuration(0);
    setIsSaving(false);
  }, [stopChunkRecorder, stopMicStream, stopTimer]);

  const pause = useCallback(() => {
    if (!activeRef.current || pausedRef.current || savingRef.current) return;
    pausedRef.current = true;
    setIsPaused(true);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
    }
    stopTimer();
    interimTranscriptRef.current = "";
    pushLiveText();
  }, [stopTimer, pushLiveText]);

  const resume = useCallback(async () => {
    if (!activeRef.current || !pausedRef.current || savingRef.current) return;
    pausedRef.current = false;
    setIsPaused(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
    }
    startTimer();
  }, [startTimer]);

  const save = useCallback(async () => {
    if (!activeRef.current) return "";

    savingRef.current = true;
    activeRef.current = false;
    pausedRef.current = false;
    setIsSaving(true);
    // Processa tudo que já foi enfileirado antes de finalizar.
    await processRealtimeTranscription();
    stopChunkRecorder();
    stopMicStream();
    stopTimer();

    if (interimTranscriptRef.current) {
      finalTranscriptRef.current = `${finalTranscriptRef.current} ${interimTranscriptRef.current}`.trim();
      interimTranscriptRef.current = "";
    }

    let spoken = finalTranscriptRef.current.trim();
    if (transcribeChunkRef.current && audioChunksRef.current.length > 0) {
      const joined = new Blob(audioChunksRef.current, { type: audioChunksRef.current[0]?.type || "audio/webm" });
      try {
        const finalFromFullAudio = String((await transcribeChunkRef.current(joined)) || "").trim();
        // Prefere a transcrição final do áudio completo para garantir frase inteira no salvar.
        if (finalFromFullAudio) {
          spoken = finalFromFullAudio;
        }
      } catch {
        // Mantém o melhor texto ao vivo já capturado se a transcrição final falhar.
      }
    }

    const base = baseMessageRef.current.trim();
    const finalMessage = [base, spoken].filter(Boolean).join(base && spoken ? " " : "");

    setLiveText(finalMessage);
    onTextChangeRef.current(finalMessage);

    baseMessageRef.current = "";
    finalTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    audioChunksRef.current = [];
    lastRealtimeTextRef.current = "";
    processingQueueRef.current = false;
    setIsActive(false);
    setIsPaused(false);
    setIsSaving(false);
    savingRef.current = false;
    setDuration(0);

    return finalMessage;
  }, [processRealtimeTranscription, stopChunkRecorder, stopMicStream, stopTimer]);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      savingRef.current = false;
      pausedRef.current = false;
      stopChunkRecorder();
      stopMicStream();
      stopTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isRecording: isActive,
    isSaving,
    isPaused,
    duration,
    liveText,
    formatDuration,
    chunkSupported,
    isSupported: chunkSupported,
    start,
    save,
    cancel,
    pause,
    resume,
  };
}
