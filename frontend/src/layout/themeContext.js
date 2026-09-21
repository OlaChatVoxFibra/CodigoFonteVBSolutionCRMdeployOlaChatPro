/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";

const ColorModeContext = React.createContext({
  toggleColorMode: () => {},
  setPrimaryColorLight: (_) => {},
  setPrimaryColorDark: (_) => {},
  setButtonPrimaryColorLight: (_) => {},
  setButtonPrimaryColorDark: (_) => {},
  setButtonPrimaryTextColorLight: (_) => {},
  setButtonPrimaryTextColorDark: (_) => {},
  setButtonSecondaryColorLight: (_) => {},
  setButtonSecondaryColorDark: (_) => {},
  setTopbarColorLight: (_) => {},
  setTopbarColorDark: (_) => {},
  setSidebarColorLight: (_) => {},
  setSidebarColorDark: (_) => {},
  setAppLogoLight: (_) => {},
  setAppLogoDark: (_) => {},
  setAppLogoFavicon: (_) => {},
  setAppLogoTickets: (_) => {},
  setAppLogoBackgroundLight: (_) => {},
  setAppLogoBackgroundDark: (_) => {},
});

export default ColorModeContext;
