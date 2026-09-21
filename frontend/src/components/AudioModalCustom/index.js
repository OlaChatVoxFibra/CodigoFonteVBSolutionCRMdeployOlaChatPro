/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Button } from "@material-ui/core";
import React, { useRef, useEffect, useState, useCallback } from "react";
import api from "../../services/api";
import PropTypes from 'prop-types';
import { Typography } from "@material-ui/core";
import { useTheme, makeStyles } from "@material-ui/core/styles";

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
    backgroundColor: theme.palette.action.hover,
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
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

const AudioModalCustom = ({
  id,
  url,
  message,
  disableTranscription = false,
  onEnded, // Nova prop para notificar quando o áudio terminar
  isActive, // Nova prop para indicar se este áudio deve ser reproduzido
  autoPlay // Nova prop para reprodução automática
}) => {
  const theme = useTheme();
  const classes = useStyles();
  const audioRef = useRef(null);
  const [audioRate, setAudioRate] = useState(
    parseFloat(localStorage.getItem(LS_NAME) || "1")
  );
  const [showButtonRate, setShowButtonRate] = useState(false);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const [transcription, setTranscription] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const body = message?.body ?? "";
  const transcrito = message?.transcrito ?? false;

  // Efeito para lidar com reprodução automática
  useEffect(() => {
    if (audioRef.current && isActive) {
      if (autoPlay) {
        audioRef.current.play().catch(e => console.error("Erro ao reproduzir:", e));
      }
    }
  }, [isActive, autoPlay]);

  // Efeito para configurar eventos do áudio
  useEffect(() => {
    const audioElement = audioRef.current;

    if (audioElement) {
      const handleEnded = () => {
        setShowButtonRate(false);
        if (onEnded) onEnded();
      };

      const handlePlaying = () => {
        setShowButtonRate(true);
      };

      const handlePause = () => {
        setShowButtonRate(false);
      };

      audioElement.addEventListener('ended', handleEnded);
      audioElement.addEventListener('playing', handlePlaying);
      audioElement.addEventListener('pause', handlePause);

      return () => {
        audioElement.removeEventListener('ended', handleEnded);
        audioElement.removeEventListener('playing', handlePlaying);
        audioElement.removeEventListener('pause', handlePause);
      };
    }
  }, [onEnded]);

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

  const getAudioSource = () => {
    let sourceUrl = url;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (isIOS || isSafari) {
      sourceUrl = sourceUrl.replace(".ogg", ".mp3");
      return <source src={sourceUrl} type="audio/mp3" />;
    }
    return <source src={sourceUrl} type="audio/ogg" />;
  };

  const handleTranscribe = async () => {
    setIsTranscribing(true);
    try {
      let audioData = {
        wid: message.wid,
      };

      const { data } = await api.post(`/message/transcribeAudio`, audioData);

      if (data) {
        setTranscription(data);
      } else {
        console.error("Invalid response data:", data);
      }
    } catch (error) {
      console.error("Erro ao transcrever áudio:", error);
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className={classes.audioContainer}>
      {/* ✅ Container do player igual ao original */}
      <div className={classes.audioPlayerContainer}>
        <audio
          id={`audio-${id}`}
          ref={audioRef}
          controls
          className={classes.audioPlayer}
          preload="metadata"
        >
          {getAudioSource()}
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
        {!disableTranscription && (
          <div className={classes.transcriptionContainer}>
            {!transcrito ? (
              transcription ? (
                <Typography className={classes.transcriptionText} variant="body2">
                  <strong>Transcrição:</strong> {transcription}
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

AudioModalCustom.propTypes = {
  id: PropTypes.string,
  url: PropTypes.string.isRequired,
  message: PropTypes.object,
  disableTranscription: PropTypes.bool,
  onEnded: PropTypes.func,
  isActive: PropTypes.bool,
  autoPlay: PropTypes.bool
};

export default AudioModalCustom;