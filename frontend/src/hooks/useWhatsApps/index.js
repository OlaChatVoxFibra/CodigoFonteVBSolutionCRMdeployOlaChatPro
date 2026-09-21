/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useState, useEffect, useReducer, useContext, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import { toast } from "react-toastify";

import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import { i18n } from "../../translate/i18n";

const batchUpdates = ReactDOM.unstable_batchedUpdates || ((fn) => fn());

const sameWhatsappId = (a, b) => Number(a) === Number(b);

const reducer = (state, action) => {
  if (action.type === "LOAD_WHATSAPPS") {
    const whatsApps = action.payload;
    return [...whatsApps];
  }

  if (action.type === "UPDATE_WHATSAPPS") {
    const whatsApp = action.payload;
    const whatsAppIndex = state.findIndex((s) => sameWhatsappId(s.id, whatsApp.id));

    if (whatsAppIndex !== -1) {
      const next = [...state];
      next[whatsAppIndex] = whatsApp;
      return next;
    } else {
      return [whatsApp, ...state];
    }
  }

  if (action.type === "UPDATE_SESSION") {
    const whatsApp = action.payload;
    const whatsAppIndex = state.findIndex((s) => sameWhatsappId(s.id, whatsApp.id));

    if (whatsAppIndex !== -1) {
      const next = [...state];
      next[whatsAppIndex] = {
        ...next[whatsAppIndex],
        status: whatsApp.status,
        updatedAt: whatsApp.updatedAt,
        qrcode: whatsApp.qrcode,
        retries: whatsApp.retries,
      };
      return next;
    }
    return state;
  }

  if (action.type === "DELETE_WHATSAPPS") {
    const whatsAppId = action.payload;
    return state.filter((s) => !sameWhatsappId(s.id, whatsAppId));
  }

  if (action.type === "RESET") {
    return state.length === 0 ? state : [];
  }

  return state;
};

const useWhatsApps = () => {
  const [whatsApps, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(true);
  const { user, socket, loading: authLoading, isAuth } = useContext(AuthContext);
  const loadingRequestsRef = useRef(0);

  const fetchWhatsApps = useCallback(async (opts = {}) => {
    const silent = opts.silent === true;
    if (!silent) {
      loadingRequestsRef.current += 1;
      setLoading(true);
    }
    try {
      const { data } = await api.get("/whatsapp/", {
        params: { session: 0, _t: Date.now() }
      });
      batchUpdates(() => {
        dispatch({ type: "LOAD_WHATSAPPS", payload: Array.isArray(data) ? data : [] });
        if (!silent) {
          loadingRequestsRef.current = Math.max(0, loadingRequestsRef.current - 1);
          if (loadingRequestsRef.current === 0) {
            setLoading(false);
          }
        }
      });
    } catch (err) {
      console.error("Erro ao carregar WhatsApps:", err);
      if (!silent) {
        loadingRequestsRef.current = Math.max(0, loadingRequestsRef.current - 1);
        if (loadingRequestsRef.current === 0) {
          setLoading(false);
        }
      }
    }
  }, []);

  const removeWhatsAppById = useCallback((id) => {
    if (id == null || id === "") return;
    dispatch({ type: "DELETE_WHATSAPPS", payload: id });
  }, []);

  // Effect para carregar os dados iniciais (só após bootstrap do token — evita 403 + refresh em paralelo ao /auth/refresh_token)
  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!isAuth || !user?.id) {
      setLoading(false);
      return;
    }
    fetchWhatsApps();
  }, [authLoading, isAuth, user?.id, fetchWhatsApps]);

  // Effect para configurar os listeners do socket
  useEffect(() => {
    // Debug para entender o que está chegando
    console.log('useWhatsApps - Debug:', {
      userId: user?.id,
      companyId: user?.companyId,
      socket: socket,
      socketType: typeof socket,
      hasOnMethod: socket && typeof socket.on === 'function',
      hasOffMethod: socket && typeof socket.off === 'function'
    });

    if (user?.companyId && socket && typeof socket.on === 'function' && typeof socket.off === 'function') {
      const companyId = user.companyId;
      
      const onCompanyWhatsapp = (data) => {
        if (!data?.action) return;
        if (data.action === "update" || data.action === "create") {
          const w = data.whatsapp;
          if (!w?.id) return;
          // Telegram/SMS não usam OPENING (spinner infinito no UI)
          if (
            (w.channel === "telegram" || w.channel === "sms" || w.channel === "linkedin") &&
            w.status === "OPENING"
          ) {
            w.status = "CONNECTED";
          }
          if (w.channel === "telegram_oficial" && w.hasMtprotoSession) {
            w.status = "CONNECTED";
          }
          dispatch({ type: "UPDATE_WHATSAPPS", payload: w });
        }
        if (data.action === "delete") {
          dispatch({ type: "DELETE_WHATSAPPS", payload: data.whatsappId });
        }
      };

      const onCompanyWhatsappSession = (data) => {
        console.log('Recebido evento whatsapp session:', data);
        if (data.action === "update") {
          dispatch({ type: "UPDATE_SESSION", payload: data.session });
          if (data.session.status === "CONNECTED") {
            toast.success(i18n.t("connections.toolTips.connected.title") || "Conexão estabelecida com sucesso!");
          }
        }
      };

      const whatsappEvent = `company-${companyId}-whatsapp`;
      const sessionEvent = `company-${companyId}-whatsappSession`;

      console.log('Registrando listeners WhatsApp:', { whatsappEvent, sessionEvent });

      socket.on(whatsappEvent, onCompanyWhatsapp);
      socket.on(sessionEvent, onCompanyWhatsappSession);

      return () => {
        if (socket && typeof socket.off === 'function') {
          console.log('Removendo listeners WhatsApp:', { whatsappEvent, sessionEvent });
          socket.off(whatsappEvent, onCompanyWhatsapp);
          socket.off(sessionEvent, onCompanyWhatsappSession);
        }
      };
    } else {
      console.log('Condições não atendidas para listeners WhatsApp:', {
        hasCompanyId: !!user?.companyId,
        hasSocket: !!socket,
        hasOnMethod: socket && typeof socket.on === 'function',
        hasOffMethod: socket && typeof socket.off === 'function'
      });
    }
  }, [socket, user?.companyId]); // Dependências corretas

  return { whatsApps, loading, fetchWhatsApps, removeWhatsAppById };
};

export default useWhatsApps;
