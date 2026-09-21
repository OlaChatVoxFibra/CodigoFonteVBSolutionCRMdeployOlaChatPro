/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState } from "react";

import { IconButton, Tooltip } from "@material-ui/core";

import HelpOutline from "@material-ui/icons/HelpOutline";

import PageHelpDialog from "../PageHelpDialog";

import { topbarSvgIconStyle, topbarActionButtonStyle } from "../../constants/topbarIcons";



const helpBtnStyle = {
  border: "none",
  borderRadius: 10,
  width: 36,
  height: 36,
  background: "transparent",
};



const topbarHelpBtnStyle = {
  ...topbarActionButtonStyle,
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 6,
};

const aiBrainHelpBtnStyle = {
  borderRadius: 8,
  width: 28,
  height: 28,
  padding: 0,
  background: "transparent",
  border: "none",
  transition: "background 0.15s ease, color 0.15s ease",
};


/**

 * Botão ? padrão do sistema — abre ajuda do tópico informado.

 */

const PageHelpButton = ({ topic, title, style, size = "small", variant, buttonClassName }) => {

  const [open, setOpen] = useState(false);

  const isTopbar = variant === "topbar";
  const isAiBrain = topic === "aiBrain";



  if (!topic) return null;



  const btnStyle = isAiBrain
    ? { ...aiBrainHelpBtnStyle, ...style }
    : isTopbar
    ? { ...topbarHelpBtnStyle, ...style }
    : { ...helpBtnStyle, ...style };

  const iconStyle = isAiBrain
    ? { color: "inherit", fontSize: 16, opacity: 1 }
    : isTopbar
    ? topbarSvgIconStyle(style?.color || "inherit")
    : undefined;



  return (

    <>

      <Tooltip title={title || "Ajuda desta página"}>

        <IconButton
          size={isTopbar ? "small" : size}
          onClick={() => setOpen(true)}
          className={buttonClassName || undefined}
          style={btnStyle}
          aria-label="Ajuda"
        >

          <HelpOutline style={iconStyle} fontSize={isTopbar ? undefined : "small"} />

        </IconButton>

      </Tooltip>

      <PageHelpDialog open={open} onClose={() => setOpen(false)} topic={topic} />

    </>

  );

};



export default PageHelpButton;
