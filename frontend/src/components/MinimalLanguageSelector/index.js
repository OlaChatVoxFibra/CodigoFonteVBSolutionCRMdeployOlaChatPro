/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useRef, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { applyAppLanguage } from "../../translate/i18n";
import useAppTranslation from "../../hooks/useAppTranslation";
import BRFlag from "../../assets/brazil.png";
import USFlag from "../../assets/unitedstates.png";
import ESFlag from "../../assets/esspain.png";
import ARFlag from "../../assets/arabe.png";

const languageOptions = [
  { value: "pt-BR", code: "PT", icon: BRFlag },
  { value: "en", code: "EN", icon: USFlag },
  { value: "es", code: "ES", icon: ESFlag },
  { value: "ar", code: "AR", icon: ARFlag },
];

const useStyles = makeStyles(() => ({
  root: {
    position: "fixed",
    top: 18,
    right: 18,
    zIndex: 1200,
  },
  trigger: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 32,
    padding: "0 10px",
    borderRadius: 999,
    border: "1px solid rgba(255, 255, 255, 0.18)",
    background: "rgba(15, 23, 42, 0.35)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    color: "#f8fafc",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.06em",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 18px rgba(0, 0, 0, 0.18)",
    "&:hover": {
      background: "rgba(15, 23, 42, 0.5)",
      borderColor: "rgba(255, 255, 255, 0.28)",
    },
  },
  triggerLight: {
    border: "1px solid rgba(0, 0, 0, 0.08)",
    background: "rgba(255, 255, 255, 0.72)",
    color: "#111827",
    boxShadow: "0 4px 18px rgba(15, 23, 42, 0.08)",
    "&:hover": {
      background: "rgba(255, 255, 255, 0.92)",
      borderColor: "rgba(0, 0, 0, 0.12)",
    },
  },
  flag: {
    width: 16,
    height: 12,
    borderRadius: 2,
    objectFit: "cover",
  },
  chevron: {
    fontSize: 10,
    opacity: 0.75,
    marginLeft: 1,
  },
  menu: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    minWidth: 112,
    padding: 4,
    borderRadius: 14,
    border: "1px solid rgba(255, 255, 255, 0.14)",
    background: "rgba(15, 23, 42, 0.82)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    boxShadow: "0 16px 40px rgba(0, 0, 0, 0.28)",
  },
  menuLight: {
    border: "1px solid rgba(0, 0, 0, 0.08)",
    background: "rgba(255, 255, 255, 0.94)",
    boxShadow: "0 16px 40px rgba(15, 23, 42, 0.12)",
  },
  option: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "8px 10px",
    border: "none",
    borderRadius: 10,
    background: "transparent",
    color: "#f8fafc",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.05em",
    cursor: "pointer",
    transition: "background 0.15s ease",
    "&:hover": {
      background: "rgba(255, 255, 255, 0.08)",
    },
  },
  optionLight: {
    color: "#111827",
    "&:hover": {
      background: "rgba(15, 23, 42, 0.05)",
    },
  },
  optionActive: {
    background: "rgba(255, 255, 255, 0.1)",
  },
  optionActiveLight: {
    background: "rgba(15, 23, 42, 0.06)",
  },
}));

export default function MinimalLanguageSelector({
  enabledLanguages = ["pt-BR", "en", "es", "ar"],
  variant = "dark",
  inline = false,
}) {
  const classes = useStyles();
  const { language } = useAppTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const isLight = variant === "light";

  const current =
    languageOptions.find(
      (opt) => opt.value === language || (opt.value === "pt-BR" && language === "pt")
    ) || languageOptions[0];

  useEffect(() => {
    const onDocClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleSelect = async (opt) => {
    await applyAppLanguage(opt.value);
    setOpen(false);
  };

  return (
    <div
      className={classes.root}
      ref={rootRef}
      style={inline ? { position: "relative", top: "auto", right: "auto" } : undefined}
    >
      <button
        type="button"
        className={`${classes.trigger} ${isLight ? classes.triggerLight : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-label="Language"
      >
        <img src={current.icon} alt="" className={classes.flag} />
        <span>{current.code}</span>
        <span className={classes.chevron}>▾</span>
      </button>

      {open && (
        <div className={`${classes.menu} ${isLight ? classes.menuLight : ""}`}>
          {languageOptions
            .filter((opt) => enabledLanguages.includes(opt.value))
            .map((opt) => {
              const active = opt.value === current.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={[
                    classes.option,
                    isLight ? classes.optionLight : "",
                    active ? (isLight ? classes.optionActiveLight : classes.optionActive) : "",
                  ].join(" ")}
                  onClick={() => handleSelect(opt)}
                >
                  <img src={opt.icon} alt="" className={classes.flag} />
                  <span>{opt.code}</span>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
