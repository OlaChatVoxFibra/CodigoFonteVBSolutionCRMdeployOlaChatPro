/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import "react-toastify/dist/ReactToastify.css";
import Routes from "./routes";

/** Router + tema global ficam em `routes/index.js` (AuthProvider) e `layout/AppThemeRoot.js`. */
export default function App() {
  return <Routes />;
}
