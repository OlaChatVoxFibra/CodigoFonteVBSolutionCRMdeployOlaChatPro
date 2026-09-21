/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useContext, useEffect, useRef, useState } from "react";

import { useParams, useHistory } from "react-router-dom";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  makeStyles,
  Paper,
  Tab,
  Tabs,
  TextField,
  Chip,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Badge,
  Avatar,
  IconButton,
} from "@material-ui/core";
import ChatList from "./ChatList";
import ChatMessages from "./ChatMessages";
import { UsersFilter } from "../../components/UsersFilter";
import api from "../../services/api";
import useResponsive from "../../utils/useResponsive";
import { socketConnection, resolveSocketCompanyId } from "../../services/socket";
import { has, isObject } from "lodash";
import { getBackendUrl } from "../../config";

import { AuthContext } from "../../context/Auth/AuthContext";
import { i18n } from "../../translate/i18n";
import { toast } from "react-hot-toast";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import ActivitiesStyleLayout from "../../components/ActivitiesStyleLayout";

// FIXME checkout https://mui.com/components/use-media-query/#migrating-from-withwidth
const withWidth = () => (WrappedComponent) => (props) =>
  <WrappedComponent {...props} width="xs" />;

const useStyles = makeStyles((theme) => ({
  mainContainer: {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    flex: 1,
    padding: theme.spacing(2),
    height: `calc(100% - 48px)`,
    overflowY: "hidden",
    border: "1px solid rgba(0, 0, 0, 0.12)",
  },
  gridContainer: {
    flex: 1,
    height: "100%",
    border: "1px solid rgba(0, 0, 0, 0.12)",
    background: theme.palette.background.color,
  },
  gridItem: {
    height: "100%",
  },
  gridItemTab: {
    height: "92%",
    width: "100%",
  },
  btnContainer: {
    textAlign: "right",
    padding: 10,
  },
}));

