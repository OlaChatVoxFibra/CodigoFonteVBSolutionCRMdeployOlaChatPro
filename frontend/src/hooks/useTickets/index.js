/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import toastError from "../../errors/toastError";
import { format, sub } from 'date-fns'
import api from "../../services/api";

const batchUpdates = ReactDOM.unstable_batchedUpdates || ((fn) => fn());

const useTickets = ({
  searchParam,
  tags,
  users,
  pageNumber,
  status,
  date,
  updatedAt,
  showAll,
  queueIds,
  withUnreadMessages,
  whatsappIds,
  statusFilter,
  forceSearch,
  userFilter,
  sortTickets,
  searchOnMessages,
  updatedStart,
  updatedEnd,
  refreshNonce
}) => {
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [count, setCount] = useState(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    if (Number(pageNumber) <= 1) {
      setTickets([]);
    }
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchTickets = async () => {
        if (userFilter === undefined || userFilter === null) {
          try {            
            const { data } = await api.get("/tickets", {
              params: {
                searchParam,
                pageNumber,
                tags,
                users,
                status,
                date,
                updatedAt,
                showAll,
                queueIds,
                withUnreadMessages,
                whatsapps: whatsappIds,
                statusFilter,
                sortTickets,
                searchOnMessages,
                updatedStart,
                updatedEnd
              },
            });
            if (cancelledRef.current) return;
            batchUpdates(() => {
              setTickets(data.tickets || []);
              setHasMore(data.hasMore);
              setCount(data.count);
              setLoading(false);
            });
          } catch (err) {
            if (cancelledRef.current) return;
            setLoading(false);
            toastError(err);
          }
        } else {
          try {
            const {data} = await api.get("/dashboard/moments", {
              params: {
                status,
                showAll,
                queueIds,
                dateStart: format(sub(new Date(), { days: 30 }), 'yyyy-MM-dd'),
                dateEnd: format(new Date(), 'yyyy-MM-dd'),
                userId: userFilter
              }
            })
            if (cancelledRef.current) return;
            const filtered = data.filter(item => item.userId == userFilter);
            batchUpdates(() => {
              setTickets(filtered);
              setHasMore(null);
              setLoading(false);
            });
          } catch (err) {
            if (cancelledRef.current) return;
            setLoading(false);
            toastError(err);
          }
        }
      };
    fetchTickets();
    }, 500);
    return () => {
      cancelledRef.current = true;
      clearTimeout(delayDebounceFn);
    };
  }, [
    searchParam,
    tags,
    users,
    pageNumber,
    status,
    date,
    updatedAt,
    showAll,
    queueIds,
    withUnreadMessages,
    whatsappIds,
    statusFilter,
    forceSearch,
    sortTickets,
    searchOnMessages,
    updatedStart,
    updatedEnd,
    refreshNonce
  ]);

  return { tickets, loading, hasMore, count };
};

export default useTickets;
