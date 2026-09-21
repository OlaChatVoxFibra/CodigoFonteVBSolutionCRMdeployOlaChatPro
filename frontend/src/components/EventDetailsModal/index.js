/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Drawer,
  Button,
  Typography,
  Grid,
  TextField,
  Box,
  IconButton,
  Avatar,
  CircularProgress,
  Chip,
  Link,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import CloseIcon from "@material-ui/icons/Close";
import PhoneIcon from "@material-ui/icons/Phone";
import EmailIcon from "@material-ui/icons/Email";
import ChatIcon from "@material-ui/icons/Chat";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";
import moment from "moment";
import { Link as RouterLink } from "react-router-dom";
import activitiesService from "../../services/activitiesService";
import api from "../../services/api";
import { toast } from "react-toastify";
import toastError from "../../errors/toastError";
import { getBackendUrl } from "../../config";
import { i18n } from "../../translate/i18n";
import {
  toDateInputValue,
  toTimeInputValue,
  dateInputToStartISO,
  dateInputToEndISO,
  validateDeadlineRange,
  formatDeadlineRangeLabel,
  formatDeadlineWhenLines,
  DEFAULT_START_TIME,
  DEFAULT_END_TIME,
} from "../../utils/deadlineDates";
import { cleanActivityDescription } from "../../utils/cleanActivityDescription";
import DeadlineRangeFields from "../DeadlineRangeFields";

const useStyles = makeStyles((theme) => ({
  drawerPaper: {
    width: 460,
    maxWidth: "100%",
    padding: theme.spacing(2),
    borderRadius: 16,
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    height: "calc(100% - 32px)",
    marginRight: theme.spacing(2),
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: theme.palette.type === 'dark' ? theme.palette.background.paper : undefined,
    color: theme.palette.text.primary,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderBottom: theme.palette.type === 'dark' ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
    paddingBottom: theme.spacing(2),
    marginBottom: theme.spacing(2),
    flexShrink: 0,
  },
  closeButton: {
    position: "absolute",
    left: 0,
  },
  scrollBody: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    overflowY: "auto",
    overflowX: "hidden",
    paddingRight: theme.spacing(0.5),
    "&::-webkit-scrollbar": { width: 6 },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: theme.palette.type === "dark" ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.12)",
      borderRadius: 3,
    },
  },
  contentRoot: {
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
  },
  fieldBlock: {
    marginBottom: theme.spacing(1.5),
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: theme.palette.text.secondary,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 14,
    lineHeight: 1.45,
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  },
  whenStack: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  whenLine: {
    fontSize: 13,
    lineHeight: 1.4,
    wordBreak: "break-word",
  },
  whenTag: {
    display: "inline-block",
    minWidth: 42,
    fontSize: 11,
    fontWeight: 600,
    color: theme.palette.text.secondary,
    marginRight: 6,
  },
  googleCalendarChip: {
    marginBottom: theme.spacing(2),
    fontWeight: 600,
    backgroundColor:
      theme.palette.type === "dark" ? "#4285F4" : "rgba(66,133,244,0.15)",
    color: theme.palette.type === "dark" ? "#ffffff" : "#174EA6",
    "& .MuiChip-label": {
      color: theme.palette.type === "dark" ? "#ffffff" : "#174EA6",
      fontWeight: 600,
    },
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    marginTop: theme.spacing(2),
    paddingTop: theme.spacing(2),
    borderTop: theme.palette.type === 'dark' ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
    flexShrink: 0,
  },
  contactCard: {
    display: "flex",
    gap: theme.spacing(2),
    padding: theme.spacing(2),
    borderRadius: 12,
    marginBottom: theme.spacing(2),
    background:
      theme.palette.type === "dark"
        ? "rgba(255,255,255,0.06)"
        : "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
    border: `1px solid ${theme.palette.divider}`,
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    marginTop: theme.spacing(0.75),
    fontSize: 13,
    color: theme.palette.text.secondary,
    "& svg": { fontSize: 18, opacity: 0.85 },
  },
  waShell: {
    borderRadius: 12,
    overflow: "hidden",
    border: `1px solid ${theme.palette.divider}`,
    marginBottom: theme.spacing(1),
  },
  waTicketBar: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
    padding: theme.spacing(1, 1.5),
    background: theme.palette.total || theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
    minHeight: 56,
  },
  waTicketBarAvatar: {
    width: 44,
    height: 44,
    flexShrink: 0,
  },
  waTicketBarText: {
    minWidth: 0,
    flex: 1,
  },
  waBody: {
    background: theme.palette.type === "dark" ? "#0b141a" : "#e5ddd5",
    backgroundImage:
      theme.palette.type === "dark"
        ? "none"
        : "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)",
    padding: theme.spacing(1.5),
    maxHeight: 360,
    minHeight: 180,
    overflowY: "auto",
  },
  bubbleRow: {
    display: "flex",
    marginBottom: theme.spacing(0.75),
    justifyContent: "flex-start",
  },
  bubbleRowMe: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "88%",
    padding: "8px 11px",
    borderRadius: 8,
    boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
    fontSize: 13,
    lineHeight: 1.4,
    wordBreak: "break-word",
  },
  bubbleIn: {
    background: theme.palette.type === "dark" ? "#202c33" : "#fff",
    color: theme.palette.type === "dark" ? "#e9edef" : "#111",
    borderTopLeftRadius: 2,
  },
  bubbleOut: {
    background: theme.palette.type === "dark" ? "#005c4b" : "#dcf8c6",
    color: theme.palette.type === "dark" ? "#e9edef" : "#111",
    borderTopRightRadius: 2,
  },
  bubbleTime: {
    fontSize: 11,
    opacity: 0.55,
    marginTop: 4,
    textAlign: "right",
  },
  intentBanner: {
    padding: theme.spacing(1, 1.5),
    borderRadius: 8,
    background: theme.palette.type === "dark" ? "rgba(7,94,84,0.25)" : "rgba(7,94,84,0.08)",
    border: `1px solid ${theme.palette.divider}`,
    fontSize: 13,
    marginBottom: theme.spacing(1),
  },
}));