export function ChatModal({
  open,
  chat,
  type,
  handleClose,
  handleLoadNewChat,
  findChats,
  setChats,
  setChatsPageInfo,
  chats,
  loggedInUserId,
}) {
  const [users, setUsers] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [groupImage, setGroupImage] = useState("");
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      setUsers([]);
      setDescription("");
      setGroupImage("");
      setImageFile(null);
      if (type === "edit" && chat && chat.users) {
        const userList = chat.users.map((u) => ({
          id: u.user.id,
          name: u.user.name,
        }));
        setUsers(userList);
        setTitle(chat.title || "");
        setDescription(chat.description || "");
        if (chat.groupImage) {
          setGroupImage(chat.groupImage);
        }
      }
    }
  }, [chat, open, type]);

  // const handleImageChange = (e) => {
  //   if (e.target.files && e.target.files[0]) {
  //     setImageFile(e.target.files[0]);
  //     setGroupImage(URL.createObjectURL(e.target.files[0]));
  //   }
  // };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      setImageFile(file);
      setGroupImage(previewUrl);
      console.log("Preview URL:", previewUrl);
    }
  };

  const handleSave = async () => {
    try {
      let uploadedImageUrl = groupImage;
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        const uploadRes = await api.post("/chats/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        uploadedImageUrl = uploadRes.data.url;
      }

      if (type === "edit" && chat) {
        const { data } = await api.put(`/chats/${chat.id}`, {
          users,
          title,
          description,
          groupImage: uploadedImageUrl,
        });
        handleLoadNewChat(data);
      } else {
        const isCreatingGroup = users.length > 1 || title !== "";
        console.log("isCreatingGroup:", isCreatingGroup);

        if (!isCreatingGroup) {
          const selectedUserId = users[0]?.id;
          console.log("selectedUserId:", selectedUserId);
          console.log("loggedInUserId:", loggedInUserId);
          console.log("chats available:", chats);

          const existingChat = chats.find((c) => {
            const hasSelectedUser = c.users.some(
              (u) => u.userId === selectedUserId
            );
            const hasLoggedInUser = c.users.some(
              (u) => u.userId === loggedInUserId
            );
            const isIndividualChat = !c.isGroup && c.users.length === 2;

            console.log(
              `Checking chat ${c.id}: isIndividualChat=${isIndividualChat}, hasSelectedUser=${hasSelectedUser}, hasLoggedInUser=${hasLoggedInUser}`
            );

            return isIndividualChat && hasSelectedUser && hasLoggedInUser;
          });

          console.log("Found existingChat:", existingChat);

          if (existingChat) {
            toast.info("Chat com este usuário já existe!");
            handleLoadNewChat(existingChat);
            handleClose();
            return;
          }
        }

        // Garantir que o criador sempre esteja incluso como participante
        const usersWithCreator = (() => {
          const map = new Map();
          if (Array.isArray(users)) {
            users.forEach((u) => {
              const val = u && (u.id ?? u.userId);
              if (val !== undefined && val !== null) {
                map.set(String(val), { id: val });
              }
            });
          }
          if (loggedInUserId !== undefined && loggedInUserId !== null) {
            const val = loggedInUserId;
            map.set(String(val), { id: val });
          }
          return Array.from(map.values());
        })();

        const { data } = await api.post("/chats", {
          users: usersWithCreator,
          title,
          description,
          groupImage: uploadedImageUrl,
          isGroup: isCreatingGroup,
        });
        try {
          await api.post(`/chats/${data.id}/messages`, { message: "Chat criado" });
        } catch (e) {
        }
        handleLoadNewChat(data);
      }
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar/editar chat");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">
        {type === "edit"
          ? i18n.t("chatIndex.modal.editTitle") || "Editar Grupo"
          : i18n.t("chatIndex.modal.title") || "Criar Grupo"}
      </DialogTitle>
      <DialogContent>
        <Grid spacing={2} container>
          <Grid xs={12} style={{ padding: 18, textAlign: "center" }} item>
            <input
              accept="image/*"
              style={{ display: "none" }}
              id="group-image-upload"
              type="file"
              onChange={handleImageChange}
            />
            <label htmlFor="group-image-upload">
              <Button variant="outlined" color="primary" component="span">
                {groupImage
                  ? "Alterar Foto do Grupo"
                  : "Adicionar Foto do Grupo"}
              </Button>
            </label>
            {groupImage && (
              <>
                <div style={{ marginTop: 10 }}>
                  <img
                    src={
                      typeof groupImage === "string"
                        ? groupImage.startsWith("http") ||
                          groupImage.startsWith("blob:")
                          ? groupImage
                          : `${getBackendUrl()}${groupImage}`
                        : URL.createObjectURL(groupImage)
                    }
                    alt="Group"
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                </div>
              </>
            )}
          </Grid>
          <Grid xs={12} style={{ padding: 18 }} item>
            <TextField
              label="Título"
              placeholder="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              variant="outlined"
              size="small"
              fullWidth
            />
          </Grid>
          <Grid xs={12} style={{ padding: 18 }} item>
            <TextField
              label="Descrição"
              placeholder="Descrição do grupo"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              variant="outlined"
              size="small"
              fullWidth
              multiline
              rows={2}
            />
          </Grid>

          <Grid xs={12} item>
            <UsersFilter
              onFiltered={(users) => setUsers(users)}
              initialUsers={users}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          {i18n.t("chatIndex.modal.cancel")}
        </Button>
        <Button
          onClick={handleSave}
          color="primary"
          variant="contained"
          disabled={
            users === undefined ||
            users.length === 0 ||
            title === null ||
            title === "" ||
            title === undefined
          }
        >
          {i18n.t("chatIndex.modal.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Chat(props) {
  const { renderAsTab } = props;
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const history = useHistory();

  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState("new");
  const [currentChat, setCurrentChat] = useState({});
  const [chats, setChats] = useState([]);
  const [chatsPageInfo, setChatsPageInfo] = useState({ hasMore: false });
  const [messages, setMessages] = useState([]);
  const [messagesPageInfo, setMessagesPageInfo] = useState({ hasMore: false });
  const [messagesPage, setMessagesPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tab, setTab] = useState(0);
  const [showGroupChats, setShowGroupChats] = useState(false);
  const isMounted = useRef(true);
  const scrollToBottomRef = useRef();
  const messageListRef = useRef();
  const { id } = useParams();
  const isMdUp = useResponsive();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [editText, setEditText] = useState("");
  const [selectedChatForForward, setSelectedChatForForward] = useState(null);
  const [justOpenedChat, setJustOpenedChat] = useState(false);

  // Definir socket e companyId no escopo da função (canal = companyId efetivo do JWT)
  const companyId = user?.companyId;
  const socketCompanyId = resolveSocketCompanyId({
    user: { companyId: user?.companyId, id: user?.id },
  });
  const socket = socketCompanyId
    ? socketConnection({
        user: { companyId: user?.companyId, id: user?.id },
      })
    : null;

  // Monitorar mudanças no estado chats
  useEffect(() => {
    const groups = chats.filter(
      (chat) => chat.isGroup === true || chat.isGroup === "true"
    );
    const individualChats = chats.filter(
      (chat) => !(chat.isGroup === true || chat.isGroup === "true")
    );
  }, [chats, showGroupChats]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (isMounted.current && user?.id) {
      findChats()
        .then((data) => {
          const { records } = data;
          console.log("Chats encontrados:", records.length);
          if (isMounted.current && records.length > 0) {
            setChats(records);
            setChatsPageInfo(data);

            if (id && records.length) {
              const chat = records.find((r) => r.uuid === id);
              if (chat) {
                selectChat(
                  chat,
                  "useEffect[user?.id] (carregar chats iniciais)"
                );
              }
            }
          } else {
            console.log("Nenhum chat encontrado ou componente desmontado");
          }
        })
        .catch((err) => {
          console.error("Erro ao carregar chats iniciais:", err);
        });
    } else {
      console.log("Componente não montado ou usuário não disponível");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user.id) return;

    const onChatUser = (data) => {
      if (isMounted.current) {
        if (data.action === "create") {
          setChats((prev) => [data.record, ...prev]);
        }
        if (data.action === "update") {
          setChats((prev) =>
            prev.map((chat) =>
              chat.id === data.record.id ? { ...chat, ...data.record } : chat
            )
          );
          if (currentChat && currentChat.id === data.record.id) {
            setCurrentChat(data.record);
          }
        }
      }
    };
    const onChat = (data) => {
      if (!isMounted.current) return;
      if (isMounted.current) {
        if (data.action === "delete") {
          setChats((prev) => prev.filter((c) => c.id !== +data.id));
          setMessages([]);
          setMessagesPage(1);
          setMessagesPageInfo({ hasMore: false });
          setCurrentChat({});
          history.push("/chats");
          setTab(0);
        }
        if (data.action === "new-message" || data.action === "update") {
          // Só atualize se NÃO for o chat atualmente aberto
          if (!currentChat || currentChat.id !== data.chat.id) {
            setChats((prev) =>
              prev.map((chat) =>
                chat.id === data.chat.id ? { ...chat, ...data.chat } : chat
              )
            );
          }
        }
      }
    };

    if (socket && socketCompanyId) {
      socket.on(`company-${socketCompanyId}-chat-user-${user.id}`, onChatUser);
      socket.on(`company-${socketCompanyId}-chat`, onChat);

      return () => {
        socket.off(`company-${socketCompanyId}-chat-user-${user.id}`, onChatUser);
        socket.off(`company-${socketCompanyId}-chat`, onChat);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, socket, socketCompanyId]);

  useEffect(() => {
    if (
      isObject(currentChat) &&
      has(currentChat, "id") &&
      socket &&
      socketCompanyId
    ) {
      const onCurrentChat = (data) => {
        if (isMounted.current) {
          if (data.action === "new-message") {
            setMessages((prev) => {
              // Remove mensagem otimista (temp) com mesmo conteúdo e usuário
              const filtered = prev.filter(
                (msg) =>
                  !(
                    msg.id?.toString().startsWith("temp-") &&
                    msg.senderId === data.newMessage.senderId &&
                    msg.message === data.newMessage.message
                  )
              );
              // Evita duplicidade da real
              if (filtered.some((msg) => msg.id === data.newMessage.id)) {
                return filtered;
              }
              return [...filtered, data.newMessage];
            });
            const changedChats = chats.map((chat) => {
              if (chat.id === data.newMessage.chatId) {
                return {
                  ...chat,
                  ...data.chat,
                  lastMessage: data.newMessage,
                  updatedAt: data.newMessage.createdAt,
                };
              }
              return chat;
            });
            setChats(changedChats);
            if (typeof scrollToBottomRef.current === "function") {
              setTimeout(() => {
                scrollToBottomRef.current();
              }, 300);
            }
            // NÃO altere setMessagesPage aqui!
          } else if (data.action === "edit-message") {
            setMessages((prevMessages) =>
              prevMessages.map((msg) =>
                msg.id === data.message.id ? data.message : msg
              )
            );
          } else if (data.action === "delete-message") {
            setMessages((prevMessages) =>
              prevMessages.map((msg) =>
                msg.id === data.message.id ? data.message : msg
              )
            );
          }

          if (data.action === "update") {
            const changedChats = chats.map((chat) => {
              if (chat.id === data.chat.id) {
                return {
                  ...chat,
                  ...data.chat,
                };
              }
              return chat;
            });
            setChats(changedChats);
            if (typeof scrollToBottomRef.current === "function") {
              scrollToBottomRef.current();
            }
          }
        }
      };

      socket.on(`company-${socketCompanyId}-chat-${currentChat.id}`, onCurrentChat);

      return () => {
        socket.off(
          `company-${socketCompanyId}-chat-${currentChat.id}`,
          onCurrentChat
        );
      };
    }
  }, [currentChat, chats, socketCompanyId, socket]);

  // Modifique selectChat para buscar apenas a primeira página ao abrir o chat
  const selectChat = async (chat, reason = "manual") => {
    console.log(`[selectChat] Motivo: ${reason}`, chat);
    if (!isMounted.current) return;
    setMessages([]);
    setMessagesPage(1);
    setMessagesPageInfo(null);
    setJustOpenedChat(true);

    try {
      // Buscar chat atualizado do backend usando UUID
      const { data } = await api.get(`/chats/${chat.uuid}`);
      if (!isMounted.current) return;
      setCurrentChat(data);

      // Buscar apenas a primeira página de mensagens
      await findMessages(data.id, false, 1); // Passa página 1 explicitamente
    } catch (err) {
      if (!isMounted.current) return;
      setCurrentChat(chat);
      await findMessages(chat.id, false, 1);
    }
  };

  // No sendMessage, garanta que NENHUM findMessages, selectChat ou loadMoreMessages é chamado após o envio.
  const sendMessage = async (contentMessage) => {
    if (!currentChat || !currentChat.id) {
      console.error("Nenhum chat selecionado para enviar mensagem");
      return;
    }
    setLoading(true);
    try {
      await api.post(`/chats/${currentChat.id}/messages`, {
        message: contentMessage,
      });
      // Não chame findMessages, selectChat ou loadMoreMessages aqui!
      // Apenas limpe o campo de input, a mensagem será adicionada pelo socket
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
    }
    setLoading(false);
  };

  const deleteChat = async (chat) => {
    try {
      await api.delete(`/chats/${chat.id}`);
    } catch (err) {}
  };

  // Modifique findMessages para aceitar página explicitamente
  const findMessages = async (chatId, isLoadMore = false, page = null) => {
    if (!isMounted.current || !chatId) return;

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    let currentScrollHeight = 0;
    let currentScrollTop = 0;
    if (isLoadMore) {
      const messageListElement = document.querySelector(".messageList");
      currentScrollHeight = messageListElement?.scrollHeight || 0;
      currentScrollTop = messageListElement?.scrollTop || 0;
    }

    try {
      const pageToFetch = page !== null ? page : messagesPage;
      const url = `/chats/${chatId}/messages?pageNumber=${pageToFetch}`;
      const { data } = await api.get(url);
      if (!isMounted.current) return;

      if (isMounted.current) {
        const isFirstPage = pageToFetch === 1;
        if (isLoadMore) {
          setMessagesPage((prev) => prev + 1);
        }
        setMessagesPageInfo(data);
        if (isFirstPage) {
          setMessages(data.records);
        } else {
          setMessages((prev) => [...data.records, ...prev]);
          if (isLoadMore) {
            setTimeout(() => {
              if (!isMounted.current) return;
              const messageListElement = document.querySelector(".messageList");
              if (messageListElement) {
                const newScrollHeight = messageListElement.scrollHeight;
                const scrollDifference = newScrollHeight - currentScrollHeight;
                messageListElement.scrollTop =
                  currentScrollTop + scrollDifference;
              }
            }, 100);
          }
        }
      }
    } catch (err) {
      if (!isMounted.current) return;
      console.error("Erro ao carregar mensagens:", err);
    } finally {
      if (isMounted.current) {
        if (isLoadMore) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    }
  };

  const loadMoreMessages = async () => {
    if (
      !loadingMore &&
      currentChat &&
      currentChat.id &&
      messagesPageInfo?.hasMore
    ) {
      await findMessages(currentChat.id, true); // Não passe page aqui!
    }
  };

  const findChats = async () => {
    if (!isMounted.current) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/chats`);

      // Contar grupos e chats individuais
      const groups = data.records.filter(
        (chat) => chat.isGroup === true || chat.isGroup === "true"
      );
      const individualChats = data.records.filter(
        (chat) => !(chat.isGroup === true || chat.isGroup === "true")
      );

      if (isMounted.current) {
        setChats(data.records);
        setChatsPageInfo(data);
        console.log("Chats definidos no estado");
      }
      return data;
    } catch (err) {
      console.log("Erro ao carregar chats:", err);
      return { records: [], hasMore: false };
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const handleLoadNewChat = (data) => {
    if (!isMounted.current) return;

    // Limpar estado anterior
    setMessages([]);
    setMessagesPage(1);
    setMessagesPageInfo(null);
    setCurrentChat(data);
    setJustOpenedChat(true); // Ativar scroll automático

    // No mobile, não mudar a tab automaticamente
    // Deixar o usuário escolher qual tab usar

    history.push(`/chats/${data.uuid}`);

    // Não chame findMessages aqui, selectChat já faz isso
    selectChat(data, "handleLoadNewChat (novo chat criado/editado)");
    // Atualiza a lista de chats
    findChats().then((chatsData) => {
      if (isMounted.current && chatsData && chatsData.records) {
        setChats(chatsData.records);
        setChatsPageInfo(chatsData);
      }
    });
  };

  const handleEditMessage = (message) => {
    // Regra: só pode editar em até 10 minutos
    if (new Date() - new Date(message.createdAt) > 10 * 60 * 1000) {
      alert("Só é possível editar mensagens enviadas há menos de 10 minutos.");
      return;
    }
    setSelectedMessage(message);
    setEditText(message.message);
    setEditModalOpen(true);
  };

  const handleDeleteMessage = (message) => {
    setSelectedMessage(message);
    setDeleteModalOpen(true);
  };

  const handleEditSubmit = async () => {
    try {
      const { data } = await api.put(`/chats/messages/${selectedMessage.id}`, {
        message: editText,
      });
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === selectedMessage.id ? { ...msg, message: editText } : msg
        )
      );
      setEditModalOpen(false);
      setSelectedMessage(null);
      setEditText("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSubmit = async () => {
    try {
      await api.delete(`/chats/messages/${selectedMessage.id}`);
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === selectedMessage.id
            ? {
                ...msg,
                isDeleted: true,
                message: "Esta mensagem foi apagada",
                mediaPath: null,
                forwardedFrom: null,
                replyTo: null,
              }
            : msg
        )
      );
      setDeleteModalOpen(false);
      setSelectedMessage(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleForwardMessage = (message) => {
    setSelectedMessage(message);
    setForwardModalOpen(true);
  };

  const handleForwardSubmit = async () => {
    try {
      await api.post(`/chats/messages/${selectedMessage.id}/forward`, {
        targetChatId: selectedChatForForward,
      });
      setForwardModalOpen(false);
      setSelectedMessage(null);
      setSelectedChatForForward(null);
    } catch (err) {
      console.error(err);
    }
  };

  const isGroupChat = (chat) => {
    // Normalizações do campo isGroup
    const v = chat?.isGroup;
    if (v === true) return true;
    if (v === false) return false;
    if (v !== undefined && v !== null) {
      const str = String(v).toLowerCase();
      if (["true", "1", "yes", "y", "sim", "grupo", "group"].includes(str)) {
        return true;
      }
    }
    // Heurística segura: grupos geralmente têm mais de 2 usuários
    if (Array.isArray(chat?.users) && chat.users.length > 2) return true;
    return false;
  };

  const renderGrid = () => {
    let filteredChats = chats
      .filter((chat) => {
        const isGroup = isGroupChat(chat);
        const shouldShow = showGroupChats ? isGroup : !isGroup;

        return shouldShow;
      })
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    // Garantir que o chat atual apareça na lista quando pertinente
    if (
      currentChat &&
      currentChat.id &&
      isGroupChat(currentChat) === showGroupChats &&
      !filteredChats.find((c) => c.id === currentChat.id)
    ) {
      filteredChats = [currentChat, ...filteredChats];
    }

    return (
      <Grid className={classes.gridContainer} container>
        <Grid className={classes.gridItem} md={3} item>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <Button
              onClick={() => setShowGroupChats(false)}
              color={!showGroupChats ? "primary" : "default"}
              variant={!showGroupChats ? "contained" : "outlined"}
              fullWidth
            >
              {i18n.t("chatIndex.chats")}
            </Button>
            <Button
              onClick={() => setShowGroupChats(true)}
              color={showGroupChats ? "primary" : "default"}
              variant={showGroupChats ? "contained" : "outlined"}
              fullWidth
            >
              {i18n.t("chatIndex.groups")}
            </Button>
            <Button
              onClick={() => {
                setDialogType("new");
                setShowDialog(true);
              }}
              color="secondary"
              variant="contained"
              fullWidth
            >
              {i18n.t("chatIndex.createGroup")}
            </Button>
          </div>
          <ChatList
            chats={filteredChats}
            pageInfo={chatsPageInfo}
            loading={loading}
            handleSelectChat={(chat) =>
              selectChat(chat, "seleção manual na lista")
            }
            handleDeleteChat={(chat) => deleteChat(chat)}
            handleEditChat={(chat) => {
              setCurrentChat(chat);
              setDialogType("edit");
              setShowDialog(true);
            }}
            findChats={findChats}
            searchTerm={chatSearch}
            onSearchTermChange={setChatSearch}
            hideHeaderSearch
          />
        </Grid>
        <Grid className={classes.gridItem} md={9} item>
          {isObject(currentChat) && has(currentChat, "id") && (
            <ChatMessages
              chat={currentChat}
              scrollToBottomRef={scrollToBottomRef}
              pageInfo={messagesPageInfo}
              messages={messages}
              loading={loading}
              loadingMore={loadingMore}
              handleSendMessage={sendMessage}
              handleLoadMore={loadMoreMessages}
              onEdit={handleEditMessage}
              onDelete={handleDeleteMessage}
              onForward={handleForwardMessage}
              justOpenedChat={justOpenedChat}
              setJustOpenedChat={setJustOpenedChat}
              messageListRef={messageListRef}
              addOptimisticMessage={addOptimisticMessage}
            />
          )}
        </Grid>
      </Grid>
    );
  };

  const renderTab = () => {
    return (
      <Grid className={classes.gridContainer} container>
        {!currentChat.id ? (
          <Grid item xs={12}>
            {/* Cabeçalho da lista com botão Criar grupo */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                padding: "16px 16px 0 16px",
                background: "#fff",
                borderBottom: "1px solid #eee",
                position: "sticky",
                top: 0,
                zIndex: 100,
              }}
            >
              <Button
                onClick={() => setShowDialog(true)}
                color="primary"
                variant="contained"
                style={{ minWidth: 120 }}
              >
                {i18n.t("chatIndex.createGroup") || "Criar grupo"}
              </Button>
            </div>
            {/* Abas de Chats e Grupos */}
            <div
              style={{
                background: "#fff",
                position: "sticky",
                top: 56,
                zIndex: 99,
              }}
            >
              <Tabs
                value={tab}
                onChange={(e, v) => setTab(v)}
                indicatorColor="primary"
                textColor="primary"
                variant="fullWidth"
              >
                <Tab label={i18n.t("chatIndex.chats") || "Chats"} />
                <Tab label={i18n.t("chatIndex.groups") || "Grupos"} />
              </Tabs>
            </div>
            {tab === 0 && (
              <Grid className={classes.gridItemTab} md={12} item>
                <ChatList
                  chats={chats.filter((chat) => {
                    const isGroup = isGroupChat(chat);
                    return !isGroup;
                  })}
                  pageInfo={chatsPageInfo}
                  loading={loading}
                  handleSelectChat={(chat) => selectChat(chat)}
                  handleDeleteChat={(chat) => deleteChat(chat)}
                  findChats={findChats}
                  searchTerm={chatSearch}
                  onSearchTermChange={setChatSearch}
                  hideHeaderSearch
                />
              </Grid>
            )}
            {tab === 1 && (
              <Grid className={classes.gridItemTab} md={12} item>
                <ChatList
                  chats={chats.filter((chat) => {
                    const isGroup = isGroupChat(chat);
                    return isGroup;
                  })}
                  pageInfo={chatsPageInfo}
                  loading={loading}
                  handleSelectChat={(chat) => selectChat(chat)}
                  handleDeleteChat={(chat) => deleteChat(chat)}
                  handleEditChat={(chat) => {
                    setCurrentChat(chat);
                    setDialogType("edit");
                    setShowDialog(true);
                  }}
                  findChats={findChats}
                  searchTerm={chatSearch}
                  onSearchTermChange={setChatSearch}
                  hideHeaderSearch
                />
              </Grid>
            )}
          </Grid>
        ) : (
          <Grid
            className={classes.gridItemTab}
            md={12}
            item
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              minHeight: 0,
              padding: 0,
            }}
          >
            {/* Cabeçalho mobile da conversa */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px",
                borderBottom: "1px solid #eee",
                background: "#fff",
                position: "sticky",
                top: 0,
                zIndex: 100,
              }}
            >
              <IconButton onClick={() => setCurrentChat({})}>
                <ArrowBackIcon />
              </IconButton>
              {/* <Avatar
                src={
                  currentChat.isGroup
                    ? currentChat.groupImage
                      ? currentChat.groupImage.startsWith("http")
                        ? currentChat.groupImage
                        : `${getBackendUrl()}${currentChat.groupImage}`
                      : undefined
                    : currentChat.users &&
                      currentChat.users.find((u) => u.userId !== user.id)?.user
                        ?.profileImage
                    ? currentChat.users
                        .find((u) => u.userId !== user.id)
                        .user.profileImage.startsWith("http")
                      ? currentChat.users.find((u) => u.userId !== user.id).user
                          .profileImage
                      : `${getBackendUrl()}/public/company${
                          currentChat.users.find((u) => u.userId !== user.id)
                            .user.companyId
                        }/user/${
                          currentChat.users.find((u) => u.userId !== user.id)
                            .user.profileImage
                        }`
                    : undefined
                }
                style={{ marginRight: 12 }}
              >
                {currentChat.isGroup
                  ? currentChat.title?.charAt(0) || "G"
                  : (currentChat.users &&
                      currentChat.users
                        .find((u) => u.userId !== user.id)
                        ?.user?.name?.charAt(0)) ||
                    "?"}
              </Avatar> */}

              {/* Nome do usuário ou grupo */}
              {/* <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
                {currentChat.isGroup
                  ? currentChat.title || "Grupo"
                  : (currentChat.users &&
                      currentChat.users.find((u) => u.userId !== user.id)?.user
                        ?.name) ||
                    "Usuário"}
              </Typography> */}
            </div>
            {/* Container flexível para ChatMessages */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <ChatMessages
                chat={currentChat}
                scrollToBottomRef={scrollToBottomRef}
                pageInfo={messagesPageInfo}
                messages={messages}
                loading={loading}
                loadingMore={loadingMore}
                handleSendMessage={sendMessage}
                handleLoadMore={loadMoreMessages}
                onEdit={handleEditMessage}
                onDelete={handleDeleteMessage}
                onForward={handleForwardMessage}
                // messageListRef={messageListRef}
                // isFirstPage={messagesPage === 2}
                justOpenedChat={justOpenedChat}
                setJustOpenedChat={setJustOpenedChat}
                addOptimisticMessage={addOptimisticMessage}
              />
            </div>
          </Grid>
        )}
      </Grid>
    );
  };

  useEffect(() => {
    const ensureChatLoaded = async () => {
      if (!id) return;
      const chat = chats.find((r) => r.uuid === id);
      if (chat) {
        if (!currentChat || currentChat.id !== chat.id) {
          await selectChat(
            chat,
            "useEffect[id, chats] (mudança de rota ou lista de chats)"
          );
        }
        return;
      }
      // Fallback: buscar pelo UUID direto do backend se não estiver na lista
      try {
        const { data } = await api.get(`/chats/${id}`);
        if (data && data.id) {
          setChats((prev) => {
            const exists = prev.some((c) => c.id === data.id);
            return exists ? prev : [data, ...prev];
          });
          await selectChat(data, "fallback fetch by uuid (não estava na lista)");
        }
      } catch (e) {
        // silencia; pode ser 404 se não existir
      }
    };
    ensureChatLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, chats]);

  const addOptimisticMessage = (msg) => {
    setMessages((prev) => [...prev, msg]);
  };

  const [chatSearch, setChatSearch] = useState("");
  return (
    <ActivitiesStyleLayout
      title="Chat Interno"
      viewModes={[{ value: "chats", label: "Chat Interno" }]}
      currentViewMode="chats"
      searchPlaceholder={i18n.t("chatList.searchChat")}
      searchValue={chatSearch}
      onSearchChange={setChatSearch}
      hideDefaultRightFilters
    >
      <ChatModal
        type={dialogType}
        open={showDialog}
        chat={currentChat}
        handleLoadNewChat={handleLoadNewChat}
        handleClose={() => setShowDialog(false)}
        findChats={findChats}
        setChats={setChats}
        setChatsPageInfo={setChatsPageInfo}
        chats={chats}
        loggedInUserId={user.id}
      />
      <Paper
        className={classes.mainContainer}
        // style={{
        //   height: "100%",
        //   minHeight: 0,
        //   display: "flex",
        //   flexDirection: "column",
        //   padding: 0,
        // }}
      >
        {isMdUp ? renderGrid() : renderTab()}
      </Paper>
      <Dialog
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Editar Mensagem</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Mensagem"
            type="text"
            fullWidth
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            multiline
            minRows={3}
            maxRows={10}
            inputProps={{ style: { fontSize: 18 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditModalOpen(false)} color="secondary">
            {i18n.t("chatIndex.cancel")}
          </Button>
          <Button onClick={handleEditSubmit} color="primary">
            {i18n.t("chatIndex.save")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <DialogTitle>{i18n.t("chatIndex.deleteGroup")}</DialogTitle>
        <DialogContent>
          <Typography>{i18n.t("chatIndex.deleteGroupConfirm")}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteModalOpen(false)} color="secondary">
            {i18n.t("chatIndex.cancel")}
          </Button>
          <Button onClick={handleDeleteSubmit} color="primary">
            {i18n.t("chatIndex.delete")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={forwardModalOpen}
        onClose={() => setForwardModalOpen(false)}
      >
        <DialogTitle>Encaminhar Mensagem</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>Selecione o chat</InputLabel>
            <Select
              value={selectedChatForForward || ""}
              onChange={(e) => setSelectedChatForForward(e.target.value)}
            >
              {chats.map((chat) => (
                <MenuItem key={chat.id} value={chat.id}>
                  {chat.isGroup
                    ? chat.title
                    : chat.users.find((u) => u.userId !== user.id)?.user?.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForwardModalOpen(false)} color="secondary">
            Cancelar
          </Button>
          <Button
            onClick={handleForwardSubmit}
            color="primary"
            disabled={!selectedChatForForward}
          >
            Encaminhar
          </Button>
        </DialogActions>
      </Dialog>
    </ActivitiesStyleLayout>
  );
}

export default withWidth()(Chat);
