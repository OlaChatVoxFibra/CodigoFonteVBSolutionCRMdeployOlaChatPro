/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useContext, useMemo, useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  LinearProgress,
  TextField,
  useMediaQuery,
  Tooltip
} from "@material-ui/core";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import { toast } from "react-toastify";
import moment from "moment";
import { AuthContext } from "../../context/Auth/AuthContext";
import PlanosPreview from "../../PlanosPreview";
import { buildCaktoCheckoutUrl } from "../../utils/caktoCheckout";
import {
  brtCalendarDaysRemaining,
  msUntilEndOfDueDayBrt,
  splitCountdownMs
} from "../../utils/brasiliaTrial";
import api, { openApi } from "../../services/api";

const useStyles = makeStyles((theme) => ({
  "@keyframes freemiumGlassPulse": {
    "0%, 100%": {
      boxShadow:
        "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 1px rgba(255,255,255,0.22), 0 0 24px rgba(255,255,255,0.12), 0 8px 28px rgba(0,0,0,0.1)"
    },
    "50%": {
      boxShadow:
        "inset 0 1px 0 rgba(255,255,255,0.5), 0 0 0 1px rgba(255,255,255,0.32), 0 0 32px rgba(255,255,255,0.2), 0 10px 36px rgba(0,0,0,0.14)"
    }
  },
  topbarPillOuter: {
    flexShrink: 0,
    marginRight: 6,
    marginLeft: 0,
    border: "none",
    cursor: "pointer",
    borderRadius: 6,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px 12px",
    minWidth: 0,
    maxWidth: 320,
    lineHeight: 1,
    background:
      "linear-gradient(155deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.12) 48%, rgba(255,255,255,0.2) 100%)",
    backdropFilter: "saturate(200%) blur(14px)",
    WebkitBackdropFilter: "saturate(200%) blur(14px)",
    color: "rgba(255, 255, 255, 0.98)",
    transition: "background 0.15s ease, box-shadow 0.15s ease",
    fontFamily:
      '"Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    "&:hover": {
      background:
        "linear-gradient(155deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.28) 100%)"
    },
    "&:focus": {
      outline: "none",
      boxShadow: "0 0 0 2px rgba(255,255,255,0.65), 0 0 20px rgba(255,255,255,0.25)"
    },
    [theme.breakpoints.down("xs")]: {
      minWidth: 0,
      maxWidth: "min(94vw, 320px)",
      padding: "5px 10px",
      borderRadius: 9
    }
  },
  topbarPillRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "nowrap",
    gap: 8,
    lineHeight: 1,
    margin: 0,
    padding: 0,
    width: "100%",
    [theme.breakpoints.down("xs")]: {
      gap: 5
    }
  },
  topbarLabel: {
    fontSize: "0.6875rem",
    fontWeight: 500,
    letterSpacing: "0.04em",
    lineHeight: 1,
    margin: 0,
    padding: 0,
    color: "inherit",
    whiteSpace: "nowrap",
    [theme.breakpoints.down("xs")]: {
      fontSize: "0.625rem",
      letterSpacing: "0.02em"
    }
  },
  topbarSep: {
    opacity: 0.4,
    fontWeight: 300,
    fontSize: "0.65rem",
    lineHeight: 1,
    userSelect: "none"
  },
  topbarTime: {
    fontSize: "0.8125rem",
    fontWeight: 600,
    letterSpacing: "0.08em",
    fontVariantNumeric: "tabular-nums",
    fontFeatureSettings: '"tnum"',
    fontFamily:
      '"SF Mono", "SFMono-Regular", ui-monospace, Menlo, Monaco, "Cascadia Mono", "Helvetica Neue", monospace',
    lineHeight: 1,
    margin: 0,
    padding: "1px 0",
    color: "inherit",
    textShadow: "0 1px 2px rgba(0,0,0,0.12)",
    [theme.breakpoints.down("xs")]: {
      fontSize: "0.7rem",
      letterSpacing: "0.05em"
    }
  },
  bar: {
    margin: "8px 16px 0",
    padding: "10px 16px",
    borderRadius: 8,
    background: "linear-gradient(90deg, #0ea5e9 0%, #6366f1 100%)",
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontWeight: 400,
    transition: "opacity 0.2s ease",
    "&:hover": { opacity: 0.95 },
    "&:focus": {
      outline: "none",
      boxShadow: "0 0 0 2px rgba(255,255,255,0.35)"
    }
  },
  barMain: {
    fontSize: "0.875rem",
    fontWeight: 400,
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    color: "#fff",
    lineHeight: 1.35
  },
  barHint: {
    fontSize: "0.75rem",
    fontWeight: 400,
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    color: "#fff",
    opacity: 0.95
  },
  dialogTitle: {
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontWeight: 400
  },
  paperPlans: {
    maxWidth: 960,
    width: "100%",
    [theme.breakpoints.down("xs")]: { margin: 8 }
  },
  backdropCheckout: {
    backgroundColor: "rgba(15, 23, 42, 0.52) !important",
    backdropFilter: "blur(4px)"
  },
  paperCheckout: {
    maxWidth: "min(98vw, 1200px) !important",
    width: "100% !important",
    height: "calc(100vh - 24px) !important",
    maxHeight: "calc(100vh - 24px) !important",
    margin: "12px auto !important",
    borderRadius: "14px !important",
    display: "flex !important",
    flexDirection: "column !important",
    overflow: "hidden !important",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(255,255,255,0.06) inset"
  },
  checkoutHeader: {
    flexShrink: 0,
    padding: theme.spacing(1.25, 2, 1.25),
    background: "#fff",
    color: theme.palette.text.primary,
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    borderBottom: `1px solid ${theme.palette.divider}`
  },
  dialogContentCheckout: {
    flex: "1 1 auto",
    minHeight: 0,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    padding: 0
  },
  checkoutColumn: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif'
  },
  frameOuter: {
    flex: "1 1 auto",
    minHeight: 0,
    padding: theme.spacing(1, 1.5, 0.75),
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  },
  frameWrap: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    position: "relative",
    borderRadius: 10,
    overflow: "hidden",
    border: `1px solid ${theme.palette.type === "light" ? "rgba(15, 23, 42, 0.08)" : "rgba(255,255,255,0.1)"}`,
    background: theme.palette.type === "light" ? "#f8fafc" : theme.palette.background.paper,
    display: "flex",
    alignItems: "stretch",
    justifyContent: "stretch",
    boxShadow: theme.palette.type === "light" ? "inset 0 1px 0 rgba(255,255,255,0.9)" : "none"
  },
  iframeProgress: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 3,
    borderRadius: "10px 10px 0 0"
  },
  iframe: {
    width: "100%",
    height: "100%",
    border: "none",
    display: "block"
  },
  confirmRow: {
    flexShrink: 0,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: theme.spacing(1, 1.5, 1),
    borderTop: `1px solid ${theme.palette.type === "light" ? "rgba(15, 23, 42, 0.06)" : "rgba(255,255,255,0.08)"}`,
    background: theme.palette.type === "light" ? "rgba(248, 250, 252, 0.95)" : "rgba(0,0,0,0.12)"
  },
  dialogActionsCheckout: {
    flexShrink: 0,
    padding: "8px 16px 12px",
    minHeight: 48,
    borderTop: `1px solid ${theme.palette.type === "light" ? "rgba(15, 23, 42, 0.06)" : "rgba(255,255,255,0.08)"}`,
    background: theme.palette.type === "light" ? "#fff" : theme.palette.background.paper,
    justifyContent: "center"
  },
  confirmField: {
    "& .MuiOutlinedInput-root": {
      borderRadius: 4
    },
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: theme.palette.type === "light" ? "rgba(0,0,0,0.12)" : undefined
    }
  }
}));

/**
 * Freemium: `variant="appBar"` = chip no canto esquerdo da AppBar (após o menu); `banner` = faixa no conteúdo.
 */
const FreemiumTrialBar = ({ variant = "banner" }) => {
  const classes = useStyles();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("xs"));
  const { user } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [modalView, setModalView] = useState("plans");
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [confirmEmailPay, setConfirmEmailPay] = useState("");
  const [confirmBusyPay, setConfirmBusyPay] = useState(false);
  const [confirmErrPay, setConfirmErrPay] = useState("");
  const pollRef = useRef(null);

  const { show, daysRemaining, dueDate } = useMemo(() => {
    if (!user?.company || user.company.id === 1) {
      return { show: false, daysRemaining: null, dueDate: null };
    }
    if (user.company.recurrence !== "freemium") {
      return { show: false, daysRemaining: null, dueDate: null };
    }
    const due = user.company.dueDate;
    if (!due || !moment(due).isValid()) {
      return { show: false, daysRemaining: null, dueDate: null };
    }
    const days = brtCalendarDaysRemaining(due);
    if (days === null) {
      return { show: false, daysRemaining: 0, dueDate: null };
    }
    return { show: true, daysRemaining: days, dueDate: due };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.company?.id, user?.company?.recurrence, user?.company?.dueDate]);

  const [countdownTick, setCountdownTick] = useState(0);
  useEffect(() => {
    if (variant !== "appBar" || !show || !dueDate) return undefined;
    const id = window.setInterval(() => setCountdownTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [variant, show, dueDate]);

  const countdown = useMemo(() => {
    if (!dueDate) {
      return { days: 0, hh: "00", mm: "00", ss: "00" };
    }
    const ms = msUntilEndOfDueDayBrt(dueDate);
    return splitCountdownMs(ms);
  }, [dueDate, countdownTick]);

  useEffect(() => {
    setIframeLoaded(false);
  }, [checkoutUrl]);

  /** DNS/TLS antecipados → iframe do checkout tende a abrir mais rápido. */
  useEffect(() => {
    if (!show) return;
    const id = "vb-stripe-preconnect";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "preconnect";
    link.href = "https://buy.stripe.com";
    document.head.appendChild(link);
  }, [show]);

  useEffect(() => {
    if (!checkoutUrl) return;
    const id = "vb-freemium-checkout-prefetch";
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("link");
      el.id = id;
      el.rel = "prefetch";
      el.as = "document";
      document.head.appendChild(el);
    }
    try {
      el.href = checkoutUrl;
    } catch {
      /* ignore */
    }
  }, [checkoutUrl]);

  /** Se onLoad do iframe falhar, remove a barra de progresso após um teto. */
  useEffect(() => {
    if (!checkoutUrl) return undefined;
    const t = window.setTimeout(() => setIframeLoaded(true), 10000);
    return () => window.clearTimeout(t);
  }, [checkoutUrl]);

  useEffect(() => {
    if (modalView === "checkout" && user?.email) {
      setConfirmEmailPay((prev) => (prev ? prev : user.email));
    }
  }, [modalView, user?.email]);

  const clearPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const handleCloseModal = () => {
    clearPoll();
    setOpen(false);
    setModalView("plans");
    setCheckoutUrl(null);
    setIframeLoaded(false);
    setConfirmErrPay("");
    setConfirmBusyPay(false);
  };

  const finalizePaymentConfirmed = async (token) => {
    try {
      await api.post(`/auth/confirm/${token}/acknowledge`);
    } catch {
      /* token pode já ter sido tratado; segue atualizando sessão */
    }
    toast.success("Pagamento confirmado. Atualizando…");
    clearPoll();
    handleCloseModal();
    window.location.reload();
  };

  const tryFetchConfirmToken = async (email) => {
    const r = await openApi.get("/auth/confirm/by-email", {
      params: { email: String(email).trim() }
    });
    if (r?.data?.token) {
      await finalizePaymentConfirmed(r.data.token);
      return true;
    }
    return false;
  };

  useEffect(() => {
    clearPoll();
    if (modalView !== "checkout" || !confirmEmailPay || !String(confirmEmailPay).trim()) {
      return undefined;
    }
    const email = String(confirmEmailPay).trim();
    const tick = async () => {
      try {
        await tryFetchConfirmToken(email);
      } catch {
        /* aguarda webhook */
      }
    };
    pollRef.current = setInterval(tick, 4000);
    tick();
    return clearPoll;
  }, [modalView, confirmEmailPay, checkoutUrl]);

  const handleChoosePlan = (cycle, tier) => {
    const url = buildCaktoCheckoutUrl(cycle, tier, user?.email);
    if (!url) {
      toast.error("Não foi possível montar o link do plano. Tente outro ciclo ou atualize a página.");
      return;
    }
    setConfirmErrPay("");
    setCheckoutUrl(url);
    setModalView("checkout");
  };

  const handleBackToPlans = () => {
    clearPoll();
    setModalView("plans");
    setCheckoutUrl(null);
    setIframeLoaded(false);
    setConfirmErrPay("");
  };

  const handleConfirmPaymentClick = async () => {
    const email = String(confirmEmailPay || "").trim();
    if (!email) return;
    setConfirmBusyPay(true);
    setConfirmErrPay("");
    try {
      const ok = await tryFetchConfirmToken(email);
      if (ok) return;
    } catch {
      /* webhook ainda não registrou — o polling automático continua */
    }
    setConfirmErrPay("Aguardando aprovação do pagamento…");
    setConfirmBusyPay(false);
  };

  if (!show) {
    return null;
  }

  const label =
    daysRemaining === 0
      ? "último dia do período grátis"
      : `${daysRemaining} dia${daysRemaining !== 1 ? "s" : ""} restante${daysRemaining !== 1 ? "s" : ""} no Starter grátis`;

  const helvetica = { fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontWeight: 400 };

  const openPlansModal = () => {
    setOpen(true);
    setModalView("plans");
    setCheckoutUrl(null);
  };

  return (
    <>
      {variant === "appBar" ? (
        <Tooltip
          title={`Período grátis Starter · ${label}. Contagem em horário de Brasília. Restam ${countdown.days}d ${countdown.hh}:${countdown.mm}:${countdown.ss}. Ver planos.`}
          arrow
          placement="bottom"
        >
          <span style={{ display: "inline-flex", verticalAlign: "middle" }}>
            <Box
              component="button"
              type="button"
              className={classes.topbarPillOuter}
              onClick={openPlansModal}
              aria-label={`Teste grátis. Dias restantes ${countdown.days}. Tempo restante ${countdown.hh} horas ${countdown.mm} minutos ${countdown.ss} segundos, horário de Brasília. Ver planos.`}
            >
              <Box className={classes.topbarPillRow}>
                <Typography component="span" className={classes.topbarLabel}>
                  Teste grátis
                </Typography>
                <Typography component="span" className={classes.topbarSep}>
                  ·
                </Typography>
                <Typography component="span" className={classes.topbarLabel}>
                  Dias restantes: {countdown.days}
                </Typography>
                <Typography component="span" className={classes.topbarSep}>
                  ·
                </Typography>
                <Typography component="span" className={classes.topbarLabel}>
                  Horas:{" "}
                  <Typography component="span" className={classes.topbarTime}>
                    {countdown.hh}:{countdown.mm}:{countdown.ss}
                  </Typography>
                </Typography>
              </Box>
            </Box>
          </span>
        </Tooltip>
      ) : (
        <Box
          className={classes.bar}
          onClick={openPlansModal}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              openPlansModal();
            }
          }}
          role="button"
          tabIndex={0}
        >
          <Typography component="span" className={classes.barMain}>
            Período grátis Starter · {label}
          </Typography>
          <Typography component="span" className={classes.barHint}>
            Ver planos pagos
          </Typography>
        </Box>
      )}

      <Dialog
        open={open}
        onClose={handleCloseModal}
        maxWidth={modalView === "checkout" ? false : "md"}
        fullWidth
        scroll="body"
        BackdropProps={
          modalView === "checkout"
            ? { classes: { root: classes.backdropCheckout } }
            : undefined
        }
        PaperProps={{
          className: modalView === "checkout" ? classes.paperCheckout : classes.paperPlans
        }}
      >
        <DialogTitle
          className={modalView === "checkout" ? classes.checkoutHeader : classes.dialogTitle}
          disableTypography
        >
          <Typography
            variant={modalView === "checkout" ? "subtitle1" : "h6"}
            component="span"
            style={
              modalView === "checkout"
                ? {
                    ...helvetica,
                    color: "rgba(0, 0, 0, 0.87)",
                    fontWeight: 600,
                    fontSize: isXs ? "1rem" : "1.05rem",
                    letterSpacing: "0.01em"
                  }
                : { ...helvetica, fontSize: isXs ? "1rem" : undefined }
            }
          >
            {modalView === "checkout" ? "Pagamento" : "Planos pagos"}
          </Typography>
        </DialogTitle>

        <DialogContent
          dividers={modalView === "plans"}
          className={modalView === "checkout" ? classes.dialogContentCheckout : undefined}
        >
          {modalView === "plans" ? (
            <PlanosPreview onChoose={handleChoosePlan} />
          ) : (
            <Box className={classes.checkoutColumn}>
              <Box className={classes.frameOuter}>
                <Paper elevation={0} className={classes.frameWrap} square>
                  {checkoutUrl ? (
                    <>
                      {!iframeLoaded ? (
                        <LinearProgress
                          color="primary"
                          className={classes.iframeProgress}
                          variant="indeterminate"
                        />
                      ) : null}
                      <iframe
                        title="Pagamento"
                        src={checkoutUrl}
                        className={classes.iframe}
                        onLoad={() => setIframeLoaded(true)}
                      />
                    </>
                  ) : null}
                </Paper>
              </Box>
              <Box className={classes.confirmRow}>
                <TextField
                  value={confirmEmailPay}
                  onChange={(e) => setConfirmEmailPay(e.target.value)}
                  placeholder="E-mail do pagamento"
                  variant="outlined"
                  size="small"
                  margin="dense"
                  type="email"
                  className={classes.confirmField}
                  style={{ minWidth: isXs ? "100%" : 200, flex: isXs ? "1 1 100%" : "0 1 auto" }}
                  inputProps={{ autoCapitalize: "none", autoCorrect: "off", spellCheck: false }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  disableElevation
                  disabled={!confirmEmailPay || confirmBusyPay}
                  style={{ ...helvetica, minWidth: 80, padding: "6px 14px", borderRadius: 8, textTransform: "none" }}
                  onClick={handleConfirmPaymentClick}
                >
                  Confirmar
                </Button>
                {confirmErrPay ? (
                  <Typography
                    variant="caption"
                    color={confirmErrPay.includes("Aguardando") ? "textSecondary" : "error"}
                    style={{ ...helvetica, width: "100%", textAlign: "center", fontSize: "0.7rem" }}
                  >
                    {confirmErrPay}
                  </Typography>
                ) : null}
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions className={modalView === "checkout" ? classes.dialogActionsCheckout : undefined}>
          {modalView === "checkout" ? (
            <Button
              onClick={handleBackToPlans}
              color="primary"
              size="small"
              style={{ ...helvetica, textTransform: "none", marginRight: 8 }}
            >
              ← Planos
            </Button>
          ) : null}
          <Button
            onClick={handleCloseModal}
            color={modalView === "checkout" ? "default" : "default"}
            size="small"
            variant={modalView === "checkout" ? "outlined" : "text"}
            style={{ ...helvetica, textTransform: "none", borderRadius: 8 }}
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FreemiumTrialBar;
