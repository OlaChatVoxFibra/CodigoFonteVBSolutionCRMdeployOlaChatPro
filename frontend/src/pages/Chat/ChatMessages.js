/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  Button,
  ClickAwayListener,
  FormControl,
  IconButton,
  Input,
  InputAdornment,
  makeStyles,
  Paper,
  Typography,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
} from "@material-ui/core";
import MoodIcon from "@material-ui/icons/Mood";
import SendIcon from "@material-ui/icons/Send";
import { Picker } from "emoji-mart";
import "emoji-mart/css/emoji-mart.css";
import React, {
  Fragment,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { AuthContext } from "../../context/Auth/AuthContext";
import { useDate } from "../../hooks/useDate";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";

import { GetApp } from "@mui/icons-material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import MicIcon from "@mui/icons-material/Mic";
import CircularProgress from "@mui/material/CircularProgress";
import { green } from "@mui/material/colors";
import MicRecorder from "mic-recorder-to-mp3";
import MarkdownWrapper from "../../components/MarkdownWrapper";
import RecordingTimer from "../../components/MessageInput/RecordingTimer";
import ModalImageCors from "../../components/ModalImageCors";
import toastError from "../../errors/toastError";
import AudioModal from "../../components/AudioModal";
import DocumentModal from "../../components/DocumentModal";

import whatsBackground from "../../assets/wa-background.png";
import whatsBackgroundDark from "../../assets/wa-background-dark.png";
import { format, isSameDay, parseISO } from "date-fns";
import ReplyIcon from "@mui/icons-material/Reply";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ForwardIcon from "@mui/icons-material/Forward";
import IosShareIcon from "@mui/icons-material/IosShare";

const useStyles = makeStyles((theme) => ({
  mainContainer: {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    flex: 1,
    overflow: "hidden",
    borderRadius: 0,
    height: "100%",
    borderLeft: "1px solid rgba(0, 0, 0, 0.12)",
  },
  messageList: {
    position: "relative",
    overflowY: "auto",
    height: "100%",
    ...theme.scrollbarStyles,
    backgroundImage:
      theme.mode === "light"
        ? `url(${whatsBackground})`
        : `url(${whatsBackgroundDark})`,
    backgroundColor: theme.mode === "light" ? "transparent" : theme.palette.background.default,
  },
  inputArea: {
    position: "relative",
    height: "auto",
  },
  input: {
    padding: "20px",
  },
  buttonSend: {
    margin: theme.spacing(1),
  },
  messageContainer: {
    display: "flex",
    margin: "10px",
    alignItems: "center",
  },
  messageContainerSelf: {
    display: "flex",
    margin: "10px",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  messageContainerWithAvatar: {
    display: "flex",
    margin: "10px",
    alignItems: "flex-start",
  },
  avatarContainer: {
    marginRight: 10,
    display: "flex",
    alignItems: "center",
    alignSelf: "center",
  },
  messageBubble: {
    padding: "15px",
    position: "relative",
    backgroundColor: "#ffffff",
    color: "#303030",
    maxWidth: 350,
    width: "100%",
    borderRadius: 20,
    border: "1px solid rgba(0, 0, 0, 0.12)",
  },
  messageBubbleSelf: {
    padding: "15px",
    position: "relative",
    backgroundColor: "#dcf8c6",
    color: "#303030",
    maxWidth: 350,
    width: "100%",
    borderRadius: 20,
    border: "1px solid rgba(0, 0, 0, 0.12)",
  },
  bubbleContent: {
    marginTop: 5,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    overflowWrap: "break-word",
  },
  senderInfo: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  senderName: {
    fontWeight: "bold",
  },
  sendMessageIcons: {
    color: "grey",
  },
  uploadInput: {
    display: "none",
  },
  circleLoading: {
    color: green[500],
    opacity: "70%",
    position: "absolute",
    top: "20%",
    left: "50%",
    marginLeft: -12,
  },
  viewMediaInputWrapper: {
    display: "flex",
    padding: "10px 13px",
    position: "relative",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#eee",
    borderTop: "1px solid rgba(0, 0, 0, 0.12)",
  },
  downloadMedia: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "inherit",
    padding: 10,
  },
  messageMedia: {
    objectFit: "cover",
    width: 250,
    height: 200,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  recorderWrapper: {
    display: "flex",
    alignItems: "center",
    alignContent: "middle",
    justifyContent: "flex-end",
  },
  cancelAudioIcon: {
    color: "red",
  },
  audioLoading: {
    color: green[500],
    opacity: "70%",
  },
  sendAudioIcon: {
    color: "green",
  },
  messageDate: {
    fontSize: "0.75rem",
    color: "#666",
    marginTop: 5,
  },
  emojiBox: {
    position: "absolute",
    bottom: 63,
    left: 10,
    zIndex: 1000,
  },
  sendMessageIcons: {
    color: "grey",
  },
  dailyTimestampText: {
    color: "#808888",
    padding: 8,
    textAlign: "center",
    width: "100%",
    display: "block",
    margin: "0 auto",
  },
  replyContainer: {
    display: "flex",
    alignItems: "center",
    padding: "8px 16px",
    backgroundColor: "#f0f2f5",
    borderTop: "1px solid rgba(0, 0, 0, 0.12)",
  },
  replyContent: {
    flex: 1,
    marginLeft: 8,
  },
  replyText: {
    fontSize: "0.875rem",
    color: "#666",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  replySender: {
    fontSize: "0.75rem",
    color: "#999",
  },
  messageActions: {
    display: "flex",
    gap: 4,
    marginLeft: 8,
  },
  replyPreview: {
    borderLeft: "3px solid #128C7E",
    paddingLeft: "8px",
    marginBottom: "8px",
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: "4px",
    padding: "4px 8px",
  },
  replyPreviewSender: {
    fontSize: "0.75rem",
    color: "#128C7E",
    fontWeight: "bold",
  },
  replyPreviewText: {
    fontSize: "0.75rem",
    color: "#666",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  dailyTimestamp: {
    width: "100%",
    display: "block",
  },
  highlightedMessage: {
    backgroundColor: "#ffe082",
    transition: "background 0.5s",
  },
  forwardedMessage: {
    // borderLeft: "3px solid #128C7E",
    // paddingLeft: "8px",
    // marginBottom: "8px",
    // backgroundColor: "rgba(0, 0, 0, 0.05)",
    // borderRadius: "4px",
    // padding: "4px 8px",
  },
  forwardedMessageHeader: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    color: "#999",
    fontSize: "0.75rem",
    marginBottom: "4px",
  },
  forwardedMessageText: {
    // fontSize: "0.875rem",
    // color: "#666",
  },
}));

const Mp3Recorder = new MicRecorder({ bitRate: 128 });

export default function ChatMessages({
  chat,
  messages,
  handleSendMessage,
  handleLoadMore,
  scrollToBottomRef,
  pageInfo,
  loadingMore,
  onEdit,
  onDelete,
  onForward,
  // messageListRef,
  // isFirstPage,
  justOpenedChat,
  setJustOpenedChat,
  addOptimisticMessage,
}) {
  const topRef = useRef(null);

  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const { datetimeToClient } = useDate();
  const baseRef = useRef();
  const messageRefs = useRef({});

  const [contentMessage, setContentMessage] = useState("");
  const [medias, setMedias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef();
  const [replyingTo, setReplyingTo] = useState(null);
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const [canLoadMore, setCanLoadMore] = useState(false);

  const scrollToBottom = () => {
    if (baseRef.current) {
      baseRef.current.scrollIntoView({});
    }
  };

  const unreadMessages = (chat) => {
    if (chat && chat.users && Array.isArray(chat.users)) {
      const currentUser = chat.users.find((u) => u.userId === user.id);
      return currentUser && currentUser.unreads > 0;
    }
    return false;
  };

  useEffect(() => {
    if (justOpenedChat) {
      setInitialScrollDone(false);
    }
  }, [justOpenedChat]);

  useEffect(() => {
    if (chat && chat.id && unreadMessages(chat)) {
      try {
        api.post(`/chats/${chat.id}/read`, { userId: user.id });
      } catch (err) {
        console.error("Erro ao marcar mensagens como lidas:", err);
      }
    }
    scrollToBottomRef.current = scrollToBottom;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!messages || messages.length === 0 || loadingMore || initialScrollDone)
      return;

    const scrollToBottomSafely = () => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          const container = document.querySelector(".messageList");
          if (container) {
            container.scrollTop = container.scrollHeight;
            setInitialScrollDone(true);
          }
        }, 100); // Aumentar o timeout para dar tempo das mensagens renderizarem
      });
    };

    scrollToBottomSafely();
  }, [messages, loadingMore, initialScrollDone]);

  // Após o scroll automático inicial, liberar o carregamento incremental
  useEffect(() => {
    if (!loading && !loadingMore && initialScrollDone) {
      setCanLoadMore(true);
    }
  }, [loading, loadingMore, initialScrollDone]);

  // Adicionar um useEffect separado para quando justOpenedChat muda
  useEffect(() => {
    if (justOpenedChat && messages && messages.length > 0) {
      const scrollToBottomSafely = () => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            const container = document.querySelector(".messageList");
            if (container) {
              container.scrollTop = container.scrollHeight;
              setJustOpenedChat(false); // Resetar após executar o scroll
            }
          }, 200); // Timeout maior para garantir que tudo foi renderizado
        });
      };

      scrollToBottomSafely();
    }
  }, [justOpenedChat, messages]);

  const handleScroll = (e) => {
    if (!initialScrollDone || !canLoadMore) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

    if (!pageInfo?.hasMore || loading) return;

    if (scrollTop < 200) {
      console.log("Carregando mais mensagens... ScrollTop:", scrollTop);
      handleLoadMore();
    }
  };

  const handleChangeMedias = (e) => {
    if (!e.target.files) {
      return;
    }

    const selectedMedias = Array.from(e.target.files);
    setMedias(selectedMedias);
  };

  const handlePaste = (e) => {
    if (e.clipboardData.files.length > 0) {
      const selectedMedias = Array.from(e.clipboardData.files);
      setMedias(selectedMedias);
      e.preventDefault();
    }
  };

  const handleAddEmoji = (e) => {
    let emoji = e.native;
    setContentMessage((prevState) => prevState + emoji);
    inputRef.current.focus();
  };

  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  const checkMessageMedia = (message) => {
    if (message.mediaType === "image") {
      return <ModalImageCors imageUrl={message.mediaPath} />;
    }
    if (message.mediaType === "audio") {
      return (
        <AudioModal
          url={message.mediaPath}
          message={message}
          disableTranscription={!chat.isGroup}
        />
      );
    }
    if (message.mediaType === "video") {
      return (
        <video
          className={classes.messageMedia}
          src={message.mediaPath}
          controls
        />
      );
    } else {
      return (
        <>
          <div className={classes.downloadMedia}>
            <Button
              startIcon={<GetApp />}
              color="primary"
              variant="outlined"
              onClick={() => {
                setSelectedDocument(message);
                setDocumentModalOpen(true);
              }}
            >
              Visualizar Documento
            </Button>
          </div>
        </>
      );
    }
  };

  const handleSendMedia = async (e) => {
    setLoading(true);
    e.preventDefault();

    const formData = new FormData();
    formData.append("fromMe", true);
    medias.forEach((media) => {
      formData.append("typeArch", "chat");
      formData.append("fileId", chat.id);
      formData.append("medias", media);
      formData.append("body", media.name);
    });

    try {
      await api.post(`/chats/${chat.id}/messages`, formData);
    } catch (err) {
      console.log(err);
      toastError(err);
    }

    setLoading(false);
    setMedias([]);
  };

  const handleStartRecording = async () => {
    setLoading(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await Mp3Recorder.start();
      setRecording(true);
      setLoading(false);
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  const handleUploadAudio = async () => {
    setLoading(true);
    try {
      const [, blob] = await Mp3Recorder.stop().getMp3();

      if (blob.size < 10000) {
        setLoading(false);
        setRecording(false);
        return;
      }

      const formData = new FormData();
      const filename = `audio-${new Date().getTime()}.mp3`;
      formData.append("typeArch", "chat");
      formData.append("fileId", chat.id);
      formData.append("medias", blob, filename);
      formData.append("body", filename);
      formData.append("fromMe", true);

      await api.post(`/chats/${chat.id}/messages`, formData);
    } catch (err) {
      toastError(err);
    }

    setRecording(false);
    setLoading(false);
  };

  const handleCancelAudio = async () => {
    try {
      await Mp3Recorder.stop().getMp3();
      setRecording(false);
    } catch (err) {
      toastError(err);
    }
  };

  const handleReply = (message) => {
    setReplyingTo(message);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleSendMessageWithReply = async (content) => {
    if (content.trim() !== "") {
      // Adicione a mensagem localmente de forma otimista
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        chatId: chat.id,
        senderId: user.id,
        message: content,
        createdAt: new Date().toISOString(),
        sender: {
          id: user.id,
          name: user.name,
          profileImage: user.profileImage,
        },
        replyTo: replyingTo,
        isDeleted: false,
        isEdited: false,
        mediaType: "text",
      };
      addOptimisticMessage(optimisticMessage);
      setContentMessage("");
      setReplyingTo(null);
      await api.post(`/chats/${chat.id}/messages`, {
        message: content,
        replyToId: replyingTo?.id,
      });
      // O socket vai substituir a mensagem otimista pela real depois
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey && contentMessage.trim() !== "") {
      handleSendMessageWithReply(contentMessage);
    }
  };

  const handleSendClick = () => {
    if (contentMessage.trim() !== "") {
      handleSendMessageWithReply(contentMessage);
    }
  };

  const handleEdit = (message) => {
    onEdit(message);
  };

  const handleDelete = (message) => {
    onDelete(message);
  };

  const handleForward = (message) => {
    onForward(message);
  };

  const renderDailyTimestamps = (
    message,
    index,
    messagesList,
    lastMessageRef,
    classes
  ) => {
    const today = format(new Date(), "dd/MM/yyyy");

    if (index === 0) {
      return (
        <span
          className={classes.dailyTimestamp}
          key={`timestamp-${message.id}`}
        >
          <div className={classes.dailyTimestampText}>
            {today ===
            format(parseISO(messagesList[index].createdAt), "dd/MM/yyyy")
              ? "HOJE"
              : format(parseISO(messagesList[index].createdAt), "dd/MM/yyyy")}
          </div>
        </span>
      );
    } else if (index < messagesList.length - 1) {
      let messageDay = parseISO(messagesList[index].createdAt);
      let previousMessageDay = parseISO(messagesList[index - 1].createdAt);

      if (!isSameDay(messageDay, previousMessageDay)) {
        return (
          <span
            className={classes.dailyTimestamp}
            key={`timestamp-${message.id}`}
          >
            <div className={classes.dailyTimestampText}>
              {today ===
              format(parseISO(messagesList[index].createdAt), "dd/MM/yyyy")
                ? "HOJE"
                : format(parseISO(messagesList[index].createdAt), "dd/MM/yyyy")}
            </div>
          </span>
        );
      }
    } else if (index === messagesList.length - 1) {
      return (
        <div
          key={`ref-${message.id}`}
          ref={lastMessageRef}
          style={{ float: "left", clear: "both" }}
        />
      );
    }
  };

  const scrollToMessage = (messageId) => {
    const el = messageRefs.current[messageId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add(classes.highlightedMessage);
      setTimeout(() => el.classList.remove(classes.highlightedMessage), 1500);
    }
  };

  return (
    <>
      <Paper
        className={classes.paper}
        style={{ display: "flex", flexDirection: "column", height: "100%" }}
      >
        {/* Área de mensagens rolável com background */}
        <div
          className={`messageList ${classes.messageList}`}
          onScroll={handleScroll}
          style={{ flex: 1, minHeight: 0 }}
        >
          <div ref={topRef} style={{ height: 1 }} />
          {loadingMore && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "10px",
                position: "sticky",
                top: 0,
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                zIndex: 1,
              }}
            >
              <CircularProgress size={20} />
              <Typography
                variant="caption"
                style={{ marginLeft: 8, alignSelf: "center" }}
              >
                Carregando mensagens antigas...
              </Typography>
            </div>
          )}

          {Array.isArray(messages) &&
            messages.map((item, key) => {
              if (!item) return null;
              const repliedMessage = item.replyTo;

              return (
                <React.Fragment key={key}>
                  {renderDailyTimestamps(item, key, messages, baseRef, classes)}
                  <div
                    ref={(el) => (messageRefs.current[item.id] = el)}
                    className={
                      item.senderId === user.id
                        ? classes.messageContainerSelf
                        : classes.messageContainer
                    }
                    onDoubleClick={() => handleReply(item)}
                    title="Clique duas vezes para responder"
                  >
                    {item.senderId === user.id ? (
                      <div className={classes.messageBubbleSelf}>
                        <div className={classes.senderInfo}>
                          <Typography
                            variant="subtitle2"
                            className={classes.senderName}
                          >
                            {item.sender && item.sender.name
                              ? item.sender.name
                              : "Usuário"}{" "}
                            - {format(new Date(item.createdAt), "HH:mm")}
                          </Typography>
                          <div className={classes.messageActions}>
                            {(!item.isDeleted || user.profile === "admin") && (
                              <>
                                {item.senderId === user.id &&
                                  !item.isDeleted &&
                                  // Regra: só pode editar em até 10 minutos
                                  new Date() - new Date(item.createdAt) <
                                    10 * 60 * 1000 && (
                                    <IconButton
                                      size="small"
                                      onClick={() => handleEdit(item)}
                                      title={i18n.t("chatMessages.edit")}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  )}
                                <IconButton
                                  size="small"
                                  onClick={() => handleDelete(item)}
                                  title={i18n.t("chatMessages.delete")}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleForward(item)}
                                  title={i18n.t("chatMessages.forward")}
                                >
                                  <ForwardIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleReply(item)}
                                  title={i18n.t("chatMessages.reply")}
                                >
                                  <ReplyIcon fontSize="small" />
                                </IconButton>
                              </>
                            )}
                          </div>
                        </div>
                        <div className={classes.bubbleContent}>
                          {item.isDeleted && user.profile !== "admin" ? (
                            <Typography
                              variant="body2"
                              color="textSecondary"
                              style={{ fontStyle: "italic" }}
                            >
                              {i18n.t("chatMessages.deleted")}
                            </Typography>
                          ) : item.isDeleted && user.profile === "admin" ? (
                            <>
                              <Typography
                                variant="caption"
                                style={{
                                  color: "#888",
                                  fontStyle: "italic",
                                  display: "block",
                                  marginBottom: 4,
                                }}
                              >
                                {i18n.t("chatMessages.deletedAdmin")}
                              </Typography>
                              {item.mediaPath && checkMessageMedia(item)}
                              <MessageWithLineBreaks
                                text={item.message}
                                replyTo={repliedMessage}
                                scrollToMessage={scrollToMessage}
                                forwardedFrom={item.forwardedFrom}
                                checkMessageMedia={checkMessageMedia}
                              />
                            </>
                          ) : (
                            <>
                              {item.mediaPath && checkMessageMedia(item)}
                              <MessageWithLineBreaks
                                text={item.message}
                                replyTo={repliedMessage}
                                scrollToMessage={scrollToMessage}
                                forwardedFrom={item.forwardedFrom}
                                checkMessageMedia={checkMessageMedia}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className={classes.avatarContainer}>
                          <Avatar
                            src={
                              item.sender && item.sender.profileImage
                                ? `${process.env.REACT_APP_BACKEND_URL}/public/company${item.companyId}/user/${item.sender.profileImage}`
                                : undefined
                            }
                            alt={
                              item.sender && item.sender.name
                                ? item.sender.name
                                : "Usuário"
                            }
                          >
                            {(!item.sender || !item.sender.profileImage) &&
                              (item.sender && item.sender.name
                                ? item.sender.name.charAt(0)
                                : "?")}
                          </Avatar>
                        </div>
                        <div className={classes.messageBubble}>
                          <div className={classes.senderInfo}>
                            <Typography
                              variant="subtitle2"
                              className={classes.senderName}
                            >
                              {item.sender && item.sender.name
                                ? item.sender.name
                                : "Usuário"}{" "}
                              - {format(new Date(item.createdAt), "HH:mm")}
                            </Typography>
                            <div className={classes.messageActions}>
                              {(!item.isDeleted ||
                                user.profile === "admin") && (
                                <>
                                  {item.senderId === user.id &&
                                    !item.isDeleted &&
                                    // Regra: só pode editar em até 10 minutos
                                    new Date() - new Date(item.createdAt) <
                                      10 * 60 * 1000 && (
                                      <IconButton
                                        size="small"
                                        onClick={() => handleEdit(item)}
                                        title={i18n.t("chatMessages.edit")}
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    )}
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDelete(item)}
                                    title={i18n.t("chatMessages.delete")}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleForward(item)}
                                    title={i18n.t("chatMessages.forward")}
                                  >
                                    <ForwardIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleReply(item)}
                                    title={i18n.t("chatMessages.reply")}
                                  >
                                    <ReplyIcon fontSize="small" />
                                  </IconButton>
                                </>
                              )}
                            </div>
                          </div>
                          <div className={classes.bubbleContent}>
                            {item.isDeleted && user.profile !== "admin" ? (
                              <Typography
                                variant="body2"
                                color="textSecondary"
                                style={{ fontStyle: "italic" }}
                              >
                                {i18n.t("chatMessages.deleted")}
                              </Typography>
                            ) : item.isDeleted && user.profile === "admin" ? (
                              <>
                                <Typography
                                  variant="caption"
                                  style={{
                                    color: "#888",
                                    fontStyle: "italic",
                                    display: "block",
                                    marginBottom: 4,
                                  }}
                                >
                                  {i18n.t("chatMessages.deletedAdmin")}
                                </Typography>
                                {item.mediaPath && checkMessageMedia(item)}
                                <MessageWithLineBreaks
                                  text={item.message}
                                  replyTo={repliedMessage}
                                  scrollToMessage={scrollToMessage}
                                  forwardedFrom={item.forwardedFrom}
                                  checkMessageMedia={checkMessageMedia}
                                />
                              </>
                            ) : (
                              <>
                                {item.mediaPath && checkMessageMedia(item)}
                                <MessageWithLineBreaks
                                  text={item.message}
                                  replyTo={repliedMessage}
                                  scrollToMessage={scrollToMessage}
                                  forwardedFrom={item.forwardedFrom}
                                  checkMessageMedia={checkMessageMedia}
                                />
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </React.Fragment>
              );
            })}

          <div ref={baseRef}></div>
        </div>
        {/* Input fixo */}
        <div className={classes.inputArea} style={{ flexShrink: 0 }}>
          {replyingTo && (
            <div className={classes.replyContainer}>
              <div className={classes.replyContent}>
                <div className={classes.replySender}>
                  {i18n.t("chatMessages.replyingTo")} {replyingTo.sender.name}
                </div>
                <div className={classes.replyText}>{replyingTo.message}</div>
              </div>
              <IconButton size="small" onClick={handleCancelReply}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </div>
          )}
          <FormControl variant="outlined" fullWidth>
            {recording ? (
              <div className={classes.recorderWrapper}>
                <IconButton
                  aria-label="cancelRecording"
                  component="span"
                  fontSize="large"
                  disabled={loading}
                  onClick={handleCancelAudio}
                  size="large"
                >
                  <HighlightOffIcon className={classes.cancelAudioIcon} />
                </IconButton>
                {loading ? (
                  <div>
                    <CircularProgress className={classes.audioLoading} />
                  </div>
                ) : (
                  <RecordingTimer />
                )}

                <IconButton
                  aria-label="sendRecordedAudio"
                  component="span"
                  onClick={handleUploadAudio}
                  disabled={loading}
                  size="large"
                >
                  <CheckCircleOutlineIcon className={classes.sendAudioIcon} />
                </IconButton>
              </div>
            ) : (
              <>
                {medias.length > 0 ? (
                  <>
                    <Paper
                      elevation={0}
                      square
                      className={classes.viewMediaInputWrapper}
                    >
                      <IconButton
                        aria-label="cancel-upload"
                        component="span"
                        onClick={(e) => setMedias([])}
                        size="large"
                      >
                        <CancelIcon className={classes.sendMessageIcons} />
                      </IconButton>

                      {loading ? (
                        <div>
                          <CircularProgress className={classes.circleLoading} />
                        </div>
                      ) : (
                        <span>{medias[0]?.name}</span>
                      )}
                      <IconButton
                        aria-label="send-upload"
                        component="span"
                        onClick={handleSendMedia}
                        disabled={loading}
                        size="large"
                      >
                        <SendIcon className={classes.sendMessageIcons} />
                      </IconButton>
                    </Paper>
                  </>
                ) : (
                  <Fragment>
                    <Input
                      inputRef={inputRef}
                      multiline
                      value={contentMessage}
                      onKeyUp={handleKeyPress}
                      onChange={(e) => setContentMessage(e.target.value)}
                      onPaste={handlePaste}
                      className={classes.input}
                      startAdornment={
                        <InputAdornment position="start">
                          <IconButton
                            aria-label="emojiPicker"
                            component="span"
                            disabled={loading}
                            onClick={(e) =>
                              setShowEmoji((prevState) => !prevState)
                            }
                          >
                            <MoodIcon className={classes.sendMessageIcons} />
                          </IconButton>
                          {showEmoji ? (
                            <div className={classes.emojiBox}>
                              <ClickAwayListener
                                onClickAway={(e) => setShowEmoji(false)}
                              >
                                <Picker
                                  perLine={16}
                                  theme={"dark"}
                                  showPreview={true}
                                  showSkinTones={false}
                                  onSelect={handleAddEmoji}
                                />
                              </ClickAwayListener>
                            </div>
                          ) : null}
                          <FileInput
                            disableOption={loading}
                            handleChangeMedias={handleChangeMedias}
                          />
                        </InputAdornment>
                      }
                      endAdornment={
                        <InputAdornment position="end">
                          {contentMessage ? (
                            <IconButton
                              onClick={handleSendClick}
                              className={classes.buttonSend}
                              size="large"
                            >
                              <SendIcon />
                            </IconButton>
                          ) : (
                            <IconButton
                              aria-label="showRecorder"
                              component="span"
                              disabled={loading}
                              onClick={handleStartRecording}
                              size="large"
                            >
                              <MicIcon className={classes.sendMessageIcons} />
                            </IconButton>
                          )}
                        </InputAdornment>
                      }
                    />
                  </Fragment>
                )}
              </>
            )}
          </FormControl>
        </div>
      </Paper>

      <DocumentModal
        open={documentModalOpen}
        onClose={() => setDocumentModalOpen(false)}
        document={selectedDocument}
      />
    </>
  );
}

