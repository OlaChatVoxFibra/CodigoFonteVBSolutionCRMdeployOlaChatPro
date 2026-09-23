/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useContext } from "react";
import { Box, Button, Card, CircularProgress, Paper, Typography } from "@material-ui/core";
import ArrowBackIos from "@material-ui/icons/ArrowBackIos";
import MessagesList from "../MessagesList";
import MessageInput from "../MessageInput";
import TicketInfo from "../TicketInfo";
import TicketActionButtons from "../TicketActionButtonsCustom";
import { ReplyMessageProvider } from "../../context/ReplyingMessage/ReplyingMessageContext";
import { ForwardMessageProvider } from "../../context/ForwarMessage/ForwardMessageContext";
import { EditMessageProvider } from "../../context/EditingMessage/EditingMessageContext";
import { QueueSelectedProvider, QueueSelectedContext } from "../../context/QueuesSelected/QueuesSelectedContext";

const QueueSetter = ({ queueId }) => {
  const { setSelectedQueuesMessage } = useContext(QueueSelectedContext);
  React.useEffect(() => {
    if (!setSelectedQueuesMessage) return;
    if (queueId) setSelectedQueuesMessage([queueId]);
    else setSelectedQueuesMessage([]);
  }, [queueId, setSelectedQueuesMessage]);
  return null;
};

export default function LeadChatPane({
  classes,
  onClose,
  ticket,
  ticketLoading,
  selectedContact,
  setDrawerOpen,
  compactHeader,
  fillHeight
}) {
  return (
    <div className={fillHeight ? classes.chatPaneFill : undefined}>
      <Card
        square
        className={`${classes.ticketHeader} ${compactHeader ? classes.ticketHeaderCompact : ""}`}
      >
        {!compactHeader && (
          <Button color="primary" onClick={onClose} size="small">
            <ArrowBackIos fontSize="small" />
          </Button>
        )}
        <Box display="flex" alignItems="center" width="100%" minWidth={0}>
          {(ticket?.contact || selectedContact) && (
            <Box id="TicketHeader" flex={1} minWidth={0} overflow="hidden">
              <TicketInfo
                contact={ticket?.contact || selectedContact}
                ticket={ticket || {}}
                onClick={() => setDrawerOpen?.(true)}
              />
            </Box>
          )}
          {ticket && (
            <Box flex="none" ml={1}>
              <TicketActionButtons
                ticket={ticket}
                contact={ticket?.contact}
                onQuickMessageSelect={(quickMessage) => {
                  try {
                    if (quickMessage?.message) {
                      window.dispatchEvent(
                        new CustomEvent("insertQuickMessage", {
                          detail: { message: quickMessage.message }
                        })
                      );
                    }
                  } catch (e) {
                    /* ignore */
                  }
                }}
              />
            </Box>
          )}
        </Box>
      </Card>
      <div className={compactHeader ? classes.chatBodyEmbedded : classes.chatBody}>
        {ticketLoading ? (
          <Box display="flex" alignItems="center" justifyContent="center" height="100%">
            <CircularProgress size={28} />
          </Box>
        ) : ticket ? (
          <ReplyMessageProvider>
            <ForwardMessageProvider>
              <EditMessageProvider>
                <QueueSelectedProvider>
                  <QueueSetter queueId={ticket.queueId} />
                  <div className={classes.chatConversationStack}>
                    <div className={compactHeader ? classes.chatMessagesScroll : undefined}>
                      <MessagesList
                        isGroup={ticket.isGroup}
                        onDrop={() => {}}
                        whatsappId={ticket.whatsappId}
                        queueId={ticket.queueId}
                        channel={ticket.channel}
                        ticketStatus={ticket.status}
                        ticketIdOverride={ticket.uuid}
                        ticketInternalId={ticket.id}
                        ticketIsBot={ticket.isBot}
                        ticketUseIntegration={ticket.useIntegration}
                        ticketUserId={ticket.userId}
                        fillParent={Boolean(compactHeader)}
                      />
                    </div>
                    <MessageInput
                      ticketId={ticket.id}
                      ticketStatus={ticket.status}
                      ticketChannel={ticket.channel}
                      droppedFiles={[]}
                      contactId={ticket.contact?.id}
                      whatsappId={ticket.whatsappId}
                      disableAutoFocus
                      allowAiWhileClosed
                      edgeToEdge
                    />
                  </div>
                </QueueSelectedProvider>
              </EditMessageProvider>
            </ForwardMessageProvider>
          </ReplyMessageProvider>
        ) : (
          <Paper style={{ margin: 12, padding: 14 }} variant="outlined">
            <Typography variant="body2" color="textSecondary">
              Nenhuma conversa encontrada para este contato.
            </Typography>
          </Paper>
        )}
      </div>
    </div>
  );
}
