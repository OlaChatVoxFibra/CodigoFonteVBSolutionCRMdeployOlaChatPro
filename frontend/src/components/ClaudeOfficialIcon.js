/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";

/** Logo oficial Claude (Anthropic). */
export default function ClaudeOfficialIcon({ size = 24, className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Claude"
      style={{ display: "block", flexShrink: 0 }}
    >
      <path
        fill="#D97757"
        d="M256,0 C397.39,0 512,114.61 512,256 C512,397.39 397.39,512 256,512 C114.61,512 0,397.39 0,256 C0,114.61 114.61,0 256,0 Z"
      />
      <path
        fill="#FFFFFF"
        d="M192,149.33 C184.27,149.33 177.07,153.6 173.33,160.53 L117.33,266.67 C113.6,273.6 113.6,282.13 117.33,289.07 L173.33,395.2 C177.07,402.13 184.27,406.4 192,406.4 C199.73,406.4 206.93,402.13 210.67,395.2 L320,186.67 L210.67,160.53 C206.93,153.6 199.73,149.33 192,149.33 Z M362.67,238.93 L336,290.13 L312.53,243.2 L288,194.67 L344,312.53 L365.33,354.13 C369.07,361.07 376.27,365.33 384,365.33 C391.73,365.33 398.93,361.07 402.67,354.13 L424,312.53 L362.67,238.93 Z"
      />
    </svg>
  );
}
