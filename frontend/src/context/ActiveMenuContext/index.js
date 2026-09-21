/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { createContext, useContext, useMemo, useState } from "react";

const ActiveMenuContext = createContext();

export const useActiveMenu = () => useContext(ActiveMenuContext);

export const ActiveMenuProvider = ({ children }) => {
  const [activeMenu, setActiveMenu] = useState("");

  const value = useMemo(() => ({ activeMenu, setActiveMenu }), [activeMenu]);

  return (
    <ActiveMenuContext.Provider value={value}>
      {children}
    </ActiveMenuContext.Provider>
  );
};