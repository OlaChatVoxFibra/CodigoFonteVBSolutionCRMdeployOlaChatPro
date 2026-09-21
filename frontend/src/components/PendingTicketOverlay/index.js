/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useContext, useState } from "react";
import { useParams, useHistory } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Paper,
  Avatar,
  CircularProgress,
  makeStyles,
  useTheme
} from "@material-ui/core";
import {
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  CheckCircle as AcceptIcon,
  Schedule as PendingIcon
} from "@material-ui/icons";
import { AuthContext } from "../../context/Auth/AuthContext";
import {TicketsContext} from "../../context/Tickets/TicketsContext";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import { buildAcceptTicketPayload } from "../../utils/acceptTicketPayload";
import toastError from "../../errors/toastError";
import AcceptTicketWithouSelectQueue from "../AcceptTicketWithoutQueueModal";

const useStyles = makeStyles((theme) => ({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: theme.spacing(3),
    pointerEvents: "none", // ✅ Permite interação com elementos abaixo
  },
  overlayDark: {
    backgroundColor: "rgba(0, 0, 0, 0.85)",
  },
  contentContainer: {
    pointerEvents: "auto",
    textAlign: "center",
    maxWidth: 400,
    padding: theme.spacing(4),
    borderRadius: theme.spacing(2),
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
  },
  lockIcon: {
    fontSize: 64,
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(2),
  },
  title: {
    fontWeight: 600,
    marginBottom: theme.spacing(1),
    color: theme.palette.text.primary,
  },
  subtitle: {
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(3),
    lineHeight: 1.6,
  },
  contactInfo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing(3),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.action.hover,
    borderRadius: theme.spacing(1),
  },
  contactAvatar: {
    marginRight: theme.spacing(2),
    width: 48,
    height: 48,
  },
  contactDetails: {
    textAlign: "left",
  },
  contactName: {
    fontWeight: 500,
    marginBottom: theme.spacing(0.5),
  },
  ticketId: {
    fontSize: "0.875rem",
    color: theme.palette.text.secondary,
  },
  actionButtons: {
    display: "flex",
    gap: theme.spacing(2),
    justifyContent: "center",
    marginTop: theme.spacing(3),
  },
  acceptButton: {
    minWidth: 140,
    padding: theme.spacing(1.5, 3),
    fontWeight: 600,
    backgroundColor: theme.palette.success.main,
    color: theme.palette.success.contrastText,
    "&:hover": {
      backgroundColor: theme.palette.success.dark,
    },
  },
  warningText: {
    fontSize: "0.75rem",
    color: theme.palette.warning.main,
    marginTop: theme.spacing(2),
    fontStyle: "italic",
  },
  statusChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: theme.spacing(0.5),
    padding: theme.spacing(0.5, 1.5),
    backgroundColor: theme.palette.warning.light,
    color: theme.palette.warning.contrastText,
    borderRadius: theme.spacing(3),
    fontSize: "0.75rem",
    fontWeight: 500,
    marginBottom: theme.spacing(2),
  }
}));

const PendingTicketOverlay = ({ 
  ticket, 
  contact, 
  isAccepting = false 
}) => {
  const classes = useStyles();
  const theme = useTheme();
  const history = useHistory();
  const { user } = useContext(AuthContext);
  const { setTabOpen } = useContext(TicketsContext);
  const [loading, setLoading] = useState(false);
  
  // ✅ ADICIONAR ESTADO PARA MODAL DE SELEÇÃO DE FILA
  const [acceptTicketWithouSelectQueueOpen, setAcceptTicketWithouSelectQueueOpen] = useState(false);

  // ✅ CORRIGIDO: Lógica igual ao TicketActionButtonsCustom
  const handleAcceptTicket = async () => {
    if (loading || isAccepting) return;
    
    // ✅ VERIFICAR SE TICKET TEM FILA ASSOCIADA
    if (ticket.queueId === null || ticket.queueId === undefined) {
      // Se não tem fila, abrir modal para escolher
      setAcceptTicketWithouSelectQueueOpen(true);
      return;
    }

    // ✅ Se tem fila, aceitar diretamente (lógica original)
    setLoading(true);
    try {
      await api.put(
        `/tickets/${ticket.id}`,
        buildAcceptTicketPayload(ticket, user?.id)
      );
      
      setLoading(false);
      setTabOpen(ticket.isGroup ? "group" : "open");
      history.push(`/tickets/${ticket.uuid}`);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNÇÃO PARA FECHAR MODAL DE SELEÇÃO DE FILA
  const handleCloseAcceptTicketWithouSelectQueue = () => {
    setAcceptTicketWithouSelectQueueOpen(false);
  };

  return (
    <>
      <Box className={`${classes.overlay} ${theme.palette.type === 'dark' ? classes.overlayDark : ''}`}>
        <Paper className={classes.contentContainer}>
          <LockIcon className={classes.lockIcon} />
          
          <Typography variant="h6" className={classes.title}>
            Conversa Bloqueada
          </Typography>
          
          <Typography variant="body2" className={classes.subtitle}>
            Este ticket está aguardando aceite. Aceite a conversa para visualizar 
            e responder às mensagens do cliente.
          </Typography>

          <div className={classes.statusChip}>
            <PendingIcon style={{ fontSize: 16 }} />
            Status: Aguardando
          </div>

          {/* Informações do Contato */}
          <div className={classes.contactInfo}>
            <Avatar
              src={contact?.urlPicture || contact?.profilePicUrl}
              alt={contact?.name}
              className={classes.contactAvatar}
            >
              {contact?.name?.charAt(0).toUpperCase()}
            </Avatar>
            <div className={classes.contactDetails}>
              <Typography className={classes.contactName}>
                {contact?.name || "Contato"}
              </Typography>
              <Typography className={classes.ticketId}>
                Ticket #{ticket?.id}
              </Typography>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className={classes.actionButtons}>
            <Button
              variant="contained"
              onClick={handleAcceptTicket}
              disabled={loading || isAccepting}
              className={classes.acceptButton}
              startIcon={loading || isAccepting ? <CircularProgress size={16} color="inherit" /> : <AcceptIcon />}
            >
              {loading || isAccepting ? 'Aceitando...' : 'Aceitar Conversa'}
            </Button>
          </div>

          <Typography className={classes.warningText}>
          🚫 Você não pode visualizar as mensagens antes de aceitar o ticket
          </Typography>
        </Paper>
      </Box>

      {/* ✅ MODAL PARA SELECIONAR FILA QUANDO TICKET NÃO TEM FILA */}
      {acceptTicketWithouSelectQueueOpen && (
        <AcceptTicketWithouSelectQueue
          modalOpen={acceptTicketWithouSelectQueueOpen}
          onClose={handleCloseAcceptTicketWithouSelectQueue}
          ticketId={ticket.id}
          ticket={ticket}
        />
      )}
    </>
  );
};

export default PendingTicketOverlay;
