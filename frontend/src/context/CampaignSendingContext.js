/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import { makeStyles } from "@material-ui/core/styles";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import CircularProgress from "@material-ui/core/CircularProgress";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ExpandLessIcon from "@material-ui/icons/ExpandLess";
import { AuthContext } from "./Auth/AuthContext";
import api from "../services/api";
import toastError from "../errors/toastError";

const CampaignSendingContext = createContext(null);

const useStyles = makeStyles((theme) => ({
  sendingWidget: {
    position: "fixed",
    bottom: theme.spacing(12),
    right: theme.spacing(2),
    zIndex: 1300,
    backgroundColor: theme.palette.background.paper,
    borderRadius: 12,
    boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
    padding: theme.spacing(1.5, 2),
    minWidth: 260,
    maxWidth: 340,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
    border: `1px solid ${theme.palette.divider}`,
    "&:hover $sendingWidgetActions": {
      opacity: 1,
      pointerEvents: "auto",
    },
  },
  sendingWidgetMinimized: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  },
  sendingWidgetActions: {
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.5),
    opacity: 0,
    pointerEvents: "none",
    transition: "opacity 0.2s ease-in-out",
  },
}));

const initialState = {
  visible: false,
  total: 0,
  delivered: 0,
  campaignId: null,
  minimized: false,
};

export function CampaignSendingProvider({ children }) {
  const classes = useStyles();
  const { user, socket } = useContext(AuthContext);
  const [overlay, setOverlay] = useState(initialState);
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;
  const deliveredShippingIdsRef = useRef(new Set());

  const setCampaignSending = useCallback((payload) => {
    if (typeof payload === "function") {
      setOverlay(payload);
      return;
    }
    if (Number(payload.delivered) === 0) {
      deliveredShippingIdsRef.current = new Set();
    }
    setOverlay((prev) => ({
      ...prev,
      ...payload,
      visible: payload.visible !== undefined ? payload.visible : true,
    }));
  }, []);

  // Socket: atualizar delivered em tempo real (inscreve assim que overlay visível para não perder eventos)
  useEffect(() => {
    if (!overlay.visible || !user?.companyId || !socket) return;
    const channel = `company-${user.companyId}-campaign-shipping`;
    const onShipping = (data) => {
      const current = overlayRef.current;
      if (data?.action !== "delivered") return;
      if (current.campaignId == null) return;
      if (Number(data?.campaignId) !== Number(current.campaignId)) return;
      const sid = data?.shippingId;
      if (sid != null) {
        const idKey = String(sid);
        if (deliveredShippingIdsRef.current.has(idKey)) return;
        deliveredShippingIdsRef.current.add(idKey);
      }
      setOverlay((prev) => ({
        ...prev,
        delivered: Math.min(prev.delivered + 1, prev.total || prev.delivered + 1),
      }));
      const who = data?.contactName || data?.number || "contato";
      toast.info(`Entregue para ${who}`);
    };
    socket.on(channel, onShipping);
    return () => socket.off(channel, onShipping);
  }, [overlay.visible, user?.companyId, socket]);

  // Fechar quando concluir
  useEffect(() => {
    if (overlay.visible && overlay.total > 0 && overlay.delivered >= overlay.total) {
      toast.success("Envio concluído para todos os contatos selecionados.");
      setTimeout(() => setOverlay(initialState), 600);
    }
  }, [overlay.visible, overlay.total, overlay.delivered]);

  const handleCancelSending = async () => {
    try {
      if (!overlay.campaignId) {
        setOverlay(initialState);
        return;
      }
      await api.post(`/campaigns/${overlay.campaignId}/cancel`);
      toast.success("Envio da campanha cancelado.");
    } catch (err) {
      toastError(err);
    } finally {
      setOverlay(initialState);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleCancelSendingCb = useCallback(handleCancelSending, [overlay.campaignId]);
  const toggleMinimize = useCallback(() => {
    setOverlay((prev) => ({ ...prev, minimized: !prev.minimized }));
  }, []);

  const value = React.useMemo(
    () => ({
      overlay,
      setCampaignSending,
      handleCancelSending: handleCancelSendingCb,
      toggleMinimize,
    }),
    [overlay, setCampaignSending, handleCancelSendingCb, toggleMinimize]
  );

  return (
    <CampaignSendingContext.Provider value={value}>
      {children}
      {overlay.visible && (
        <Box
          className={`${classes.sendingWidget} ${overlay.minimized ? classes.sendingWidgetMinimized : ""}`}
        >
          {!overlay.minimized && (
            overlay.total > 0 ? (
              <Box fontSize="0.875rem" fontWeight={600} color="primary.main">
                {overlay.delivered}/{overlay.total}
              </Box>
            ) : (
              <Box fontSize="0.875rem" fontWeight={600} color="text.secondary">
                {overlay.delivered}/?
              </Box>
            )
          )}
          <Box display="flex" flexDirection="column" flex={1}>
            <Typography variant="subtitle2">
              {overlay.campaignId ? "Enviando campanha" : "Preparando envio da campanha"}
            </Typography>
            {!overlay.minimized && (
              <Typography variant="body2" color="textSecondary">
                {overlay.total > 0
                  ? `Envios ${overlay.delivered}/${overlay.total} concluídos`
                  : `Envios ${overlay.delivered}/? concluídos`}
              </Typography>
            )}
          </Box>
          <Box className={classes.sendingWidgetActions}>
            <IconButton size="small" onClick={toggleMinimize}>
              {overlay.minimized ? (
                <ExpandLessIcon fontSize="small" />
              ) : (
                <ExpandMoreIcon fontSize="small" />
              )}
            </IconButton>
            <IconButton size="small" onClick={handleCancelSending}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      )}
    </CampaignSendingContext.Provider>
  );
}

export function useCampaignSending() {
  const ctx = useContext(CampaignSendingContext);
  if (!ctx) {
    throw new Error("useCampaignSending must be used within CampaignSendingProvider");
  }
  return ctx;
}

export default CampaignSendingContext;
