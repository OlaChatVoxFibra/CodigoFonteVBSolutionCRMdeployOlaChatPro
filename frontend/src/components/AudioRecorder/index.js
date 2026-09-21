/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Button,
  IconButton,
  Box,
  Typography,
  Chip
} from '@material-ui/core';
import {
  Mic as MicIcon,
  Stop as StopIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Delete as DeleteIcon,
  Check as CheckIcon
} from '@material-ui/icons';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  recorderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: theme.spacing(2),
    border: `1px dashed ${theme.palette.grey[400]}`,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(2)
  },
  recordingControls: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1)
  },
  recordButton: {
    backgroundColor: '#f44336',
    color: 'white',
    '&:hover': {
      backgroundColor: '#d32f2f'
    }
  },
  recordingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1)
  },
  timeDisplay: {
    fontFamily: 'monospace',
    fontSize: '1.2rem',
    color: theme.palette.text.primary
  },
  audioControls: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    width: '100%'
  },
  waveformPlaceholder: {
    width: '100%',
    height: 60,
    backgroundColor: theme.palette.grey[200],
    borderRadius: theme.shape.borderRadius,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing(1)
  }
}));

const AudioRecorder = ({ onAudioRecorded, onAudioDeleted, disabled = false }) => {
  const classes = useStyles();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // ✅ CORREÇÃO: Determinar melhor formato baseado no suporte do browser
  const getBestAudioFormat = () => {
    const formats = [
      'audio/ogg; codecs=opus',    // Preferido - WhatsApp compatível
      'audio/webm; codecs=opus',   // Fallback 1
      'audio/mp4',                 // Fallback 2
      'audio/wav'                  // Último recurso
    ];

    for (const format of formats) {
      if (MediaRecorder.isTypeSupported(format)) {
        console.log(`📱 Usando formato de áudio: ${format}`);
        return format;
      }
    }
    
    console.warn('⚠️ Nenhum formato preferido suportado, usando padrão');
    return undefined; // Browser decidirá
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,  // ✅ Taxa recomendada para Opus
          channelCount: 1     // ✅ Mono para WhatsApp
        } 
      });
      
      // ✅ CORREÇÃO: Usar formato compatível com WhatsApp
      const mimeType = getBestAudioFormat();
      const options = mimeType ? { mimeType } : {};
      
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        // ✅ CORREÇÃO: Criar blob com tipo correto para WhatsApp
        const finalMimeType = mediaRecorderRef.current.mimeType || 'audio/ogg';
        const blob = new Blob(chunksRef.current, { type: finalMimeType });
        
        console.log(`🎵 Áudio gravado: ${blob.size} bytes, tipo: ${finalMimeType}`);
        setAudioBlob(blob);
        
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Parar todas as tracks de áudio
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      
      // Iniciar timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      alert('Erro ao acessar o microfone. Verifique as permissões.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setRecordingTime(0);
    setIsPlaying(false);
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    
    if (onAudioDeleted) {
      onAudioDeleted();
    }
  };

  const confirmRecording = () => {
    if (audioBlob && onAudioRecorded) {
      onAudioRecorded(audioBlob);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box className={classes.recorderContainer}>
      {!audioBlob && !isRecording && (
        <Button
          variant="contained"
          className={classes.recordButton}
          startIcon={<MicIcon />}
          onClick={startRecording}
          disabled={disabled}
          size="large"
        >
          Gravar Áudio
        </Button>
      )}

      {isRecording && (
        <Box className={classes.recordingIndicator}>
          <Chip 
            icon={<MicIcon />} 
            label="Gravando..." 
            color="secondary" 
            variant="outlined"
          />
          <Typography className={classes.timeDisplay}>
            {formatTime(recordingTime)}
          </Typography>
          <IconButton onClick={stopRecording} color="primary">
            <StopIcon />
          </IconButton>
        </Box>
      )}

      {audioBlob && (
        <>
          <Box className={classes.waveformPlaceholder}>
            <Typography variant="body2" color="textSecondary">
              Áudio gravado - {formatTime(recordingTime)}
            </Typography>
          </Box>
          
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            style={{ display: 'none' }}
          />
          
          <Box className={classes.audioControls}>
            <IconButton 
              onClick={isPlaying ? pauseAudio : playAudio}
              color="primary"
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </IconButton>
            
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body2" align="center">
                Clique em ✓ para confirmar ou 🗑️ para excluir
              </Typography>
            </Box>
            
            <IconButton onClick={deleteRecording} color="secondary">
              <DeleteIcon />
            </IconButton>
            
            <IconButton onClick={confirmRecording} color="primary">
              <CheckIcon />
            </IconButton>
          </Box>
        </>
      )}
    </Box>
  );
};

export default AudioRecorder;