const FileInput = (props) => {
  const { handleChangeMedias, disableOption } = props;
  const classes = useStyles();
  return (
    <>
      <input
        multiple
        type="file"
        id="upload-button"
        disabled={disableOption}
        className={classes.uploadInput}
        onChange={handleChangeMedias}
      />
      <label htmlFor="upload-button">
        <IconButton
          aria-label="upload"
          component="span"
          disabled={disableOption}
          size="large"
        >
          <AttachFileIcon className={classes.sendMessageIcons} />
        </IconButton>
      </label>
    </>
  );
};

const MessageWithLineBreaks = ({
  text,
  replyTo,
  scrollToMessage,
  forwardedFrom,
  checkMessageMedia,
}) => {
  const classes = useStyles();

  if (!text && !replyTo && !forwardedFrom) return null;

  return (
    <div
      style={{
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        overflowWrap: "break-word",
        width: "100%",
      }}
    >
      {forwardedFrom && (
        <div className={classes.forwardedMessage}>
          <div className={classes.forwardedMessageHeader}>
            <span>{i18n.t("chatMessages.forwarded")}</span>
          </div>
          {forwardedFrom.mediaPath && checkMessageMedia(forwardedFrom)}
        </div>
      )}
      {replyTo && (
        <div
          className={classes.replyPreview}
          style={{ cursor: "pointer" }}
          onClick={() => scrollToMessage(replyTo.id)}
          title={i18n.t("chatMessages.clickToGoToOriginal")}
        >
          <div className={classes.replyPreviewSender}>
            {replyTo.sender?.name || "Mensagem"}
          </div>
          <div className={classes.replyPreviewText}>
            {replyTo.message || "[mensagem não encontrada]"}
          </div>
        </div>
      )}
      <MarkdownWrapper>{text}</MarkdownWrapper>
    </div>
  );
};