function parseTicketIdFromBody(body) {
  if (!body || typeof body !== "string") return null;
  const m = body.match(/ticket\s*#(\d+)/i);
  return m ? Number(m[1]) : null;
}

function extractDetectedIntent(body) {
  if (!body || typeof body !== "string") return null;
  const m = body.match(
    /(?:Pedido\/data detectados|detectados)\s+na\s+última\s+mensagem\s*:\s*(.+)/i
  );
  if (m) return m[1].trim();
  const m2 = body.match(/(?:última mensagem|ultima mensagem)[^\n:]*:\s*(.+)/i);
  return m2 ? m2[1].trim() : null;
}

function isAiStyleScheduleBody(body) {
  if (!body || typeof body !== "string") return false;
  return (
    /ticket\s*#\d+/i.test(body) ||
    /Resumo do histórico recente/i.test(body) ||
    /^Reunião\s+[—\-–]/im.test(body.trim()) ||
    /Atendente\/IA:/i.test(body) ||
    /^Cliente:/im.test(body)
  );
}

function resolveContactAvatarUrl(url) {
  const backendUrl = getBackendUrl();
  if (!url || typeof url !== "string") return "";
  const u = url.trim();
  if (/^(data:|blob:|https?:\/\/)/i.test(u)) return u;
  if (u.startsWith("/")) return `${backendUrl}${u}`;
  return `${backendUrl}/public/${u}`;
}

function formatChatLine(msg) {
  if (msg.isDeleted) return "Mensagem apagada";
  const t = msg.mediaType;
  if (t && t !== "chat" && t !== "extendedText" && t !== "conversation") {
    const label = t === "audio" ? "Áudio" : t === "image" ? "Imagem" : t === "video" ? "Vídeo" : "Mídia";
    if (msg.body && String(msg.body).trim()) return msg.body;
    return `[${label}]`;
  }
  return msg.body || "";
}

const EventDetailsModal = ({
  open,
  onClose,
  event,
  onEditSchedule,
  onDeleteSchedule,
  onActivityUpdated,
  onActivityDeleted,
  onGoogleEventImported,
  googleCalendarMeta = {},
}) => {
  const classes = useStyles();
  const hasEvent = Boolean(event);
  const res = (event && (event.resource || event)) || {};
  const isGoogleCalendar = res?.kind === "google-calendar";
  const isActivityEvent =
    !isGoogleCalendar &&
    (!!res.date || !!res.type || res?.kind === "activity-event");
  const kind =
    res?.kind || (isActivityEvent ? "activity-event" : "schedule");
  const when = isGoogleCalendar
    ? res.start || event?.start
    : isActivityEvent
      ? res.date
      : res.sendAt;
  const title = isGoogleCalendar
    ? res.summary || "Evento Google"
    : res.title || res?.contact?.name || "Evento";
  const body = res.body || "";
  const description = cleanActivityDescription(res.description || body) || "Sem descrição";
  const contact = res.contact || {};

  const ticketForChat = useMemo(() => {
    if (kind !== "schedule") return null;
    if (res.ticketId) return Number(res.ticketId);
    return parseTicketIdFromBody(body);
  }, [kind, res.ticketId, body]);

  const showWhatsPreview =
    kind === "schedule" &&
    ticketForChat &&
    (isAiStyleScheduleBody(body) || Boolean(res.ticketId));

  const detectedIntent = useMemo(() => extractDetectedIntent(body), [body]);

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    dateStart: "",
    dateEnd: "",
    timeStart: DEFAULT_START_TIME,
    timeEnd: DEFAULT_END_TIME,
    location: "",
    address: "",
    phone: "",
    link: "",
  });

  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);
  /** Ticket completo como em /tickets (para barra de contato do preview) */
  const [ticketSnapshot, setTicketSnapshot] = useState(null);
  const waBodyRef = useRef(null);
  const [importingGoogle, setImportingGoogle] = useState(false);

  const canEditInline = isActivityEvent;

  const googleEnd = isGoogleCalendar ? res.end || event?.end : null;
  const googleHtmlLink = isGoogleCalendar ? res.htmlLink : null;
  const googleDescription = isGoogleCalendar
    ? res.description || ""
    : "";

  const handleImportGoogleEvent = async () => {
    toast.info("Importação do Google Calendar não está disponível neste pacote.");
  };

  useEffect(() => {
    if (!hasEvent || !open) return;
    const endWhen = isActivityEvent ? res.dateEnd || when : googleEnd || when;
    setForm({
      title: title || "",
      description: res.description || "",
      dateStart: toDateInputValue(when),
      dateEnd: toDateInputValue(endWhen),
      timeStart: toTimeInputValue(when, "start"),
      timeEnd: toTimeInputValue(endWhen, "end"),
      location: res.location || "",
      address: res.address || "",
      phone: res.phone || "",
      link: res.link || "",
    });
    setEditMode(false);
  }, [
    hasEvent,
    open,
    res.id,
    title,
    when,
    res.dateEnd,
    googleEnd,
    isActivityEvent,
    res.description,
    res.location,
    res.address,
    res.phone,
    res.link,
  ]);

  useEffect(() => {
    if (!open) {
      setChatMessages([]);
      setChatLoading(false);
      setChatError(null);
      setTicketSnapshot(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !showWhatsPreview || !ticketForChat) {
      return;
    }
    let cancelled = false;
    setChatLoading(true);
    setChatError(null);
    setTicketSnapshot(null);
    api
      .get(`/messages/${ticketForChat}`, { params: { pageNumber: 1 } })
      .then(async ({ data }) => {
        if (cancelled) return;
        setChatMessages(Array.isArray(data.messages) ? data.messages : []);
        const uuid = data.ticket?.uuid;
        if (uuid) {
          try {
            const { data: fullTicket } = await api.get(`/tickets/u/${uuid}`);
            if (!cancelled) setTicketSnapshot(fullTicket);
          } catch {
            if (!cancelled) setTicketSnapshot(null);
          }
        }
      })
      .catch(() => {
        if (cancelled) return;
        setChatError("Não foi possível carregar o histórico deste ticket.");
      })
      .finally(() => {
        if (!cancelled) setChatLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, showWhatsPreview, ticketForChat]);

  useEffect(() => {
    if (chatLoading || !waBodyRef.current) return;
    const el = waBodyRef.current;
    el.scrollTop = el.scrollHeight;
  }, [chatMessages, chatLoading]);

  const handleField = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSave = async () => {
    if (!isActivityEvent) return;
    const deadlineErr = validateDeadlineRange(
      form.dateStart,
      form.dateEnd,
      form.timeStart,
      form.timeEnd
    );
    if (deadlineErr) {
      toast.error(deadlineErr);
      return;
    }
    try {
      setSaving(true);
      const payload = {
        title: form.title,
        description: form.description,
        date: dateInputToStartISO(form.dateStart, form.timeStart),
        dateEnd: dateInputToEndISO(form.dateEnd, form.timeEnd),
        location: form.location,
        address: form.address,
        phone: form.phone,
        link: form.link,
      };
      const updated = await activitiesService.update(res.id, payload);
      toast.success("Evento atualizado com sucesso.");
      onActivityUpdated && onActivityUpdated({ ...(res || {}), ...(updated || payload), id: res.id });
      setEditMode(false);
      onClose && onClose();
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isActivityEvent) {
      try {
        if (!window.confirm("Excluir este evento? Esta ação não pode ser desfeita.")) return;
        await activitiesService.delete(res.id);
        toast.success("Evento excluído.");
        onActivityDeleted && onActivityDeleted(res.id);
        onClose && onClose();
      } catch (err) {
        toastError(err);
      }
    } else {
      if (onDeleteSchedule) {
        onDeleteSchedule(res.id);
        onClose && onClose();
      }
    }
  };

  const cardContact = ticketSnapshot?.contact || contact;
  const phoneDigits = (cardContact.number || "").replace(/\D/g, "");
  const waHref = phoneDigits ? `https://wa.me/${phoneDigits}` : null;

  const copyPhone = useCallback(() => {
    const raw = cardContact.number || "";
    if (!raw) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(raw);
      toast.success("Telefone copiado.");
    }
  }, [cardContact.number]);

  const displayPhone = cardContact.number || "—";
  const displayEmail = cardContact.email && cardContact.email.trim() ? cardContact.email : null;

  const backendUrl = getBackendUrl();
  const barContact = cardContact;
  const barTicketId = ticketSnapshot?.id ?? ticketForChat;
  const rawBarName = barContact?.name || title || "(sem contato)";
  const previewTitleShort =
    rawBarName.length > 22 ? `${rawBarName.substring(0, 22)}…` : rawBarName;
  const previewTitleLine =
    barTicketId != null ? `${previewTitleShort} #${barTicketId}` : previewTitleShort;
  const previewSubheader = [
    ticketSnapshot?.user?.name &&
      `${i18n.t("messagesList.header.assignedTo")} ${ticketSnapshot.user.name}`,
    ticketSnapshot?.queue?.name,
    ticketSnapshot?.channel,
  ]
    .filter(Boolean)
    .join(" · ");
  const previewAvatarSrc = resolveContactAvatarUrl(
    barContact?.urlPicture || barContact?.profilePicUrl
  );
  const ticketRouteId = ticketSnapshot?.uuid || ticketForChat;

  const deadlineWhen = useMemo(() => {
    if (!when) return null;
    return formatDeadlineWhenLines(when, res.dateEnd || when);
  }, [when, res.dateEnd]);

  const renderDeadlineWhen = () => {
    if (!deadlineWhen) {
      return (
        <Typography className={classes.fieldValue} color="textSecondary">
          Sem data
        </Typography>
      );
    }
    return (
      <Box className={classes.whenStack}>
        <Typography className={classes.whenLine}>
          <span className={classes.whenTag}>Início</span>
          {deadlineWhen.startLabel}
        </Typography>
        <Typography className={classes.whenLine}>
          <span className={classes.whenTag}>Fim</span>
          {deadlineWhen.endLabel}
        </Typography>
      </Box>
    );
  };

  if (!hasEvent) return null;

  return (
    <Drawer anchor="right" open={open} onClose={onClose} classes={{ paper: classes.drawerPaper }}>
      <Box className={classes.header}>
        <IconButton className={classes.closeButton} onClick={onClose} aria-label="fechar">
          <CloseIcon />
        </IconButton>
        <Typography variant="h6" style={{ fontWeight: 600 }}>
          {isGoogleCalendar ? "Google Calendar" : "Detalhes do Evento"}
        </Typography>
      </Box>

      <Box className={classes.scrollBody}>
        <Box className={classes.contentRoot}>
        {!editMode && isGoogleCalendar && (
          <>
            <Chip
              size="small"
              label="Google Calendar"
              className={classes.googleCalendarChip}
            />
            {googleCalendarMeta.accountEmail && (
              <Typography
                variant="caption"
                color="textSecondary"
                display="block"
                style={{ marginBottom: 12 }}
              >
                Conta: {googleCalendarMeta.accountEmail}
              </Typography>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  Título
                </Typography>
                <Typography variant="body1">{title}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  Quando
                </Typography>
                <Typography variant="body1">
                  {when
                    ? moment(when).format(
                        res.allDay ? "DD/MM/YYYY (dia inteiro)" : "DD/MM/YYYY HH:mm"
                      )
                    : "Sem data"}
                  {googleEnd && !res.allDay
                    ? ` — ${moment(googleEnd).format("HH:mm")}`
                    : ""}
                </Typography>
              </Grid>
              {res.location && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Local
                  </Typography>
                  <Typography variant="body1">{res.location}</Typography>
                </Grid>
              )}
              {googleDescription && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Descrição
                  </Typography>
                  <Typography variant="body1" style={{ whiteSpace: "pre-wrap" }}>
                    {googleDescription}
                  </Typography>
                </Grid>
              )}
              {googleHtmlLink && (
                <Grid item xs={12}>
                  <Link href={googleHtmlLink} target="_blank" rel="noreferrer">
                    Abrir no Google Calendar
                    <OpenInNewIcon
                      style={{ fontSize: 16, verticalAlign: "middle", marginLeft: 4 }}
                    />
                  </Link>
                </Grid>
              )}
            </Grid>
          </>
        )}

        {!editMode && kind === "schedule" && (
          <Box className={classes.contactCard}>
            <Avatar
              src={previewAvatarSrc || undefined}
              style={{ width: 56, height: 56 }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `${backendUrl}/public/app/noimage.png`;
              }}
            >
              {(title || "?").charAt(0).toUpperCase()}
            </Avatar>
            <Box flex={1} minWidth={0}>
              <Typography variant="subtitle1" style={{ fontWeight: 700 }}>
                {title}
              </Typography>
              <Typography variant="caption" color="textSecondary" display="block">
                {when ? moment(when).format("dddd, DD/MM/YYYY · HH:mm") : "Sem data"}
              </Typography>
              {showWhatsPreview && (
                <Chip
                  size="small"
                  label="Agendado com contexto do ticket"
                  style={{ marginTop: 8, background: "rgba(7,94,84,0.12)", fontWeight: 500 }}
                />
              )}
              <Box className={classes.metaRow}>
                <PhoneIcon fontSize="small" />
                {cardContact.number ? (
                  <>
                    <Link
                      component="button"
                      type="button"
                      variant="body2"
                      onClick={copyPhone}
                      style={{ cursor: "pointer" }}
                    >
                      {displayPhone}
                    </Link>
                    {waHref && (
                      <Link href={waHref} target="_blank" rel="noreferrer" variant="body2">
                        WhatsApp
                      </Link>
                    )}
                  </>
                ) : (
                  <Typography variant="body2">—</Typography>
                )}
              </Box>
              {displayEmail && (
                <Box className={classes.metaRow}>
                  <EmailIcon fontSize="small" />
                  <Typography variant="body2" noWrap title={displayEmail}>
                    {displayEmail}
                  </Typography>
                </Box>
              )}
              {res.whatsapp?.name && (
                <Box className={classes.metaRow}>
                  <ChatIcon fontSize="small" />
                  <Typography variant="body2">
                    Conexão: {res.whatsapp.name}
                    {res.whatsapp.channel ? ` · ${res.whatsapp.channel}` : ""}
                  </Typography>
                </Box>
              )}
              {ticketForChat && (
                <Box style={{ marginTop: 12 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    component={RouterLink}
                    to={`/tickets/${ticketRouteId}`}
                    startIcon={<OpenInNewIcon style={{ fontSize: 18 }} />}
                  >
                    Abrir ticket #{barTicketId ?? ticketForChat}
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {!editMode && !isActivityEvent && showWhatsPreview && detectedIntent && (
          <Box className={classes.intentBanner}>
            <Typography variant="caption" color="textSecondary" display="block">
              Pedido detectado na conversa
            </Typography>
            <Typography variant="body2">{detectedIntent}</Typography>
          </Box>
        )}

        {!editMode && kind === "schedule" && showWhatsPreview && (
          <Box className={classes.waShell}>
            <Box className={classes.waTicketBar}>
              <Avatar
                className={classes.waTicketBarAvatar}
                src={previewAvatarSrc || undefined}
                alt=""
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `${backendUrl}/public/app/noimage.png`;
                }}
              >
                {(rawBarName || "?").charAt(0).toUpperCase()}
              </Avatar>
              <Box className={classes.waTicketBarText}>
                <Typography variant="subtitle2" noWrap style={{ fontWeight: 600, lineHeight: 1.25 }}>
                  {previewTitleLine}
                </Typography>
                <Typography variant="caption" color="textSecondary" noWrap display="block">
                  {previewSubheader ||
                    (barTicketId != null
                      ? `Ticket #${barTicketId} · pré-visualização`
                      : "Pré-visualização da conversa")}
                </Typography>
              </Box>
            </Box>
            <Box className={classes.waBody} ref={waBodyRef}>
              {chatLoading && (
                <Box display="flex" justifyContent="center" py={3}>
                  <CircularProgress size={28} />
                </Box>
              )}
              {!chatLoading && chatError && (
                <Typography variant="body2" color="textSecondary">
                  {chatError}
                </Typography>
              )}
              {!chatLoading &&
                !chatError &&
                chatMessages.map((msg) => {
                  const text = formatChatLine(msg);
                  if (!text && !msg.mediaType) return null;
                  const fromMe = !!msg.fromMe;
                  return (
                    <Box
                      key={msg.id || `${msg.createdAt}-${fromMe}`}
                      className={`${classes.bubbleRow} ${fromMe ? classes.bubbleRowMe : ""}`}
                    >
                      <Box className={`${classes.bubble} ${fromMe ? classes.bubbleOut : classes.bubbleIn}`}>
                        <Typography variant="body2" component="div">
                          {text || " "}
                        </Typography>
                        <div className={classes.bubbleTime}>
                          {msg.createdAt ? moment(msg.createdAt).format("HH:mm") : ""}
                        </div>
                      </Box>
                    </Box>
                  );
                })}
            </Box>
          </Box>
        )}

        {!editMode && kind === "schedule" && !showWhatsPreview && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary">
                Título
              </Typography>
              <Typography variant="body1">{title}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary">
                Quando
              </Typography>
              <Typography variant="body1">{when ? moment(when).format("DD/MM/YYYY HH:mm") : "Sem data"}</Typography>
            </Grid>
            {contact.number && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  Contato
                </Typography>
                <Typography variant="body1">{contact.name || title}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {contact.number}
                </Typography>
              </Grid>
            )}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary">
                Descrição
              </Typography>
              <Typography variant="body1" style={{ whiteSpace: "pre-wrap" }}>
                {description}
              </Typography>
            </Grid>
          </Grid>
        )}

        {!editMode && isActivityEvent && (
          <Box>
            <Box className={classes.fieldBlock}>
              <Typography className={classes.fieldLabel}>Título</Typography>
              <Typography className={classes.fieldValue}>{title}</Typography>
            </Box>
            <Box className={classes.fieldBlock}>
              <Typography className={classes.fieldLabel}>Quando</Typography>
              {renderDeadlineWhen()}
            </Box>
            <Box className={classes.fieldBlock}>
              <Typography className={classes.fieldLabel}>Descrição</Typography>
              <Typography className={classes.fieldValue} style={{ whiteSpace: "pre-wrap" }}>
                {description}
              </Typography>
            </Box>
            {res.responsible && (
              <Box className={classes.fieldBlock}>
                <Typography className={classes.fieldLabel}>Responsável</Typography>
                <Typography className={classes.fieldValue}>{res.responsible}</Typography>
              </Box>
            )}
            {res.location && (
              <Box className={classes.fieldBlock}>
                <Typography className={classes.fieldLabel}>Local</Typography>
                <Typography className={classes.fieldValue}>{res.location}</Typography>
              </Box>
            )}
            {res.address && (
              <Box className={classes.fieldBlock}>
                <Typography className={classes.fieldLabel}>Endereço</Typography>
                <Typography className={classes.fieldValue}>{res.address}</Typography>
              </Box>
            )}
            {res.phone && (
              <Box className={classes.fieldBlock}>
                <Typography className={classes.fieldLabel}>Telefone</Typography>
                <Typography className={classes.fieldValue}>{res.phone}</Typography>
              </Box>
            )}
            {res.link && (
              <Box className={classes.fieldBlock}>
                <Typography className={classes.fieldLabel}>Link</Typography>
                <Typography className={classes.fieldValue}>
                  <a href={res.link} target="_blank" rel="noreferrer">
                    {res.link}
                  </a>
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {editMode && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Título"
                value={form.title}
                onChange={handleField("title")}
                fullWidth
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Prazo
              </Typography>
              <Box style={{ width: "100%", minWidth: 0 }}>
                <DeadlineRangeFields
                  showTime
                  isDark={false}
                  showLabel={false}
                  dateStart={form.dateStart}
                  dateEnd={form.dateEnd}
                  timeStart={form.timeStart}
                  timeEnd={form.timeEnd}
                  onChangeStart={(v) => setForm((p) => ({ ...p, dateStart: v }))}
                  onChangeEnd={(v) => setForm((p) => ({ ...p, dateEnd: v }))}
                  onChangeTimeStart={(v) => setForm((p) => ({ ...p, timeStart: v }))}
                  onChangeTimeEnd={(v) => setForm((p) => ({ ...p, timeEnd: v }))}
                />
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Descrição"
                value={form.description}
                onChange={handleField("description")}
                fullWidth
                multiline
                minRows={3}
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Local"
                value={form.location}
                onChange={handleField("location")}
                fullWidth
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Endereço"
                value={form.address}
                onChange={handleField("address")}
                fullWidth
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Telefone"
                value={form.phone}
                onChange={handleField("phone")}
                fullWidth
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Link"
                value={form.link}
                onChange={handleField("link")}
                fullWidth
                variant="outlined"
                size="small"
              />
            </Grid>
          </Grid>
        )}
        </Box>
      </Box>

      <Box className={classes.footer}>
        {!editMode && isGoogleCalendar && (
          <>
            {googleHtmlLink && (
              <Button
                href={googleHtmlLink}
                target="_blank"
                rel="noreferrer"
                component="a"
                color="primary"
                variant="outlined"
                startIcon={<OpenInNewIcon />}
              >
                Google
              </Button>
            )}
            <Button
              onClick={handleImportGoogleEvent}
              color="primary"
              variant="contained"
              disabled={importingGoogle}
            >
              {importingGoogle ? "Importando…" : "Importar como atividade"}
            </Button>
            <Button onClick={onClose}>Fechar</Button>
          </>
        )}
        {!editMode && !isGoogleCalendar && (
          <>
            {kind === "schedule" ? (
              <Button
                onClick={() => {
                  onEditSchedule && onEditSchedule(res);
                  onClose && onClose();
                }}
                color="primary"
                variant="outlined"
              >
                Editar
              </Button>
            ) : (
              canEditInline && (
                <Button onClick={() => setEditMode(true)} color="primary" variant="outlined">
                  Editar
                </Button>
              )
            )}
            <Button onClick={handleDelete} color="secondary">
              Excluir
            </Button>
            <Button onClick={onClose}>Fechar</Button>
          </>
        )}
        {editMode && (
          <>
            <Button onClick={() => setEditMode(false)}>Cancelar</Button>
            <Button onClick={handleSave} color="primary" variant="contained" disabled={saving}>
              Salvar
            </Button>
          </>
        )}
      </Box>
    </Drawer>
  );
};

export default EventDetailsModal;
