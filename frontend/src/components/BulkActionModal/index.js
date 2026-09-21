/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useRef, useContext, useCallback } from "react";
import {
  Dialog,
  Box,
  Typography,
  Button,
  CircularProgress,
  makeStyles,
  useTheme,
} from "@material-ui/core";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
  backdrop: {
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.28)",
  },
  paper: {
    borderRadius: 16,
    maxWidth: 280,
    width: "100%",
    margin: 16,
    padding: theme.spacing(2.5, 2.5, 2),
    textAlign: "center",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    background:
      theme.palette.type === "dark"
        ? "rgba(28,28,30,0.92)"
        : "rgba(255,255,255,0.92)",
    boxShadow:
      theme.palette.type === "dark"
        ? "0 24px 48px rgba(0,0,0,0.5)"
        : "0 20px 40px rgba(0,0,0,0.14)",
    border:
      theme.palette.type === "dark"
        ? "1px solid rgba(255,255,255,0.08)"
        : "1px solid rgba(0,0,0,0.06)",
  },
  title: {
    fontSize: 17,
    fontWeight: 500,
    letterSpacing: "-0.02em",
    color: theme.palette.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: 400,
    color: theme.palette.text.secondary,
    lineHeight: 1.35,
    marginBottom: theme.spacing(2),
    opacity: 0.85,
  },
  actions: {
    display: "flex",
    gap: 8,
    marginTop: theme.spacing(0.5),
  },
  btn: {
    flex: 1,
    borderRadius: 10,
    textTransform: "none",
    fontSize: 15,
    fontWeight: 500,
    padding: "8px 12px",
    boxShadow: "none",
  },
  btnCancel: {
    color: theme.palette.text.secondary,
    background: "transparent",
    "&:hover": {
      background:
        theme.palette.type === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    },
  },
  btnConfirm: {
    background:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.12)" : "#007aff",
    color: theme.palette.type === "dark" ? "#fff" : "#fff",
    "&:hover": {
      background:
        theme.palette.type === "dark" ? "rgba(255,255,255,0.18)" : "#0066d6",
    },
  },
  progressWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    padding: theme.spacing(1, 0, 0.5),
  },
  progressRing: {
    position: "relative",
    display: "inline-flex",
  },
  progressLabel: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: "-0.02em",
    color: theme.palette.text.primary,
  },
  progressMeta: {
    fontSize: 13,
    color: theme.palette.text.secondary,
    letterSpacing: "-0.01em",
  },
  successIcon: {
    fontSize: 52,
    color: "#34c759",
    animation: "$popIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
  "@keyframes popIn": {
    "0%": { transform: "scale(0.5)", opacity: 0 },
    "100%": { transform: "scale(1)", opacity: 1 },
  },
}));

const BulkActionModal = ({
  open,
  onClose,
  action,
  totalEstimate = 0,
  onConfirm,
}) => {
  const classes = useStyles();
  const theme = useTheme();
  const { user, socket } = useContext(AuthContext);
  const companyId = user?.companyId;

  const [step, setStep] = useState("confirm");
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [percent, setPercent] = useState(0);

  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  const isClose = action === "close";
  const title = isClose ? "Finalizar todos?" : "Aceitar todos?";
  const subtitle = isClose
    ? "Sem mensagem de despedida."
    : "Atribuir a você.";

  const reset = useCallback(() => {
    setStep("confirm");
    setProcessed(0);
    setTotal(0);
    setPercent(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  useEffect(() => {
    if (!open || step !== "progress" || !socket || !companyId) return undefined;

    const handler = (data) => {
      if (data.type !== action) return;
      if (data.action === "bulkProgress") {
        const t = Number(data.total) || totalEstimate || 1;
        const p = Number(data.processed) || 0;
        setTotal(t);
        setProcessed(p);
        setPercent(Math.min(99, Math.round((p / t) * 100)));
      }
      if (data.action === "bulkComplete") {
        const count = Number(data.closed ?? data.accepted ?? 0);
        const t = count || totalEstimate || 1;
        setTotal(t);
        setProcessed(t);
        setPercent(100);
      }
    };

    socket.on(`company-${companyId}-ticket`, handler);
    return () => socket.off(`company-${companyId}-ticket`, handler);
  }, [open, step, socket, companyId, action, totalEstimate]);

  const finishSuccess = useCallback(() => {
    setPercent(100);
    setStep("success");
    timerRef.current = setTimeout(() => {
      if (mountedRef.current) onClose(true);
    }, 850);
  }, [onClose]);

  const handleConfirm = async () => {
    const estimate = Math.max(1, totalEstimate || 1);
    setTotal(estimate);
    setProcessed(0);
    setPercent(0);
    setStep("progress");

    let simulated = 0;
    timerRef.current = setInterval(() => {
      simulated = Math.min(estimate - 1, simulated + 1);
      setProcessed(simulated);
      setPercent(Math.min(92, Math.round((simulated / estimate) * 100)));
    }, 180);

    try {
      const result = await onConfirm();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const count = Number(
        result?.closed ?? result?.accepted ?? estimate
      );
      setTotal(count || estimate);
      setProcessed(count || estimate);
      finishSuccess();
    } catch {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      onClose(false);
    }
  };

  const handleDialogClose = () => {
    if (step === "progress") return;
    onClose(false);
  };

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      BackdropProps={{ className: classes.backdrop }}
      PaperProps={{ className: classes.paper, elevation: 0 }}
    >
      {step === "confirm" && (
        <>
          <Typography className={classes.title}>{title}</Typography>
          <Typography className={classes.subtitle}>{subtitle}</Typography>
          <Box className={classes.actions}>
            <Button
              className={`${classes.btn} ${classes.btnCancel}`}
              onClick={() => onClose(false)}
            >
              Cancelar
            </Button>
            <Button
              className={`${classes.btn} ${classes.btnConfirm}`}
              onClick={handleConfirm}
            >
              OK
            </Button>
          </Box>
        </>
      )}

      {step === "progress" && (
        <Box className={classes.progressWrap}>
          <Box className={classes.progressRing}>
            <CircularProgress
              variant="determinate"
              value={percent}
              size={72}
              thickness={3}
              style={{
                color: theme.palette.type === "dark" ? "#0a84ff" : "#007aff",
              }}
            />
            <Box className={classes.progressLabel}>{percent}%</Box>
          </Box>
          <Typography className={classes.progressMeta}>
            {processed} / {total || totalEstimate || "…"}
          </Typography>
        </Box>
      )}

      {step === "success" && (
        <Box className={classes.progressWrap}>
          <CheckCircleOutlineRounded className={classes.successIcon} />
          <Typography className={classes.title}>Concluído</Typography>
        </Box>
      )}
    </Dialog>
  );
};

export default BulkActionModal;
