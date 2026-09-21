/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useContext, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@material-ui/core";
import { Alert } from "@material-ui/lab";
import moment from "moment";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useDate } from "../../hooks/useDate";

/**
 * Banner global: aviso quando a licença está vencida ou próxima do vencimento (≤7 dias).
 */
const SubscriptionAlertBanner = () => {
  const { user } = useContext(AuthContext);
  const { returnDays } = useDate();

  const state = useMemo(() => {
    if (!user?.company?.id || user.company.id === 1) {
      return null;
    }
    const sub = user.subscription;
    if (sub) {
      if (sub.expired) {
        return { severity: "error", message: "Sua licença expirou. Regularize para continuar usando o sistema.", show: true };
      }
      const d = sub.daysRemaining;
      if (typeof d === "number" && d >= 0 && d <= 7) {
        return {
          severity: d <= 1 ? "error" : d <= 3 ? "warning" : "info",
          message:
            d === 0
              ? "Sua licença vence hoje. Renove para não perder o acesso."
              : `Sua licença vence em ${d} ${d === 1 ? "dia" : "dias"}.`,
          show: true
        };
      }
      return null;
    }
    const due = user.company?.dueDate;
    if (!due || !moment(due).isValid()) {
      return null;
    }
    const days = returnDays(due);
    if (days < 0) {
      return { severity: "error", message: "Sua licença expirou. Regularize para continuar usando o sistema.", show: true };
    }
    if (days <= 7) {
      return {
        severity: days <= 1 ? "error" : days <= 3 ? "warning" : "info",
        message:
          days === 0
            ? "Sua licença vence hoje. Renove para não perder o acesso."
            : `Sua licença vence em ${days} ${days === 1 ? "dia" : "dias"}.`,
        show: true
      };
    }
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.company?.id, user?.company?.dueDate, user?.subscription, returnDays]);

  if (!state?.show) {
    return null;
  }

  return (
    <Alert
      severity={state.severity}
      style={{ margin: "8px 16px 0", borderRadius: 8 }}
      action={
        <Button color="inherit" size="small" component={Link} to="/financeiro-aberto">
          Ver planos
        </Button>
      }
    >
      {state.message}
    </Alert>
  );
};

export default SubscriptionAlertBanner;
