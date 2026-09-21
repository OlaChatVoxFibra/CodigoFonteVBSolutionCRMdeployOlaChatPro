/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useState, useEffect } from "react";

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    setMatches(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

export function useIsDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof document === "undefined") return false;
    const root = document.documentElement;
    return (
      root.getAttribute("data-theme") === "dark" ||
      root.classList.contains("dark") ||
      document.body.classList.contains("Mui-dark")
    );
  });

  useEffect(() => {
    const check = () => {
      const root = document.documentElement;
      setDark(
        root.getAttribute("data-theme") === "dark" ||
          root.classList.contains("dark") ||
          document.body.classList.contains("Mui-dark")
      );
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  return dark;
}

export function useIsMobile() {
  return useMediaQuery("(max-width: 639px)");
}
