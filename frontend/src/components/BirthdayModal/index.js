/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Paper,
  Box,
  Fade,
  Slide
} from "@material-ui/core";
import {
  Cake as CakeIcon,
  Send as SendIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Close as CloseIcon
} from "@material-ui/icons";
import { toast } from "react-toastify";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles((theme) => ({
  dialog: {
    "& .MuiDialog-paper": {
      borderRadius: 16,
      maxWidth: 600,
      width: "90%",
      overflow: "hidden"
    }
  },
  header: {
    background: "linear-gradient(135deg, #ff6b6b 0%, #feca57 50%, #48dbfb 100%)",
    padding: theme.spacing(4, 3),
    textAlign: "center",
    position: "relative",
    overflow: "hidden",
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M30 30c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20zm15 0c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      opacity: 0.3
    }
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: theme.spacing(2),
    animation: "$rotate 2s linear infinite"
  },
  headerTitle: {
    color: "white",
    fontWeight: 700,
    fontSize: "1.8rem",
    textShadow: "0 2px 4px rgba(0,0,0,0.2)",
    marginBottom: theme.spacing(1),
    position: "relative",
    zIndex: 1
  },
  headerSubtitle: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: "1rem",
    position: "relative",
    zIndex: 1
  },
  content: {
    padding: theme.spacing(3),
    maxHeight: "60vh",
    overflowY: "auto"
  },
  birthdayList: {
    width: "100%"
  },
  birthdayItem: {
    marginBottom: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 12,
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    transition: "all 0.3s ease",
    "&:hover": {
      transform: "translateX(4px)",
      boxShadow: theme.shadows[4]
    }
  },
  birthdayItemUser: {
    borderLeft: `4px solid ${theme.palette.secondary.main}`,
    background: "linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%)"
  },
  avatar: {
    width: 56,
    height: 56,
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    position: "relative",
    "&::after": {
      content: '"🎂"',
      position: "absolute",
      bottom: -2,
      right: -2,
      fontSize: 16,
      background: "white",
      borderRadius: "50%",
      padding: 2,
      lineHeight: 1
    }
  },
  avatarUser: {
    background: "linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)",
    animation: "$birthdayPulse 2s infinite"
  },
  personName: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: theme.palette.text.primary,
    marginBottom: 4
  },
  personType: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    color: theme.palette.text.secondary,
    fontSize: "0.875rem"
  },
  ageChip: {
    backgroundColor: theme.palette.primary.main,
    color: "white",
    fontWeight: "bold",
    fontSize: "0.875rem",
    "& .MuiChip-icon": {
      color: "white"
    }
  },
  sendButton: {
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "white",
    minWidth: 120,
    fontWeight: 600,
    textTransform: "none",
    borderRadius: 8,
    transition: "all 0.3s ease",
    "&:hover": {
      transform: "translateY(-1px)",
      boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)"
    },
    "&:disabled": {
      background: "#9ca3af",
      color: "white"
    }
  },
  actions: {
    padding: theme.spacing(2, 3),
    borderTop: `1px solid ${theme.palette.divider}`,
    justifyContent: "space-between"
  },
  actionButton: {
    textTransform: "none",
    fontWeight: 600,
    borderRadius: 8,
    minWidth: 120
  },
  closeButton: {
    position: "absolute",
    top: theme.spacing(1),
    right: theme.spacing(1),
    color: "rgba(255, 255, 255, 0.8)",
    zIndex: 2,
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.1)"
    }
  },
  noDataMessage: {
    textAlign: "center",
    padding: theme.spacing(4),
    color: theme.palette.text.secondary
  },
  // Animações
  "@keyframes rotate": {
    from: { transform: "rotate(0deg)" },
    to: { transform: "rotate(360deg)" }
  },
  "@keyframes birthdayPulse": {
    "0%, 100%": { 
      transform: "scale(1)",
      boxShadow: "0 0 20px rgba(255, 107, 107, 0.5)"
    },
    "50%": { 
      transform: "scale(1.05)",
      boxShadow: "0 0 30px rgba(255, 107, 107, 0.8)"
    }
  }
}));

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const BirthdayModal = ({ open, onClose, user }) => {
  const classes = useStyles();
  const [birthdayData, setBirthdayData] = useState({ users: [], contacts: [], settings: null });
  const [loading, setLoading] = useState(false);
  const [sendingMessages, setSendingMessages] = useState(new Set());

  useEffect(() => {
    if (open) {
      fetchTodayBirthdays();
    }
  }, [open]);

  const fetchTodayBirthdays = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/birthdays/today");
      setBirthdayData(data.data);
    } catch (error) {
      toast.error("Erro ao carregar aniversariantes");
    } finally {
      setLoading(false);
    }
  };

  const handleSendBirthdayMessage = async (contactId, contactName) => {
    setSendingMessages(prev => new Set([...prev, contactId]));
    
    try {
      await api.post("/birthdays/send-message", { contactId });
      toast.success(`Mensagem de parabéns enviada para ${contactName}! 🎉`);
      
      // Atualizar o estado local para marcar como enviada
      setBirthdayData(prev => ({
        ...prev,
        contacts: prev.contacts.map(contact => 
          contact.id === contactId 
            ? { ...contact, messageSent: true }
            : contact
        )
      }));
    } catch (error) {
      // Verificar se é erro de mensagem já enviada
      if (error.response?.status === 409) {
        toast.warning("Mensagem de aniversário já foi enviada hoje para este contato");
        
        // Atualizar o estado local para marcar como enviada
        setBirthdayData(prev => ({
          ...prev,
          contacts: prev.contacts.map(contact => 
            contact.id === contactId 
              ? { ...contact, messageSent: true }
              : contact
          )
        }));
      } else {
        toast.error("Erro ao enviar mensagem de aniversário");
      }
    } finally {
      setSendingMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(contactId);
        return newSet;
      });
    }
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatAge = (age) => {
    if (!age) return "N/A";
    return `${age} ano${age !== 1 ? 's' : ''}`;
  };

  const hasBirthdays = birthdayData.users.length > 0 || birthdayData.contacts.length > 0;

  if (!hasBirthdays && !loading) {
    return null; // Não mostrar modal se não há aniversariantes
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className={classes.dialog}
      TransitionComponent={Transition}
      maxWidth="md"
      fullWidth
    >
      {/* Header festivo */}
      <Box className={classes.header}>
        <IconButton className={classes.closeButton} onClick={onClose}>
          <CloseIcon />
        </IconButton>
        
        <CakeIcon className={classes.headerIcon} />
        <Typography variant="h4" className={classes.headerTitle}>
          🎉 Parabéns!
        </Typography>
        <Typography className={classes.headerSubtitle}>
          Hoje é um dia especial!
        </Typography>
      </Box>

      {/* Content */}
      <DialogContent className={classes.content}>
        {loading ? (
          <Box className={classes.noDataMessage}>
            <Typography>Carregando aniversariantes...</Typography>
          </Box>
        ) : (
          <List className={classes.birthdayList}>
            {/* Aniversariantes Usuários */}
            {birthdayData.users.map((birthdayUser) => (
              <ListItem 
                key={`user-${birthdayUser.id}`}
                className={`${classes.birthdayItem} ${classes.birthdayItemUser}`}
              >
                <ListItemAvatar>
                  <Avatar className={`${classes.avatar} ${classes.avatarUser}`}>
                    {getInitials(birthdayUser.name)}
                  </Avatar>
                </ListItemAvatar>
                
                <ListItemText
                  primary={
                    <Typography className={classes.personName}>
                      {birthdayUser.name}
                      {birthdayUser.id === user?.id && " (Você!)"}
                    </Typography>
                  }
                  secondary={
                    <Box className={classes.personType}>
                      <PersonIcon fontSize="small" />
                      <span>Usuário do Sistema</span>
                    </Box>
                  }
                />
                
                <ListItemSecondaryAction>
                  <Chip
                    icon={<CakeIcon />}
                    label={formatAge(birthdayUser.age)}
                    className={classes.ageChip}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}

            {/* Aniversariantes Contatos */}
            {birthdayData.contacts.map((birthdayContact) => (
              <ListItem 
                key={`contact-${birthdayContact.id}`}
                className={classes.birthdayItem}
              >
                <ListItemAvatar>
                  <Avatar className={classes.avatar}>
                    {getInitials(birthdayContact.name)}
                  </Avatar>
                </ListItemAvatar>
                
                <ListItemText
                  primary={
                    <Typography className={classes.personName}>
                      {birthdayContact.name}
                    </Typography>
                  }
                  secondary={
                    <Box className={classes.personType}>
                      <PhoneIcon fontSize="small" />
                      <span>Contato</span>
                      <Chip
                        icon={<CakeIcon />}
                        label={formatAge(birthdayContact.age)}
                        size="small"
                        style={{ marginLeft: 8 }}
                      />
                    </Box>
                  }
                />
                
                <ListItemSecondaryAction>
                  <Button
                    variant="contained"
                    className={classes.sendButton}
                    startIcon={<SendIcon />}
                    onClick={() => handleSendBirthdayMessage(
                      birthdayContact.id, 
                      birthdayContact.name
                    )}
                    disabled={
                      sendingMessages.has(birthdayContact.id) || 
                      birthdayContact.messageSent
                    }
                  >
                    {sendingMessages.has(birthdayContact.id) 
                      ? "Enviando..." 
                      : birthdayContact.messageSent
                      ? "Mensagem já enviada"
                      : "Enviar Parabéns"
                    }
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>

      {/* Actions */}
      <DialogActions className={classes.actions}>
        <Button 
          onClick={onClose} 
          color="default"
          className={classes.actionButton}
          variant="outlined"
        >
          Lembrar mais tarde
        </Button>
        <Button 
          onClick={onClose} 
          color="primary"
          className={classes.actionButton}
          variant="contained"
        >
          Entendi, obrigado!
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BirthdayModal;