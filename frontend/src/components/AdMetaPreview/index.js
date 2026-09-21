/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect } from 'react';
import { Button, Divider, Typography } from "@material-ui/core";
import toastError from "../../errors/toastError";

const AdMetaPreview = ({ image, title, body, sourceUrl, messageUser }) => {
  useEffect(() => {}, [image, title, body, sourceUrl, messageUser]);

  const handleAdClick = async () => {
    try {
      if (sourceUrl && sourceUrl.trim() !== "") {
        window.open(sourceUrl);
      }
    } catch (err) {
      toastError(err);
    }
  };

  // ✅ CORREÇÃO: Verificar se há imagem válida
  const hasValidImage = image && image.trim() !== "" && image.startsWith("data:image");

  return (
    <div style={{ minWidth: "250px" }}>
      <div>
        {/* ✅ CORREÇÃO: Só mostrar imagem se existir */}
        {hasValidImage && (
          <div style={{ float: "left" }}>
            <img 
              src={image} 
              alt="Thumbnail" 
              onClick={handleAdClick} 
              style={{ width: "100px", cursor: sourceUrl ? "pointer" : "default" }} 
            />
          </div>
        )}
        
        <div style={{ display: "flex", flexWrap: "wrap", marginLeft: hasValidImage ? "115px" : "0px" }}>
          {/* ✅ CORREÇÃO: Só mostrar título se existir */}
          {title && title.trim() !== "" && (
            <Typography 
              style={{ marginTop: "12px", marginBottom: "8px", width: "100%" }} 
              variant="subtitle1" 
              color="primary" 
              gutterBottom
            >
              <div>{title}</div>
            </Typography>
          )}
          
          {/* ✅ CORREÇÃO: Só mostrar body se existir */}
          {body && body.trim() !== "" && (
            <Typography 
              style={{ marginBottom: "8px", width: "100%" }} 
              variant="body2" 
              color="textSecondary" 
              gutterBottom
            >
              <div>{body}</div>
            </Typography>
          )}
          
          {/* ✅ CORREÇÃO: Só mostrar messageUser se existir */}
          {messageUser && messageUser.trim() !== "" && (
            <Typography 
              style={{ marginBottom: "8px", width: "100%" }} 
              variant="subtitle2" 
              color="textSecondary" 
              gutterBottom
            >
              <div>{messageUser}</div>
            </Typography>
          )}
        </div>
        
        <div style={{ display: "block", content: "", clear: "both" }}></div>
        
        {/* ✅ CORREÇÃO: Só mostrar botão se houver URL válida */}
        {sourceUrl && sourceUrl.trim() !== "" && (
          <div>
            <Divider />
            <Button
              fullWidth
              color="primary"
              onClick={handleAdClick}
            >
              Visualizar Anúncio
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdMetaPreview;
