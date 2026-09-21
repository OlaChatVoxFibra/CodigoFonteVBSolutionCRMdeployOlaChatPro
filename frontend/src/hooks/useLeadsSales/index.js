/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useState, useEffect } from "react";
import toastError from "../../errors/toastError";
import leadsSalesService from "../../services/leadsSalesService";

const useLeadsSales = ({ searchParam, pageNumber, status, pipelineId, responsibleId, contactId, dateStart, dateEnd, refreshSignal = 0 }) => {
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [leadsSales, setLeadsSales] = useState([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchAllPages = async () => {
        try {
          let pn = 1;
          const acc = [];
          let total = 0;
          let more = false;
          do {
            const data = await leadsSalesService.list({
              searchParam,
              pageNumber: pn,
              status,
              pipelineId,
              responsibleId,
              contactId,
              dateStart,
              dateEnd
            });
            const rows = Array.isArray(data.leads) ? data.leads : [];
            acc.push(...rows);
            total = data.count || total;
            more = !!data.hasMore;
            pn += 1;
          } while (more && !cancelled);
          if (!cancelled) {
            setLeadsSales(acc);
            setHasMore(false);
            setCount(total || acc.length);
            setLoading(false);
          }
        } catch (err) {
          if (!cancelled) {
            setLoading(false);
            toastError(err);
          }
        }
      };
      fetchAllPages();
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(delayDebounceFn);
    };
  }, [searchParam, status, pipelineId, responsibleId, contactId, dateStart, dateEnd, pageNumber, refreshSignal]);

  return { leadsSales, loading, hasMore, count };
};

export default useLeadsSales;
