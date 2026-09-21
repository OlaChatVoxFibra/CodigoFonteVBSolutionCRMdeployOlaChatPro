/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Button } from "@material-ui/core";
import React, { useRef, useEffect, useState, useMemo } from "react";
import api from "../../services/api";
import { Typography } from "@material-ui/core";
import { useTheme, makeStyles } from "@material-ui/core/styles";
import { getBackendUrl } from "../../config";

const LS_NAME = "audioMessageRate";

// ✅ CORREÇÃO: Estilos específicos para controlar tamanho e aparência
const useStyles = makeStyles((theme) => ({
  audioContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: '380px', // ✅ Limita largura máxima
    minWidth: '300px',  // ✅ Largura mínima
    padding: 0,
    margin: 0,
    backgroundColor: 'transparent',
    border: 'none'
  },
  audioPlayerContainer: {
    position: 'relative',
    width: '100%',
    height: '40px', // ✅ Altura fixa
    marginBottom: theme.spacing(1)
  },
  audioPlayer: {
    width: '100%',
    height: '40px', // ✅ Altura específica
    outline: 'none',
    border: 'none',
    backgroundColor: 'transparent',
    // ✅ Remove aparência padrão problemática
    '&::-webkit-media-controls-panel': {
      backgroundColor: 'transparent',
    },
    '&::-webkit-media-controls-current-time-display, &::-webkit-media-controls-time-remaining-display': {
      fontSize: '12px'
    }
  },
  controlsContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: theme.spacing(1)
  },
  transcriptionContainer: {
    width: '100%',
    marginTop: theme.spacing(1),
    // ✅ CORREÇÃO: Centralizar o botão
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  transcriptionText: {
    fontSize: '0.875rem',
    lineHeight: 1.4,
    wordBreak: 'break-word',
    padding: theme.spacing(1),
    backgroundColor: theme.mode === "dark" ? "rgba(255,255,255,0.08)" : theme.palette.action.hover,
    color: theme.mode === "dark" ? "#fff" : theme.palette.text.primary,
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
    width: '100%',
    boxSizing: 'border-box'
  },
  transcriptionError: {
    fontSize: '0.8rem',
    lineHeight: 1.35,
    padding: theme.spacing(1),
    backgroundColor: theme.mode === "dark" ? "rgba(255,255,255,0.08)" : "#fff8e1",
    color: theme.mode === "dark" ? "#fff" : "#7a4f01",
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.mode === "dark" ? "rgba(255,255,255,0.18)" : "#ffe082"}`,
    width: '100%',
    boxSizing: 'border-box'
  },
  transcribeButton: {
    fontSize: '0.75rem',
    padding: theme.spacing(0.5, 1),
    minWidth: 'auto',
    height: '32px',
    // ✅ CORREÇÃO: Centralizar o botão
    alignSelf: 'center'
  },
  rateButton: {
    position: 'absolute',
    top: '2px',
    right: '8px',
    fontSize: '0.7rem',
    minWidth: 'auto',
    padding: '1px 6px',
    height: '18px',
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: 'white',
    borderRadius: '9px',
    zIndex: 10,
    lineHeight: 1,
    '&:hover': {
      backgroundColor: 'rgba(0,0,0,0.8)'
    },
    // ✅ Remover estilos de botão padrão
    border: 'none',
    textTransform: 'none',
    boxShadow: 'none'
  }
}));

const audioMimeFromUrl = (value = "") => {
  const clean = String(value).split("?")[0].split("#")[0].toLowerCase();
  if (clean.endsWith(".mp3")) return "audio/mpeg";
  if (clean.endsWith(".ogg") || clean.endsWith(".oga")) return "audio/ogg";
  if (clean.endsWith(".webm")) return "audio/webm";
  if (clean.endsWith(".wav")) return "audio/wav";
  if (clean.endsWith(".m4a") || clean.endsWith(".mp4")) return "audio/mp4";
  if (clean.endsWith(".aac")) return "audio/aac";
  return "";
};

const swapAudioExtension = (value = "", ext) => {
  if (!value || /^(blob:|data:)/i.test(value)) return "";
  const [base, suffix = ""] = String(value).split(/([?#].*)/);
  if (!/\.(ogg|oga|mp3|webm|wav|m4a|mp4|aac)$/i.test(base)) return "";
  return `${base.replace(/\.(ogg|oga|mp3|webm|wav|m4a|mp4|aac)$/i, ext)}${suffix}`;
};

const buildAudioSources = (url, message) => {
  const raw = String(url || "").trim();
  const candidates = [
    raw,
    message?.id ? `${getBackendUrl()}/messages/${message.id}/media` : "",
    swapAudioExtension(raw, ".mp3"),
    swapAudioExtension(raw, ".ogg"),
    swapAudioExtension(raw, ".webm"),
    swapAudioExtension(raw, ".m4a")
  ].filter(Boolean);
  return [...new Set(candidates)].map((src) => ({ src, type: audioMimeFromUrl(src) }));
};

const AudioModal = ({ url, message, disableTranscription = false }) => {
  const theme = useTheme();
  const classes = useStyles();
  const audioRef = useRef(null);
  const [audioRate, setAudioRate] = useState(
    parseFloat(localStorage.getItem(LS_NAME) || "1")
  );
  const [showButtonRate, setShowButtonRate] = useState(false);
  const [transcription, setTranscription] = useState(null);
  const [transcriptionError, setTranscriptionError] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [audioError, setAudioError] = useState(false);
  const audioSources = useMemo(() => buildAudioSources(url, message), [url, message]);
  const currentSource = audioSources[Math.min(sourceIndex, Math.max(audioSources.length - 1, 0))] || { src: url || "", type: "" };

  const body = message?.body ?? "";
  const transcrito = message?.transcrito ?? false;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = audioRate;
      localStorage.setItem(LS_NAME, audioRate);
    }
  }, [audioRate, currentSource.src]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onplaying = () => {
        setShowButtonRate(true);
      };
      audioRef.current.onpause = () => {
        setShowButtonRate(false);
      };
      audioRef.current.onended = () => {
        setShowButtonRate(false);
      };
    }
  }, []);

  const toggleRate = () => {
    let newRate = null;

    switch (audioRate) {
      case 0.5:
        newRate = 1;
        break;
      case 1:
        newRate = 1.5;
        break;
      case 1.5:
        newRate = 2;
        break;
      case 2:
        newRate = 0.5;
        break;
      default:
        newRate = 1;
        break;
    }

    setAudioRate(newRate);
  };

  useEffect(() => {
    setSourceIndex(0);
    setAudioError(false);
  }, [url, message?.id]);

  const handleAudioError = () => {
    if (sourceIndex < audioSources.length - 1) {
      setSourceIndex((idx) => idx + 1);
      return;
    }
    setAudioError(true);
  };

  const handleTranscribe = async () => {
    setIsTranscribing(true);
    setTranscriptionError("");
    try {
      let audioData = {
        wid: message.wid,
      };

      const { data } = await api.post(`/message/transcribeAudio`, audioData);

      const text = typeof data === "string" ? data : String(data?.text || data || "");
      if (/falhou|não foi possível|nao foi possivel/i.test(text)) {
        setTranscriptionError("Não foi possível transcrever este áudio. A reprodução continua disponível no player acima.");
      } else if (text) {
        setTranscription(text);
      } else {
        console.error("Invalid response data:", data);
        setTranscriptionError("Não foi possível transcrever este áudio. A reprodução continua disponível no player acima.");
      }
    } catch (error) {
      console.error("Erro ao transcrever áudio:", error);
      setTranscriptionError("Não foi possível transcrever este áudio. A reprodução continua disponível no player acima.");
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className={classes.audioContainer}>
      {/* ✅ Container do player igual ao original */}
      <div className={classes.audioPlayerContainer}>
        <audio 
          key={currentSource.src}
          ref={audioRef} 
          controls 
          className={classes.audioPlayer}
          preload="metadata"
          onError={handleAudioError}
          onLoadedMetadata={() => setAudioError(false)}
        >
          <source src={currentSource.src} type={currentSource.type || undefined} />
          Seu navegador não suporta reprodução de áudio.
        </audio>
        
        {/* ✅ Botão de velocidade igual ao original */}
        {showButtonRate && (
          <Button
            className={classes.rateButton}
            onClick={toggleRate}
            size="small"
            disableRipple
          >
            {audioRate}x
          </Button>
        )}
      </div>

      {/* ✅ ÚNICA MUDANÇA: Container de controles com botão centralizado */}
      <div className={classes.controlsContainer}>
        {audioError && (
          <Typography className={classes.transcriptionError} variant="body2">
            Não foi possível carregar o áudio no player.{" "}
            {currentSource.src && (
              <a href={currentSource.src} target="_blank" rel="noopener noreferrer">
                Abrir áudio
              </a>
            )}
          </Typography>
        )}
        {!disableTranscription && (
          <div className={classes.transcriptionContainer}>
            {!transcrito ? (
              transcription ? (
                <Typography className={classes.transcriptionText} variant="body2">
                  <strong>Transcrição:</strong> {transcription}
                </Typography>
              ) : transcriptionError ? (
                <Typography className={classes.transcriptionError} variant="body2">
                  {transcriptionError}
                </Typography>
              ) : (
                <Button
                  onClick={handleTranscribe}
                  variant="contained"
                  className={classes.transcribeButton}
                  disabled={isTranscribing}
                  style={{
                    backgroundColor: isTranscribing
                      ? "#ccc"
                      : theme.palette.primary.main,
                    color: "#fff",
                  }}
                >
                  {isTranscribing ? "Transcrevendo..." : "Transcrever"}
                </Button>
              )
            ) : (
              <Typography className={classes.transcriptionText} variant="body2">
                <strong>Transcrição:</strong> {body}
              </Typography>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioModal;