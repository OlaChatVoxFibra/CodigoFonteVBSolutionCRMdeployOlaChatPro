/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { X } from "lucide-react";

export default function BrainCreditsAlert({
  balance = 0,
  quota = 100,
  percentUsed = 0,
  cycleEndsAt,
  onUpgrade,
  onDismiss,
  className = ""
}) {
  const isEmpty = balance <= 0;
  const isWarning = !isEmpty && percentUsed >= 80;

  if (!isEmpty && !isWarning) return null;

  const renewLabel = cycleEndsAt
    ? new Date(cycleEndsAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short"
      })
    : null;

  return (
    <div
      className={`vb-brain-credits-alert${
        isEmpty ? " vb-brain-credits-alert--empty" : " vb-brain-credits-alert--warn"
      }${className ? ` ${className}` : ""}`}
      role="status"
    >
      <p className="vb-brain-credits-alert__message">
        {isEmpty ? (
          <>
            Seus créditos Brain.AI acabaram
            {renewLabel ? ` · renova ${renewLabel}` : ""}.{" "}
            <button type="button" className="vb-brain-credits-alert__link" onClick={onUpgrade}>
              Ver planos
            </button>{" "}
            para continuar.
          </>
        ) : (
          <>
            Restam {balance} de {quota} créditos
            {renewLabel ? ` · renova ${renewLabel}` : ""}.{" "}
            <button type="button" className="vb-brain-credits-alert__link" onClick={onUpgrade}>
              Adicionar créditos
            </button>
          </>
        )}
      </p>
      {!isEmpty && onDismiss ? (
        <button
          type="button"
          className="vb-brain-credits-alert__close"
          onClick={onDismiss}
          aria-label="Fechar"
        >
          <X size={14} strokeWidth={1.75} />
        </button>
      ) : null}
    </div>
  );
}
