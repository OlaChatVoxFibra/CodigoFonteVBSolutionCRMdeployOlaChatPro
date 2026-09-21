/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useContext, useEffect, useRef } from "react";
import { useHistory } from "react-router-dom";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  makeStyles,
  MenuItem,
  Select,
} from "@material-ui/core";
import { v4 as uuidv4 } from "uuid";

import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import ButtonWithSpinner from "../ButtonWithSpinner";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import { Form, Formik } from "formik";
import ShowTicketOpen from "../ShowTicketOpenModal";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import { TicketsContext } from "../../context/Tickets/TicketsContext";
import { toast } from "react-toastify";
import { renderAcceptedTicketGreeting } from "../../utils/variableUtils";
import { buildAcceptTicketPayload } from "../../utils/acceptTicketPayload";

// const filter = createFilterOptions({
// 	trim: true,
// });

const useStyles = makeStyles((theme) => ({
  autoComplete: {
    width: 300,
    // marginBottom: 20
  },
  maxWidth: {
    width: "100%",
  },
  buttonColorError: {
    color: theme.palette.error.main,
    borderColor: theme.palette.error.main,
  },
}));

const AcceptTicketWithouSelectQueue = ({
  modalOpen,
  onClose,
  ticketId,
  ticket,
}) => {
  const history = useHistory();
  const classes = useStyles();
  const [selectedQueue, setSelectedQueue] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useContext(AuthContext);
  const [openAlert, setOpenAlert] = useState(false);
  const [userTicketOpen, setUserTicketOpen] = useState("");
  const [queueTicketOpen, setQueueTicketOpen] = useState("");
  const { tabOpen, setTabOpen } = useContext(TicketsContext);
  const isMounted = useRef(true);

  const { get: getSetting } = useCompanySettings();

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    try {
      if (user.queues.length === 1) {
        if (isMounted.current) {
          setSelectedQueue(user.queues[0].id);
        }
      }
    } catch (err) {
      if (isMounted.current) {
        setLoading(false);
      }
      toastError(err);
    }
  }, [selectedQueue]);

  const handleClose = () => {
    onClose();
    if (isMounted.current) {
      setSelectedQueue("");
    }
  };

  const handleCloseAlert = () => {
    if (isMounted.current) {
      setOpenAlert(false);
      setLoading(false);
    }
  };

  const handleSendMessage = async (id) => {
    let isGreetingMessage = false;

    try {
      const setting = await getSetting({
        column: "sendGreetingAccepted",
      });
      if (setting.sendGreetingAccepted === "enabled") isGreetingMessage = true;
    } catch (err) {
      toastError(err);
    }

    let settingMessage;
    try {
      settingMessage = await getSetting({
        column: "greetingAcceptedMessage",
      });
    } catch (err) {
      toastError(err);
    }

    if (
      isGreetingMessage &&
      (!ticket.isGroup || ticket.whatsapp?.groupAsTicket === "enabled") &&
      ticket.status === "pending"
    ) {
      const msg = renderAcceptedTicketGreeting(
        `${settingMessage.greetingAcceptedMessage}`,
        user
      );

      if (!settingMessage.greetingAcceptedMessage) {
        toast.warning(
          i18n.t("messagesList.header.buttons.greetingAcceptedMessage")
        );
        return;
      }

      const message = {
        read: 1,
        fromMe: true,
        mediaUrl: "",
        body: `${msg.trim()}`,
      };
      try {
        await api.post(`/messages/${id}`, message);
      } catch (err) {
        toastError(err);
      }
    }
  };

  const handleUpdateTicketStatus = async (queueId) => {
    if (isMounted.current) {
      setLoading(true);
    }
    try {
      const otherTicket = await api.put(`/tickets/${ticketId}`, {
        ...buildAcceptTicketPayload(ticket, user?.id),
        queueId: queueId,
      });

      if (otherTicket.data.id !== ticket.id) {
        if (otherTicket.data.userId !== user?.id) {
          if (isMounted.current) {
            setOpenAlert(true);
            setUserTicketOpen(otherTicket.data.user.name);
            setQueueTicketOpen(otherTicket.data.queue.name);
          }
        } else {
          if (isMounted.current) {
            setLoading(false);
            setTabOpen(otherTicket.isGroup ? "group" : "open");
          }
          history.push(`/tickets/${otherTicket.data.uuid}`);
        }
      } else {
        handleSendMessage(ticket.id);
        if (isMounted.current) {
          setLoading(false);
          setTabOpen(ticket.isGroup ? "group" : "open");
        }
        history.push(`/tickets/${ticket.uuid}`);
        handleClose();
      }
    } catch (err) {
      if (isMounted.current) {
        setLoading(false);
      }
      toastError(err);
    }
  };

  return (
    <>
      <Dialog open={modalOpen} onClose={handleClose}>
        <DialogTitle id="form-dialog-title">
          {i18n.t("ticketsList.acceptModal.title")}
        </DialogTitle>
        <DialogContent dividers>
          <FormControl variant="outlined" className={classes.maxWidth}>
            <InputLabel>{i18n.t("ticketsList.acceptModal.queue")}</InputLabel>
            <Select
              value={selectedQueue}
              className={classes.autoComplete}
              onChange={(e) => setSelectedQueue(e.target.value)}
              label={i18n.t("ticketsList.acceptModal.queue")}
            >
              <MenuItem value={""}>&nbsp;</MenuItem>
              {user.queues.map((queue) => (
                <MenuItem key={queue.id} value={queue.id}>
                  {queue.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleClose}
            className={classes.buttonColorError}
            disabled={loading}
            variant="outlined"
          >
            {i18n.t("ticketsList.buttons.cancel")}
          </Button>
          <ButtonWithSpinner
            variant="contained"
            type="button"
            disabled={selectedQueue === ""}
            onClick={() => handleUpdateTicketStatus(selectedQueue)}
            color="primary"
            loading={loading}
          >
            {i18n.t("ticketsList.buttons.start")}
          </ButtonWithSpinner>
        </DialogActions>
        <ShowTicketOpen
          isOpen={openAlert}
          handleClose={handleCloseAlert}
          user={userTicketOpen}
          queue={queueTicketOpen}
        />
      </Dialog>
    </>
  );
};

export default AcceptTicketWithouSelectQueue;
