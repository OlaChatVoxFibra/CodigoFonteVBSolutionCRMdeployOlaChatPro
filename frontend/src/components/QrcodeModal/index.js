/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useState, useContext } from "react";
import QRCode from "qrcode.react";
import toastError from "../../errors/toastError";
import { makeStyles } from "@material-ui/core/styles";
import { Dialog, DialogContent, Paper, Typography } from "@material-ui/core";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import openSocket from "socket.io-client";
import { getBackendUrl } from "../../config";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    width: "100%",
    maxWidth: "100%",
    padding: theme.spacing(2),
    boxSizing: "border-box",
  },
  dialogPaper: {
    minWidth: 320,
    maxWidth: 400,
    width: "100%",
    padding: theme.spacing(2),
    margin: 0,
    overflowX: "hidden",
    [theme.breakpoints.down("xs")]: {
      minWidth: "90vw",
    },
  },
  content: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: theme.spacing(3),
    overflowX: "hidden",
    boxSizing: "border-box",
    width: "100%",
  },
  innerWrap: {
    width: "100%",
    maxWidth: "100%",
    backgroundColor: "transparent",
    boxShadow: "none",
  },
  qrCodeContainer: {
    padding: theme.spacing(3),
    backgroundColor: "white",
    borderRadius: theme.shape.borderRadius,
    marginTop: theme.spacing(2),
    maxWidth: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
  },
  loadingText: {
    marginTop: theme.spacing(2),
    color: theme.palette.text.secondary,
  },
}));

const sameId = (a, b) => Number(a) === Number(b);

const normalizeSocketToken = (raw) => {
  if (!raw) return "";
  let token = raw;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") token = parsed;
  } catch (_) {
    // token já é string pura
  }
  token = String(token || "").replace(/^"+|"+$/g, "").trim();
  if (!token) return "";
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
};

const QrcodeModal = ({ open, onClose, whatsAppId, companyId }) => {
  const classes = useStyles();
  const [qrCode, setQrCode] = useState("");
  const { user, socket: globalSocket } = useContext(AuthContext);
  const [socket, setSocket] = useState(globalSocket);

  useEffect(() => {
    if (!open) return;

    // Se companyId for fornecido e diferente do usuário logado (Super Admin)
    if (companyId && user?.companyId && Number(companyId) !== Number(user.companyId)) {
      const token = normalizeSocketToken(localStorage.getItem("token"));
      const backendUrl = getBackendUrl();
      const newSocket = openSocket(`${backendUrl}/${companyId}`, {
        query: { token },
        transports: ["websocket", "polling"],
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }

    setSocket(globalSocket);
    return undefined;
  }, [open, companyId, user?.companyId, globalSocket]);

  useEffect(() => {
    if (!open || !whatsAppId) return undefined;

    let cancelled = false;

    const fetchSession = async () => {
      try {
        const { data } = await api.get(`/whatsapp/${whatsAppId}`, {
          params: { _t: Date.now() },
        });
        if (cancelled) return;
        setQrCode(data?.qrcode || "");
      } catch (err) {
        if (!cancelled) toastError(err);
      }
    };

    setQrCode("");
    fetchSession();

    // Reconsulta enquanto o modal aguarda o QR (evita spinner eterno se o socket atrasar)
    const pollId = setInterval(fetchSession, 2500);

    return () => {
      cancelled = true;
      clearInterval(pollId);
    };
  }, [whatsAppId, open]);

  useEffect(() => {
    if (!open || !whatsAppId || !socket) return undefined;
    const socketCompanyId = companyId || user?.companyId;

    const onWhatsappData = (data) => {
      if (data?.action !== "update" || !data?.session) return;
      if (!sameId(data.session.id, whatsAppId)) return;

      const nextQr = data.session.qrcode || "";
      const nextStatus = String(data.session.status || "").toUpperCase();

      if (nextQr) {
        setQrCode(nextQr);
        return;
      }

      // Só fecha quando esta sessão realmente concluiu / desconectou — não no OPENING
      if (
        nextQr === "" &&
        (nextStatus === "CONNECTED" ||
          nextStatus === "DISCONNECTED" ||
          nextStatus === "PENDING")
      ) {
        onClose();
      }
    };

    socket.on(`company-${socketCompanyId}-whatsappSession`, onWhatsappData);

    return () => {
      socket.off(`company-${socketCompanyId}-whatsappSession`, onWhatsappData);
    };
  }, [whatsAppId, onClose, user?.companyId, companyId, socket, open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      classes={{ paper: classes.dialogPaper }}
      aria-labelledby="qr-code-dialog"
    >
      <DialogContent className={classes.content}>
        <Paper elevation={0} className={classes.innerWrap}>
          <Typography variant="h6" color="primary" gutterBottom>
            {i18n.t("qrCode.message")}
          </Typography>
          <div className={classes.root}>
            {qrCode ? (
              <div className={classes.qrCodeContainer}>
                <QRCode
                  value={qrCode}
                  size={280}
                  style={{ maxWidth: "100%", height: "auto", display: "block" }}
                />
              </div>
            ) : (
              <Typography variant="body1" className={classes.loadingText}>
                {i18n.t("qrCode.waiting")}
              </Typography>
            )}
          </div>
        </Paper>
      </DialogContent>
    </Dialog>
  );
};

export default React.memo(QrcodeModal);
