/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Box } from "@material-ui/core";
import { useConnectionsMagicFrameStyles } from "./connectionsMagicUi";

/**
 * Enquadra conteúdo de criar/editar — layout enxuto, sem painéis de scroll.
 */
export default function ConnectionsMagicFrame({
  children,
  footer,
  wide = false,
  fluid = false,
  /** Ocupa 100% da altura da coluna (lista /manage). */
  fill = false,
  noPanel = false,
  formPanel = false,
  className,
}) {
  const classes = useConnectionsMagicFrameStyles();

  const frameClass = [
    fluid ? classes.frameFluid : classes.frame,
    fill ? classes.frameFill : "",
    !fluid && wide ? classes.frameWide : "",
  ]
    .filter(Boolean)
    .join(" ");

  const outerClass = [
    classes.outer,
    fill ? classes.outerFill : "",
    fluid ? classes.outerFluid : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  let body;
  if (noPanel && formPanel) {
    body = children;
  } else if (noPanel) {
    body = (
      <>
        <Box className={classes.panelBody}>{children}</Box>
        {footer ? <Box className={classes.panelFooter}>{footer}</Box> : null}
      </>
    );
  } else if (formPanel) {
    body = (
      <Box className={`${classes.panel} ${classes.panelForm}`}>{children}</Box>
    );
  } else {
    body = (
      <Box className={classes.panel}>
        <Box className={classes.panelBody}>{children}</Box>
        {footer ? <Box className={classes.panelFooter}>{footer}</Box> : null}
      </Box>
    );
  }

  return (
    <Box className={outerClass}>
      <Box className={frameClass}>{body}</Box>
    </Box>
  );
}
