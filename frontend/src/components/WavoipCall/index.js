/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Wavoip from 'wavoip-api';
import SoundCalling from './calling.mp3';
import SoundRinging from './ring.mp3';

const WavoipPhoneWidget = ({
  token,
  position = 'bottom-right',
  name = 'MultiFlow Phone',
  country = 'BR',
  autoConnect = true,
  onCallStart,
  onCallEnd,
  onConnectionStatus,
  onError
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [currentNumber, setCurrentNumber] = useState('');
  const [callStatus, setCallStatus] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callStartTime, setCallStartTime] = useState(null);
  const [numberError, setNumberError] = useState('');
  const [callerName, setCallerName] = useState(''); // Nome de quem está ligando
  
  const wavoipInstanceRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const widgetRef = useRef(null);
  const audioRef = useRef(null);

  const callingSoundRef = useRef(null);
  const ringingSoundRef = useRef(null);

  const stopCalling = () => {
    const audio = callingSoundRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      console.log("🔇 Chamando parado");
    }
  };

  const playCalling = async () => {
    stopCalling(); // para qualquer som anterior
    unlockAudio();
    const audio = new Audio(SoundCalling);
    audio.loop = true;

    // Eventos de debug (opcional)
    audio.onplay = () => console.log("📞 Chamando tocando");
    audio.onpause = () => console.log("🔇 Chamando pausado");
    audio.onerror = (e) => console.error("Erro de áudio:", e);

    callingSoundRef.current = audio;

    try {
      await audio.play();
    } catch (err) {
      console.error("Erro ao iniciar som de chamada:", err);
    }
  };

  const stopRinging = () => {
    const audio = ringingSoundRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      console.log("🔇 Ringing parado");
    }
  };

  const playRinging = async () => {
    stopRinging(); // parar qualquer anterior
    unlockAudio();
    const audio = new Audio(SoundRinging);
    audio.loop = true;
    audio.onplay = () => console.log("🎵 Ringing tocando");
    audio.onpause = () => console.log("🔇 Ringing pausado");
    audio.onerror = (e) => console.error("Erro de áudio:", e);
    ringingSoundRef.current = audio;
    try {
      await audio.play();
    } catch (err) {
      console.error("Erro ao iniciar áudio:", err);
    }
  };


  const unlockAudio = () => {
    // Toca e pausa imediatamente só para o navegador liberar o autoplay depois
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        console.log("Áudio desbloqueado");
      }).catch((e) => console.warn("Erro ao tentar desbloquear o áudio:", e));
    }
  };


  const countryUpper = country.toUpperCase();

  const keypadRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#']
  ];

  // CSS inline
  const styles = {
    widget: {
      position: 'fixed',
      zIndex: 9999,
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      ...(position === 'bottom-right' && { bottom: '65px', right: '20px' }),
      ...(position === 'bottom-left' && { bottom: '20px', left: '20px' }),
      ...(position === 'top-right' && { top: '20px', right: '20px' }),
      ...(position === 'top-left' && { top: '20px', left: '20px' })
    },
    minimized: {
      width: '30px',
      height: '30px',
      backgroundColor: isInCall ? '#dc3545' : '#00339E',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      transition: 'all 0.3s ease',
      border: 'none',
      outline: 'none',
      position: 'relative'
    },
    expanded: {
      width: '320px',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    },
    header: {
      backgroundColor: '#00339E',
      color: 'white',
      padding: '15px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    connectionStatus: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    statusIcon: {
      fontSize: '16px'
    },
    statusText: {
      fontSize: '14px',
      fontWeight: 'bold'
    },
    minimizeBtn: {
      background: 'none',
      border: 'none',
      color: 'white',
      fontSize: '18px',
      cursor: 'pointer',
      padding: '5px'
    },
    display: {
      padding: '20px',
      textAlign: 'center',
      minHeight: '120px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    },
    callInfo: {
      marginBottom: '10px'
    },
    callStatus: {
      fontSize: '16px',
      fontWeight: 'bold',
      marginBottom: '5px'
    },
    phoneNumber: {
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '5px'
    },
    callerName: {
      fontSize: '14px',
      color: '#666',
      marginBottom: '5px'
    },
    callDuration: {
      fontSize: '14px',
      color: '#666'
    },
    idleDisplay: {
      marginBottom: '10px'
    },
    welcomeText: {
      fontSize: '16px',
      fontWeight: 'bold',
      marginBottom: '5px'
    },
    phoneNumberDisplay: {
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '5px',
      minHeight: '27px'
    },
    subtitle: {
      fontSize: '12px',
      color: '#666',
      marginBottom: '5px'
    },
    numberError: {
      fontSize: '12px',
      color: '#dc3545',
      marginTop: '5px'
    },
    keypad: {
      padding: '0 20px 20px'
    },
    keypadRow: {
      display: 'flex',
      gap: '10px',
      marginBottom: '10px'
    },
    keypadKey: {
      flex: 1,
      height: '50px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      background: 'white',
      fontSize: '18px',
      fontWeight: 'bold',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease'
    },
    keyNumber: {
      fontSize: '18px'
    },
    keySymbol: {
      fontSize: '12px',
      marginTop: '2px'
    },
    actions: {
      padding: '0 20px 20px',
      display: 'flex',
      gap: '10px'
    },
    actionBtn: {
      flex: 1,
      height: '50px',
      border: 'none',
      borderRadius: '8px',
      fontSize: '18px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease'
    },
    callBtn: {
      backgroundColor: '#00339E',
      color: 'white'
    },
    endCallBtn: {
      backgroundColor: '#dc3545',
      color: 'white'
    },
    clearBtn: {
      backgroundColor: '#6c757d',
      color: 'white'
    },
    incomingCallOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    incomingCallContent: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '30px',
      textAlign: 'center',
      maxWidth: '280px'
    },
    incomingCallIcon: {
      fontSize: '48px',
      color: '#00339E',
      marginBottom: '20px'
    },
    incomingCallInfo: {
      marginBottom: '20px'
    },
    incomingNumber: {
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '5px'
    },
    incomingLabel: {
      fontSize: '14px',
      color: '#666'
    },
    incomingCallActions: {
      display: 'flex',
      gap: '10px'
    },
    answerBtn: {
      flex: 1,
      height: '50px',
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '18px',
      cursor: 'pointer'
    },
    rejectBtn: {
      flex: 1,
      height: '50px',
      backgroundColor: '#dc3545',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '18px',
      cursor: 'pointer'
    },
    pulse: {
      animation: 'pulse 1s infinite'
    }
  };

  // Validação de números brasileiros
  const validateBrazilianNumber = (number) => {
    const cleanNumber = number.replace(/\D/g, '');
    return { isValid: true, error: '', formatted: cleanNumber, canType: false };
  };

  // Validação de números genéricos
  const validateGenericNumber = (number, country) => {
    const cleanNumber = number.replace(/\D/g, '');
    if (cleanNumber.length === 0) {
      return { isValid: false, error: '', canType: true };
    }
    if (cleanNumber.length < 7) {
      return { isValid: false, error: 'Número muito curto', canType: true };
    }
    if (cleanNumber.length > 15) {
      return { isValid: false, error: 'Número muito longo', canType: false };
    }
    if (!/^[1-9][0-9]+$/.test(cleanNumber)) {
      return { isValid: false, error: 'Número inválido', canType: true };
    }
    return { isValid: true, error: '', formatted: cleanNumber, canType: cleanNumber.length < 15 };
  };

  // Validação de número
  const validateNumber = (number) => {
    if (countryUpper === 'BR') {
      return validateBrazilianNumber(number);
    } else {
      return validateGenericNumber(number, countryUpper);
    }
  };

  // Obter comprimento máximo
  const getMaxLength = () => {
    if (countryUpper === 'BR') {
      return 11;
    } else {
      return 15;
    }
  };

  // Conectar ao Wavoip
  const connectToWavoip = useCallback(async () => {
    try {
      const WAV = new Wavoip();
      const instance = WAV.connect(token);
      wavoipInstanceRef.current = instance;

      instance.socket.on('connect', () => {
        setIsConnected(true);
        if (onConnectionStatus) onConnectionStatus('connected');
      });

      instance.socket.on('disconnect', (reason) => {
        setIsConnected(false);
        setIsInCall(false);
        setCallStatus('');
        setCallerName('');
        setIncomingCall(null);
        if (onConnectionStatus) onConnectionStatus('disconnected');
      });

      instance.socket.on('signaling', (data) => {
        console.log('Signaling event:', data);
        
        if (data.tag === 'offer') {
          unlockAudio();
          playRinging()
          setIncomingCall({
            number: data.content?.from_tag || 'Número desconhecido',
            data: data
          });
          setCallerName(data.content?.from_tag || 'Número desconhecido');
          if (isMinimized) {
            setIsMinimized(false);
          }
          if (onCallStart) onCallStart(data);
        }
        
        if (data.tag === 'answer' || data.tag == 'accept_elsewhere' || data.tag == 'accept') {
          setIsInCall(true);
          setCallStatus('Em chamada');
          setCallStartTime(Date.now());
          startDurationTimer();
          stopRinging()
          stopCalling()
          if (onCallStart) onCallStart(data);
        }
        
        if (data.tag === 'bye' || data.tag == 'terminate' || data.tag == 'reject_elsewhere' || data.tag == 'reject') {
          console.log('Chamada finalizada via bye');
          setIsInCall(false);
          setCallStatus('');
          setCallerName('');
          setCurrentNumber('');
          stopDurationTimer();
          setIncomingCall(null);
          stopRinging()
          stopCalling()
          if (onCallEnd) onCallEnd(data);
        }
      });

      instance.socket.on('audio_transport:create', ({ room, sampleRate }) => {
        console.log('Audio transport created:', { room, sampleRate });
        setIsInCall(true);
        setCallStatus('Conectando...');
      });

      instance.socket.on('audio_transport:terminate', ({ room }) => {
        console.log('Audio transport terminated:', { room });
        setIsInCall(false);
        setCallStatus('');
        setCallerName('');
        setCurrentNumber('');
        stopDurationTimer();
        setIncomingCall(null);
        if (onCallEnd) onCallEnd({ room });
      });

      instance.deviceEmitter.on('incoming_call', (data) => {
        console.log('Incoming call event:', data);
        setIncomingCall({
          number: data.content?.from_tag || 'Número desconhecido',
          data: data
        });
        setCallerName(data.content?.from_tag || 'Número desconhecido');
        if (isMinimized) {
          setIsMinimized(false);
        }
      });

    } catch (error) {
      if (onError) onError(error);
    }
  }, [token, isMinimized, onCallStart, onCallEnd, onConnectionStatus, onError]);

  // Fazer chamada
  const makeCall = useCallback(() => {
    if (!wavoipInstanceRef.current || !currentNumber || numberError) return;
    
    const validation = validateNumber(currentNumber);
    if (!validation.isValid) {
      setNumberError(validation.error);
      return;
    }

    try {
      playCalling()
      wavoipInstanceRef.current.callStart({
        whatsappid: validation.formatted
      });
      setIsInCall(true);
      setCallStatus('Chamando...');
      setCallerName(validation.formatted);
      setCallStartTime(Date.now());
      startDurationTimer();
      if (onCallStart) onCallStart({ whatsappid: validation.formatted });
    } catch (error) {
      if (onError) onError(error);
    }
  }, [currentNumber, numberError, onCallStart, onError]);

  // Finalizar chamada
  const endCall = useCallback(() => {
    if (!wavoipInstanceRef.current) return;
    
    try {
      wavoipInstanceRef.current.endCall();
      setIsInCall(false);
      setCallStatus('');
      setCallerName('');
      setCurrentNumber('');
      stopDurationTimer();
      setIncomingCall(null);
       stopCalling()
      if (onCallEnd) onCallEnd({ action: 'ended' });
    } catch (error) {
      if (onError) onError(error);
    }
  }, [onCallEnd, onError]);

  // Atender chamada
  const answerCall = useCallback(() => {
    if (!wavoipInstanceRef.current || !incomingCall) return;
    
    try {
      wavoipInstanceRef.current.acceptCall();
      setIncomingCall(null);
      setIsInCall(true);
      setCallStatus('Em chamada');
      setCallStartTime(Date.now());
      startDurationTimer();
       stopCalling()
      stopRinging()
      if (onCallStart) onCallStart(incomingCall?.data);
    } catch (error) {
      if (onError) onError(error);
    }
  }, [incomingCall, onCallStart, onError]);

  // Rejeitar chamada
  const rejectCall = useCallback(() => {
    if (!wavoipInstanceRef.current || !incomingCall) return;
    
    try {
      stopCalling()
    stopRinging()
      wavoipInstanceRef.current.rejectCall();
      setIncomingCall(null);
      setCallerName('');
      if (onCallEnd) onCallEnd({ action: 'rejected' });
    } catch (error) {
      if (onError) onError(error);
    }
  }, [incomingCall, onCallEnd, onError]);

  // Limpar número
  const clearNumber = useCallback(() => {
    setCurrentNumber(prev => prev.slice(0, -1));
  }, []);

  // Validar número atual
  const validateCurrentNumber = useCallback(() => {
    if (!currentNumber) {
      setNumberError('');
      return;
    }
    const validation = validateNumber(currentNumber);
    setNumberError(validation.error);
  }, [currentNumber]);

  // Pressionar tecla do teclado
  const handleKeyPress = useCallback((key) => {
    if (isInCall) return;
    
    const maxLength = getMaxLength();
    const currentLength = currentNumber.replace(/\D/g, '').length;
    
    if (currentLength >= maxLength) {
      return;
    }
    
    if (key === '*') {
      setCurrentNumber(prev => prev + '*');
    } else if (key === '#') {
      setCurrentNumber(prev => prev + '#');
    } else {
      setCurrentNumber(prev => prev + key);
    }
  }, [isInCall, currentNumber]);

  // Input do teclado
  const handleKeyboardInput = useCallback((event) => {
    if (isMinimized || isInCall) return;
    
    const key = event.key;
    const maxLength = getMaxLength();
    const currentLength = currentNumber.replace(/\D/g, '').length;
    
    if (/^[0-9]$/.test(key)) {
      if (currentLength >= maxLength) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      setCurrentNumber(prev => prev + key);
    } else if (key === '*' || key === '#') {
      if (currentLength >= maxLength) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      setCurrentNumber(prev => prev + key);
    } else if (key === 'Backspace') {
      event.preventDefault();
      clearNumber();
    } else if (key === 'Enter') {
      event.preventDefault();
      if (currentNumber && isConnected && !numberError) {
        makeCall();
      }
    } else if (key === 'Escape') {
      event.preventDefault();
      setCurrentNumber('');
      setNumberError('');
    }
  }, [isMinimized, isInCall, currentNumber, isConnected, numberError, clearNumber, makeCall]);

  // Iniciar timer de duração
  const startDurationTimer = useCallback(() => {
    const intervalId = setInterval(() => {
      if (callStartTime) {
        setCallDuration(Math.floor((Date.now() - callStartTime) / 1000));
      }
    }, 1000);
    durationIntervalRef.current = intervalId;
  }, [callStartTime]);

  // Parar timer de duração
  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      const cleared = clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    setCallDuration(0);
    setCallStartTime(null);
  }, []);

  // Formatar duração
  const formatDuration = useCallback((seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Alternar widget
  const toggleWidget = useCallback(() => {
    setIsMinimized(prev => !prev);
  }, []);

  // Validar número quando mudar
  useEffect(() => {
    validateCurrentNumber();
  }, [currentNumber, validateCurrentNumber]);

  // Conectar automaticamente
  useEffect(() => {
    if (autoConnect) {
      connectToWavoip();
    }
  }, [autoConnect, connectToWavoip]);

  // Adicionar listener do teclado
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardInput);
    return () => {
      document.removeEventListener('keydown', handleKeyboardInput);
    };
  }, [handleKeyboardInput]);

  // Cleanup
  useEffect(() => {
    return () => {
      // Parar timer de duração
      if (durationIntervalRef.current) {
        const cleared = clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      
      // Desconectar do Wavoip
      if (wavoipInstanceRef.current) {
        const disconnected = wavoipInstanceRef.current.socket?.disconnect();
      }
    };
  }, []); // Sem dependências para evitar loops

  // Renderizar widget minimizado
  if (isMinimized) {
    return (
      <div style={styles.widget}>
        <button
          style={styles.minimized}
          onClick={toggleWidget}
          title={name}
        >
          <span style={{ ...styles.statusIcon, ...(isInCall && styles.pulse) }}>📞</span>
        </button>
      </div>
    );
  }

  // Renderizar widget expandido
  return (
    <div style={styles.widget} ref={widgetRef}>
      <div style={styles.expanded}>
        <div style={styles.header}>
          <div style={styles.connectionStatus}>
            <span style={styles.statusIcon}>
              {isConnected ? '✅' : '❌'}
            </span>
            <span style={styles.statusText}>
              {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
          <button style={styles.minimizeBtn} onClick={toggleWidget} title="Minimizar">
            −
          </button>
        </div>

        <div style={styles.display}>
          {isInCall ? (
            <div style={styles.callInfo}>
              <div style={styles.callStatus}>{callStatus}</div>
              {callerName && (
                <div style={styles.callerName}>{callerName}</div>
              )}
              {callDuration > 0 && (
                <div style={styles.callDuration}>{formatDuration(callDuration)}</div>
              )}
            </div>
          ) : (
            <div style={styles.idleDisplay}>
              <div style={styles.welcomeText}>{name}</div>
              <div style={styles.phoneNumberDisplay}>
                {currentNumber || 'Digite um número'}
              </div>
              <div style={styles.subtitle}>Faça chamadas via WhatsApp</div>
              {numberError && (
                <div style={styles.numberError}>{numberError}</div>
              )}
            </div>
          )}
        </div>

        <div style={styles.keypad}>
          {keypadRows.map((row, rowIndex) => (
            <div key={rowIndex} style={styles.keypadRow}>
              {row.map((key) => (
                <button
                  key={key}
                  style={styles.keypadKey}
                  onClick={() => handleKeyPress(key)}
                  disabled={isInCall}
                >
                  <span style={styles.keyNumber}>{key}</span>
                  {(key === '*' || key === '#') && (
                    <span style={styles.keySymbol}>{key}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div style={styles.actions}>
          {!isInCall ? (
            <button
              style={{ ...styles.actionBtn, ...styles.callBtn }}
              onClick={makeCall}
              disabled={!isConnected || !currentNumber || numberError}
            >
              📞
            </button>
          ) : (
            <button
              style={{ ...styles.actionBtn, ...styles.endCallBtn }}
              onClick={endCall}
            >
              📞
            </button>
          )}
          <button
            style={{ ...styles.actionBtn, ...styles.clearBtn }}
            onClick={clearNumber}
            disabled={isInCall}
          >
              ⌫
          </button>
        </div>

        {incomingCall && (
          <div style={styles.incomingCallOverlay}>
            <div style={styles.incomingCallContent}>
              <div style={styles.incomingCallIcon}>
                <span style={styles.pulse}>📞</span>
              </div>
              <div style={styles.incomingCallInfo}>
                <div style={styles.incomingNumber}>{incomingCall.number}</div>
                <div style={styles.incomingLabel}>Chamada recebida</div>
              </div>
              <div style={styles.incomingCallActions}>
                <button style={styles.answerBtn} onClick={answerCall}>
                  ✅
                </button>
                <button style={styles.rejectBtn} onClick={rejectCall}>
                  ❌
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WavoipPhoneWidget; 