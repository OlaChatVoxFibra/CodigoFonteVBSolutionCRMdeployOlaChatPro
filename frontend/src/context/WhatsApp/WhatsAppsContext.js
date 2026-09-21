/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { createContext, useState, useEffect, useContext, useMemo } from "react";
import ReactDOM from "react-dom";
import api from "../../services/api";
import useWhatsApps from "../../hooks/useWhatsApps";
import WavoipPhoneWidget from "../../components/WavoipCall";
import { AuthContext } from "../Auth/AuthContext";

const batchUpdates = ReactDOM.unstable_batchedUpdates || ((fn) => fn());

const WhatsAppsContext = createContext();

const WhatsAppsProvider = ({ children }) => {
  // Add fallback values to prevent destructuring errors
  const whatsAppData = useWhatsApps();
  const {
    loading = false,
    whatsApps = [],
    fetchWhatsApps,
    removeWhatsAppById
  } = whatsAppData || {};
  const { user, loading: authLoading, isAuth } = useContext(AuthContext);
  
  const [wavoipToken, setWavoipToken] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) {
      return undefined;
    }
    if (!isAuth || !user?.id) {
      setLoadingSession(false);
      setWavoipToken(null);
      return undefined;
    }
    let isMounted = true;
    const fetchSession = async () => {
      try {
        const { data } = await api.get("/call/historical/user/whatsapp");
        if (!isMounted) return;
        batchUpdates(() => {
          setWavoipToken(data?.whatsapp?.wavoip || null);
          setLoadingSession(false);
        });
      } catch (err) {
        if (!isMounted) return;
        console.error("Erro fetchSession:", err);
        batchUpdates(() => {
          setWavoipToken(null);
          setLoadingSession(false);
        });
      }
    };
    fetchSession();
    return () => {
      isMounted = false;
    };
  }, [authLoading, isAuth, user?.id]);


  // Log error state for debugging
  if (error) {
    console.warn("WhatsAppsProvider error:", error);
  }

  const value = useMemo(
    () => ({ whatsApps, loading, error, fetchWhatsApps, removeWhatsAppById }),
    [whatsApps, loading, error, fetchWhatsApps, removeWhatsAppById]
  );

  return (
    <WhatsAppsContext.Provider value={value}>
      {children}
      {wavoipToken && (
        <WavoipPhoneWidget
          token={wavoipToken}
          position="bottom-right"
          name={user?.company?.name || "waVoip"}
          country="BR"
          autoConnect={true}
          onCallStarted={(data) => console.log("Chamada iniciada:", data)}
          onCallEnded={(data) => console.log("Chamada finalizada:", data)}
          onConnectionStatus={(status) => console.log("Status:", status)}
          onError={(error) => console.error("Erro:", error)}
        />
      )}
    </WhatsAppsContext.Provider>
  );
};

export { WhatsAppsContext, WhatsAppsProvider };
