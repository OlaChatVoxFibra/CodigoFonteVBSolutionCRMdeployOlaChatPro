/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// src/hooks/useAudioRecorder.js
import { useState, useRef, useCallback } from 'react';

/**
 * ✅ CORREÇÃO KISS: Hook customizado para gravação de áudio otimizada para mobile
 * Detecta automaticamente o melhor método de gravação baseado no device
 */

const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const durationIntervalRef = useRef(null);

  // ✅ KISS: Detectar se é mobile
  const isMobileDevice = () => {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // ✅ KISS: Configurações otimizadas para áudio mobile
  const getAudioConstraints = () => {
    return {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000,  // 16kHz para WhatsApp
        channelCount: 1,    // Mono para economia
        sampleSize: 16      // 16 bits
      }
    };
  };

  // ✅ KISS: Obter melhor mimetype suportado
  const getBestMimeType = () => {
    const types = [
      'audio/webm;codecs=opus', // Preferido para WhatsApp
      'audio/webm',
      'audio/mp4',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return null; // Usar padrão do device
  };

  // ✅ KISS: Iniciar contador de duração
  const startDurationCounter = () => {
    setDuration(0);
    durationIntervalRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  // ✅ KISS: Parar contador de duração
  const stopDurationCounter = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  // ✅ KISS: Iniciar gravação
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      console.log('🎤 Iniciando gravação...');
      
      // Obter stream de áudio
      const stream = await navigator.mediaDevices.getUserMedia(getAudioConstraints());
      streamRef.current = stream;
      
      // Obter melhor mimetype
      const mimeType = getBestMimeType();
      console.log(`📱 Usando mimetype: ${mimeType || 'padrão'}`);
      
      // Configurar MediaRecorder
      const options = mimeType ? { mimeType } : {};
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      // Event handlers
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        console.log('✅ Gravação finalizada');
        stopDurationCounter();
        
        // Parar todas as tracks do stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error('❌ Erro na gravação:', event.error);
        setError('Erro na gravação: ' + event.error.message);
        setIsRecording(false);
        stopDurationCounter();
      };

      // Iniciar gravação
      mediaRecorderRef.current.start(100); // Coletar dados a cada 100ms
      setIsRecording(true);
      startDurationCounter();
      
      console.log('🎵 Gravação iniciada com sucesso');
      
    } catch (err) {
      console.error('❌ Erro ao iniciar gravação:', err);
      setError('Erro ao acessar microfone: ' + err.message);
      setIsRecording(false);
    }
  }, []);

  // ✅ KISS: Parar gravação e retornar blob
  const stopRecording = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current || !isRecording) {
        reject(new Error('Gravação não está ativa'));
        return;
      }

      console.log('⏹️ Parando gravação...');

      mediaRecorderRef.current.onstop = () => {
        try {
          // Criar blob final
          const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          
          console.log(`🎵 Áudio processado: ${audioBlob.size} bytes, tipo: ${mimeType}`);
          
          // Validar tamanho mínimo
          if (audioBlob.size < 1000) {
            reject(new Error('Áudio muito pequeno'));
            return;
          }

          // Limpar dados
          audioChunksRef.current = [];
          mediaRecorderRef.current = null;
          setIsRecording(false);
          
          resolve({
            blob: audioBlob,
            mimeType: mimeType,
            duration: duration,
            size: audioBlob.size
          });
          
        } catch (error) {
          console.error('❌ Erro ao processar áudio:', error);
          reject(error);
        }
      };

      mediaRecorderRef.current.stop();
    });
  }, [isRecording, duration]);

  // ✅ KISS: Cancelar gravação
  const cancelRecording = useCallback(() => {
    console.log('❌ Cancelando gravação...');
    
    try {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        audioChunksRef.current = [];
        mediaRecorderRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      setIsRecording(false);
      setDuration(0);
      stopDurationCounter();
      
      console.log('✅ Gravação cancelada');
    } catch (err) {
      console.error('⚠️ Erro ao cancelar:', err);
    }
  }, [isRecording]);

  // ✅ KISS: Formatar duração em MM:SS
  const formatDuration = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // ✅ KISS: Cleanup on unmount
  const cleanup = useCallback(() => {
    if (isRecording) {
      cancelRecording();
    }
    stopDurationCounter();
  }, [isRecording, cancelRecording]);

  return {
    // Estado
    isRecording,
    duration,
    error,
    
    // Funções
    startRecording,
    stopRecording,
    cancelRecording,
    formatDuration,
    cleanup,
    
    // Utilitários
    isMobileDevice: isMobileDevice(),
    isSupported: typeof MediaRecorder !== 'undefined'
  };
};

export default useAudioRecorder;