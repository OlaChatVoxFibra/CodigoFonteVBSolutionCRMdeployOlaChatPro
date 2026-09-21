/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";

import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import InstagramIcon from "@material-ui/icons/Instagram";
import FacebookIcon from "@material-ui/icons/Facebook";
import TelegramIcon from "@material-ui/icons/Telegram";
import TextsmsIcon from "@material-ui/icons/Textsms";
import { LinkedInBrandIcon } from "../BrainMcpDialog/BrainMcpBrandIcons";

/** Ícone do canal — tamanho fixo, sem margem negativa (evita corte no flex/noWrap). */
const ConnectionIcon = ({ connectionType, className, width = 22, height = 22 }) => {
  const wrapStyle = {
    width: Number(width) || 22,
    height: Number(height) || 22,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    lineHeight: 0,
    overflow: "visible",
  };
  const iconStyle = { fontSize: Math.min(Number(width) || 22, Number(height) || 22) };

  return (
    <span className={className} style={wrapStyle} aria-hidden>
      {connectionType === "whatsapp" && (
        <WhatsAppIcon style={{ ...iconStyle, color: "#25D366" }} />
      )}
      {connectionType === "instagram" && (
        <InstagramIcon style={{ ...iconStyle, color: "#e1306c" }} />
      )}
      {connectionType === "facebook" && (
        <FacebookIcon style={{ ...iconStyle, color: "#3b5998" }} />
      )}
      {(connectionType === "telegram" ||
        connectionType === "telegram_oficial") && (
        <TelegramIcon style={{ ...iconStyle, color: "#0088cc" }} />
      )}
      {connectionType === "sms" && (
        <TextsmsIcon style={{ ...iconStyle, color: "#1976d2" }} />
      )}
      {connectionType === "whatsapp_oficial" && (
        <WhatsAppIcon style={{ ...iconStyle, color: "#25D366" }} />
      )}
      {connectionType === "linkedin" && (
        <LinkedInBrandIcon size={iconStyle.fontSize} color="#0A66C2" />
      )}
    </span>
  );
};

export default ConnectionIcon;
