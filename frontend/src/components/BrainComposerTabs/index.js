/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";

export default function BrainComposerTabs({ onMcpClick, mcpCount = 0 }) {
  return (
    <div className="brain-composer-tabs">
      <button type="button" className="brain-composer-tabs__tab" onClick={onMcpClick}>
        <span>MCP</span>
        {mcpCount > 0 ? <span className="brain-composer-tabs__badge">{mcpCount}</span> : null}
      </button>
    </div>
  );
}
