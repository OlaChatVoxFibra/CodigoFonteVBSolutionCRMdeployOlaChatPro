/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";

const TabPanel = ({ children, value, name, ...rest }) => {
  if (value === name) {
    return (
      <div
        role="tabpanel"
        id={`simple-tabpanel-${name}`}
        aria-labelledby={`simple-tab-${name}`}
        {...rest}
      >
        <>{children}</>
      </div>
    );
  } else return null;
};

export default TabPanel;
