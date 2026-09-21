/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Divider } from '@material-ui/core';
import { FileCopyOutlined, Language, Phone } from '@material-ui/icons';
import { makeStyles } from '@material-ui/core/styles';
import React from 'react';
import MarkdownWrapper from '../MarkdownWrapper';

const useStyles = makeStyles((theme) => ({
  buttonTemplate: {
    backgroundColor: "transparent",
    border: 'none',
    color: '#0CADE3',
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
    },
  },
}));
// Componente para renderizar os botões dinamicamente 


const Template = ({ message }) => {
  const classes = useStyles();
  const urlRegex = /(https?:\/\/[^\s]+(\.jpg|\.jpeg|\.png|\.gif|\.mp4|\.webm|\.ogg))/g;

  // Separar a parte do texto dos botões usando '||||'
  const [text, buttonsJson] = message.body.split('||||');

  // Encontra a URL de mídia no texto (se existir)
  const mediaUrls = text.match(urlRegex);
  const mediaUrl = mediaUrls ? mediaUrls[0] : null; // Considerando a primeira URL encontrada

  // Remove a URL de mídia do texto para não duplicar
  const textWithoutMediaUrl = text.replace(urlRegex, '').trim();

  // Funções para verificar se é uma imagem ou vídeo
  const isImage = (url) => /\.(jpeg|jpg|gif|png)$/i.test(url);
  const isVideo = (url) => /\.(mp4|webm|ogg)$/i.test(url);

  const ButtonRenderer = ({ buttons }) => {
    return (
      <div style={{ marginTop: '10px', padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        {buttons.map((button, index) => {
          if (button.type === 'URL') {
            return (
              <button key={index} onClick={() => window.open(button.url, '_blank')} className={classes.buttonTemplate}>
                <span style={{ color: 'blue-light', display: 'flex', alignItems: 'center', textAlign: 'center', gap: '5px' }}><Language /> {button.text}</span>
              </button>
            );
          } else if (button.type === 'PHONE_NUMBER') {
            return (
              <span style={{ color: 'blue', display: 'flex', alignItems: 'center', textAlign: 'center', gap: '5px' }}>
                <button className={classes.buttonTemplate} key={index} onClick={() => window.open(`https://wa.me/${button.phone_number}`, '_blank')}>
                  <Phone /> {button.text}
                </button>
              </span>
            );
          } else if (button.type === 'COPY_CODE') {
            return (
              <button key={index} onClick={() => navigator.clipboard.writeText(button.example[0])} className={classes.buttonTemplate}>
                <span style={{ color: 'blue-light', display: 'flex', alignItems: 'center', textAlign: 'center', gap: '5px' }}><FileCopyOutlined /> {button.text}</span>
              </button>
            );
          }
          return null;
        })}
      </div>
    );
  };
  // Parse adicional da string aninhada
  let buttons = [];
  if (buttonsJson && buttonsJson !== "[]") {
    try {
      if (typeof buttonsJson === 'string') {
        buttons = JSON.parse(JSON.parse(buttonsJson)); // Parse adicional aqui
      } else if (typeof buttonsJson === 'object') {
        buttons = Object.values(buttonsJson);
      }
    } catch (e) {
      console.log(buttonsJson)
      console.error('Erro ao fazer parse dos botões:', e);
    }
  }

  return (
    <>
      {/* Renderiza a mídia se houver uma URL de imagem ou vídeo */}
      {mediaUrl && (
        <>
          {isImage(mediaUrl) ? (
            <img src={mediaUrl} alt="media content" style={{ maxWidth: '100%', height: 'auto' }} />
          ) : isVideo(mediaUrl) ? (
            <video src={mediaUrl} controls style={{ maxWidth: '100%', height: 'auto' }} />
          ) : (
            <p>Unsupported media type</p>
          )}
        </>
      )}
      <div>

        {/* Renderiza o texto principal */}
        <MarkdownWrapper>{textWithoutMediaUrl}</MarkdownWrapper>

        {/* Renderiza os botões se houver */}
        {buttons.length > 0 && (
          <>
            <Divider />
            <ButtonRenderer buttons={buttons} />
          </>
        )}
      </div>
    </>
  );
};

export default Template;
