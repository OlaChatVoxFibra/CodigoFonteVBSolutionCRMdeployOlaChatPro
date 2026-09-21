/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import ModalImage from "react-modal-image";
import api from "../../services/api";
import { getBackendUrl } from "../../config";

const useStyles = makeStyles(theme => ({
  messageMedia: {
    objectFit: "cover",
    margin: 15,
    width: 140,
    height: 140,
    borderRadius: 10,
  },
}));

const ModalImageContatc = ({ imageUrl }) => {
  const classes = useStyles();
  const [fetching, setFetching] = useState(true);
  const [blobUrl, setBlobUrl] = useState("");
  const backendUrl = getBackendUrl();

  const resolveUrl = (url) => {
    if (!url || typeof url !== "string") return "";
    const u = url.trim();
    // Já é um URL completo suportado pelo navegador (sem precisar de axios)
    if (/^(data:|blob:|https?:\/\/)/i.test(u)) return u;
    // Caminho absoluto do backend
    if (u.startsWith("/")) return `${backendUrl}${u}`;
    // Nome de arquivo relativo em /public
    return `${backendUrl}/public/${u}`;
  };

  useEffect(() => {
    if (!imageUrl) {
      setFetching(false);
      return;
    }
    const finalUrl = resolveUrl(imageUrl);
    // Para data:/blob: ou quando não precisamos de cookies, use direto
    if (/^(data:|blob:)/i.test(finalUrl)) {
      setBlobUrl(finalUrl);
      setFetching(false);
      return;
    }
    // Se for http/https, tentar baixar como blob (mantendo credenciais)
    const fetchImage = async () => {
      try {
        const { data, headers } = await api.get(finalUrl, {
          responseType: "blob",
        });
        const url = window.URL.createObjectURL(
          new Blob([data], { type: headers["content-type"] || "image/*" })
        );
        setBlobUrl(url);
      } catch (e) {
        // Fallback: usar o próprio URL direto para evitar erro "Invalid URL"
        setBlobUrl(finalUrl);
      } finally {
        setFetching(false);
      }
    };
    fetchImage();
  }, [imageUrl]);

  return (
    <ModalImage
      className={classes.messageMedia}
      smallSrcSet={fetching ? resolveUrl(imageUrl) : blobUrl}
      medium={fetching ? resolveUrl(imageUrl) : blobUrl}
      large={fetching ? resolveUrl(imageUrl) : blobUrl}
      showRotate="true"
      alt="image"
    />
  );
};


export default ModalImageContatc;
