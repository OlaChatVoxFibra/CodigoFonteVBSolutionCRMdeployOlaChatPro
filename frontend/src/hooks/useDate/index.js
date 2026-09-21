/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useCallback } from "react";
import moment from "moment";

export function useDate() {
  const dateToClient = useCallback((strDate) => {
    if (moment(strDate).isValid()) {
      return moment(strDate).format("DD/MM/YYYY");
    }
    return strDate;
  }, []);

  const datetimeToClient = useCallback((strDate) => {
    if (moment(strDate).isValid()) {
      return moment(strDate).format("DD/MM/YYYY HH:mm");
    }
    return strDate;
  }, []);

  const dateToDatabase = useCallback((strDate) => {
    if (moment(strDate, "DD/MM/YYYY").isValid()) {
      return moment(strDate).format("YYYY-MM-DD HH:mm:ss");
    }
    return strDate;
  }, []);

  const returnDays = useCallback((date) => {
    let data1 = new Date()
    let data2 = new Date(date)
    let result = data2.getTime() - data1.getTime();
    let days = Math.ceil(result / (1000 * 60 * 60 * 24));

    if (days === -0) {
      days = 0
    }
    return days;
  }, []);

  return {
    dateToClient,
    datetimeToClient,
    dateToDatabase,
    returnDays
  };
}
