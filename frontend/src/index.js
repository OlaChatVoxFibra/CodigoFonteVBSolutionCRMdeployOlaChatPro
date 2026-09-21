/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import ReactDOM from "react-dom";
import CssBaseline from "@material-ui/core/CssBaseline";
import * as serviceworker from './serviceWorker'
import "./styles/tailwind.css";
import "./styles/premium-design-system.css";
import "./styles/brain-theme.css";
import "./styles/brain-chrome.css";
import "./styles/brain-pages.css";
import "./styles/brain-shell.css";
import "./styles/brain-shell-tailwind.css";
import "./styles/brain-subpages.css";
import "./styles/brain-modals.css";

import App from "./App";
import { setOfflineMode } from "./services/offlineMode";
import { getBackendUrl } from "./config";

// Modo local: ativa cedo em localhost (DEV_NO_DB) para não travar no auth/API
try {
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  if (
    localStorage.getItem("vbs_offline_mode") === "1" ||
    host === "localhost" ||
    host === "127.0.0.1"
  ) {
    setOfflineMode(true);
  }
} catch {}

// Confirma com o backend em paralelo (não bloqueia o paint)
(async () => {
  try {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const t = setTimeout(() => ctrl?.abort(), 4000);
    const res = await fetch(`${getBackendUrl().replace(/\/$/, "")}/auth/offline-status`, {
      signal: ctrl?.signal,
      credentials: "include",
    });
    clearTimeout(t);
    const data = await res.json();
    if (data?.enabled) setOfflineMode(true);
    else setOfflineMode(false);
  } catch {
    /* mantém flag atual se status inacessível */
  }
})();

ReactDOM.render(
	<CssBaseline>
		<App />
	</CssBaseline>,
	document.getElementById("root")
);

serviceworker.register()