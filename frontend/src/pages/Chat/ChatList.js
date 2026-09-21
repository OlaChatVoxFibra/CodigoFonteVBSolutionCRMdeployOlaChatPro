/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useContext, useState } from "react";
import {
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  ListItemAvatar,
  Avatar,
  makeStyles,
  Typography,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
} from "@material-ui/core";

import { useHistory, useParams } from "react-router-dom";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useDate } from "../../hooks/useDate";
import useOnlineUsers from "../../hooks/useOnlineUsers";
import { getBackendUrl } from "../../config";
import { i18n } from "../../translate/i18n";

import DeleteIcon from "@material-ui/icons/Delete";
import EditIcon from "@material-ui/icons/Edit";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import AddIcon from "@material-ui/icons/Add";
import SearchIcon from "@material-ui/icons/Search";

import ConfirmationModal from "../../components/ConfirmationModal";
import api from "../../services/api";
import UserStatusIcon from "../../components/UserModal/statusIcon";
import { toast } from "react-toastify";

const useStyles = makeStyles((theme) => ({
  mainContainer: {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    flex: 1,
    height: "calc(100% - 58px)",
    overflow: "hidden",
    borderRadius: 0,
    backgroundColor: theme.mode === "light" ? "#f2f2f2" : "#7f7f7f",
  },
  chatList: {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    flex: 1,
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
  listItemActive: {
    cursor: "pointer",
    backgroundColor: theme.palette.background.paper,
    borderLeft: "6px solid #002d6e",
  },
  listItem: {
    cursor: "pointer",
    backgroundColor: theme.palette.background.color,
    borderBottom: "1px solid #eee",
    "&:hover": {
      backgroundColor: "#f5f5f5",
    },
  },
  avatar: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  onlineIndicator: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    backgroundColor: "#4CAF50",
    position: "absolute",
    bottom: 0,
    right: 0,
    border: "2px solid white",
  },
  offlineIndicator: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    backgroundColor: "#999",
    position: "absolute",
    bottom: 0,
    right: 0,
    border: "2px solid white",
  },
  lastSeen: {
    fontSize: "0.75rem",
    color: "#999",
  },
  lastMessage: {
    fontSize: "0.875rem",
    color: "#666",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "200px",
  },
  listItemContent: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    position: "relative",
    height: "auto",
  },

  userName: {
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },

  messageCount: {
    marginLeft: "auto",
    fontSize: "0.75rem",
    backgroundColor: "#1976d2",
    color: "#fff",
    borderRadius: "12px",
    padding: "2px 8px",
    minWidth: "20px",
    textAlign: "center",
  },
}));

export default function ChatList({
  chats,
  handleSelectChat,
  handleDeleteChat,
  handleEditChat,
  pageInfo,
  loading,
  findChats,
  searchTerm: externalSearchTerm,
  onSearchTermChange,
  hideHeaderSearch,
}) {
  const classes = useStyles();
  const history = useHistory();
  const { user: loggedInUser, users } = useContext(AuthContext);
  const { datetimeToClient } = useDate();

  const [confirmationModal, setConfirmModalOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState({});
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [createChatModalOpen, setCreateChatModalOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");

  const { id } = useParams();

  // Ordena os chats pelo campo updatedAt antes de filtrar
  const orderedChats = [...chats].sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );

  const effectiveSearchTerm =
    typeof externalSearchTerm === "string" ? externalSearchTerm : searchTerm;
  const filteredChats = orderedChats.filter((chat) => {
    const isGroup = chat.isGroup;
    const usersArr = Array.isArray(chat.users) ? chat.users : [];
    const otherUser =
      !isGroup && usersArr.find((u) => u.userId !== loggedInUser.id);
    const name = (isGroup ? chat.title : otherUser?.user?.name) || "";
    const matchesSearch = name
      .toLowerCase()
      .includes(effectiveSearchTerm.toLowerCase());
    return matchesSearch;
  });

  const isShowingOnlyGroups = filteredChats.every((chat) => chat.isGroup);

  const goToMessages = async (chat) => {
    if (unreadMessages(chat) > 0) {
      try {
        await api.post(`/chats/${chat.id}/read`, { userId: loggedInUser.id });
      } catch (err) {}
    }
    handleSelectChat(chat);
    if (id !== chat.uuid) {
      history.push(`/chats/${chat.uuid}`);
    }
  };

  const handleDelete = () => {
    handleDeleteChat(selectedChat);
    handleClose();
  };

  const unreadMessages = (chat) => {
    const usersArr = Array.isArray(chat.users) ? chat.users : [];
    const currentUser = usersArr.find((u) => u.userId === loggedInUser.id);
    return currentUser?.unreads || 0;
  };

  const getPrimaryText = (chat) => {
    const isGroup = chat.isGroup;
    const usersArr = Array.isArray(chat.users) ? chat.users : [];
    const otherUser =
      !isGroup && usersArr.find((u) => u.userId !== loggedInUser.id);

    const mainText = chat.title;
    const userName = otherUser?.user?.name;

    const unreads = unreadMessages(chat);

    return (
      <>
        {isGroup ? mainText : userName}
        {unreads > 0 && (
          <Chip
            size="small"
            style={{ marginLeft: 5 }}
            label={unreads}
            color="secondary"
          />
        )}
      </>
    );
  };

  const getSecondaryText = (chat) => {
    // Prioriza o campo lastMessage retornado do backend
    let msg = "";
    if (chat.lastMessage && typeof chat.lastMessage === "object") {
      if (chat.lastMessage.isDeleted) {
        msg = i18n.t("chatMessages.deleted");
      } else if (chat.lastMessage.mediaType === "audio") {
        msg = "[Áudio]";
      } else if (chat.lastMessage.mediaType === "image") {
        msg = "[Imagem]";
      } else if (chat.lastMessage.mediaType === "video") {
        msg = "[Vídeo]";
      } else if (chat.lastMessage.mediaType && chat.lastMessage.mediaName) {
        msg = `[Arquivo] ${chat.lastMessage.mediaName}`;
      } else if (chat.lastMessage.message) {
        msg = chat.lastMessage.message;
      }
    } else if (typeof chat.lastMessage === "string") {
      msg = chat.lastMessage;
    } else if (chat.messages && chat.messages.length > 0) {
      const lastMsg = chat.messages[chat.messages.length - 1];
      msg = lastMsg.message;
    } else {
      msg = i18n.t("chatList.noMessages");
    }
    // Limita o texto a 80 caracteres
    if (msg && msg.length > 40) {
      return msg.substring(0, 40) + "...";
    }
    return msg;
  };

  const handleClick = (event, chat) => {
    setAnchorEl(event.currentTarget);
    setSelectedChat(chat);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleOpenDetails = () => {
    setDetailsModalOpen(true);
    handleClose();
  };

  const handleCloseDetails = () => {
    setDetailsModalOpen(false);
  };

  const formatLastSeen = (date) => {
    if (!date) return "";
    const lastSeen = new Date(date);
    const now = new Date();
    const diff = now - lastSeen;
    if (diff < 60000) return i18n.t("chatList.now");
    if (diff < 3600000)
      return i18n.t("chatList.minutesAgo", { count: Math.floor(diff / 60000) });
    if (diff < 86400000)
      return i18n.t("chatList.hoursAgo", { count: Math.floor(diff / 3600000) });
    return lastSeen.toLocaleDateString();
  };

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const { data } = await api.get("/users/list");
      // Filtrar o usuário logado da lista
      const filteredUsers = data.filter((user) => user.id !== loggedInUser.id);
      setAvailableUsers(filteredUsers);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar usuários");
    } finally {
      setUsersLoading(false);
    }
  };

  const handleOpenCreateChat = () => {
    setCreateChatModalOpen(true);
    setUserSearchTerm("");
    loadUsers();
  };

  const handleCloseCreateChat = () => {
    setCreateChatModalOpen(false);
    setUserSearchTerm("");
  };

  const handleCreateChatWithUser = async (selectedUser) => {
    try {
      // Verificar se já existe um chat com este usuário
      const existingChat = chats.find((c) => {
        const hasSelectedUser = c.users.some(
          (u) => u.userId === selectedUser.id
        );
        const hasLoggedInUser = c.users.some(
          (u) => u.userId === loggedInUser.id
        );
        const isIndividualChat = !c.isGroup && c.users.length === 2;

        return isIndividualChat && hasSelectedUser && hasLoggedInUser;
      });

      if (existingChat) {
        toast.info("Chat com este usuário já existe!");
        handleSelectChat(existingChat);
        handleCloseCreateChat();
        return;
      }

      // Criar novo chat
      const { data } = await api.post("/chats", {
        users: [{ id: selectedUser.id }],
        isGroup: false,
      });
      try {
        await api.post(`/chats/${data.id}/messages`, { message: "Chat criado" });
      } catch (e) {}

      toast.success("Chat criado com sucesso!");

      // Atualizar a lista de chats
      if (findChats) {
        await findChats();
      }

      handleSelectChat(data);
      handleCloseCreateChat();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar chat");
    }
  };

  const filteredAvailableUsers = availableUsers.filter((user) =>
    user.name.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  return (
    <>
      <Menu
        id="simple-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {selectedChat.ownerId === loggedInUser.id && selectedChat.isGroup && (
          <MenuItem onClick={() => handleEditChat(selectedChat)}>
            {i18n.t("chatList.edit")}
          </MenuItem>
        )}
        {loggedInUser.profile === "admin" && (
          <MenuItem onClick={() => handleDeleteChat(selectedChat)}>
            {i18n.t("chatList.delete")}
          </MenuItem>
        )}
        {selectedChat.isGroup && (
          <MenuItem onClick={handleOpenDetails}>
            {i18n.t("chatList.details")}
          </MenuItem>
        )}
      </Menu>
      <ConfirmationModal
        title={i18n.t("chatList.deleteChat")}
        open={confirmationModal}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleDelete}
      >
        {i18n.t("chatList.deleteChatConfirm")}
      </ConfirmationModal>
      <ConfirmationModal
        title={i18n.t("chatList.detailsTitle")}
        open={detailsModalOpen}
        onClose={handleCloseDetails}
      >
        <div style={{ padding: "20px" }}>
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <Avatar
              src={
                selectedChat?.groupImage
                  ? selectedChat.groupImage.startsWith("http")
                    ? selectedChat.groupImage
                    : `${getBackendUrl()}${selectedChat.groupImage}`
                  : null
              }
              style={{ width: 100, height: 100, margin: "0 auto" }}
            />
            <Typography variant="h6" style={{ marginTop: "10px" }}>
              {selectedChat?.title}
            </Typography>
            {selectedChat?.description && (
              <Typography variant="body2" color="textSecondary">
                {selectedChat.description}
              </Typography>
            )}
          </div>
          <List>
            {selectedChat?.users?.map((user) => (
              <ListItem key={user.userId}>
                <ListItemAvatar>
                  <Avatar
                    src={
                      user.user?.profileImage
                        ? `${getBackendUrl()}/public/company${
                            user.user.companyId
                          }/user/${user.user.profileImage}`
                        : null
                    }
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={user.user?.name}
                  secondary={
                    user.userId === selectedChat.ownerId
                      ? i18n.t("chatList.admin")
                      : i18n.t("chatList.member")
                  }
                />
              </ListItem>
            ))}
          </List>
        </div>
      </ConfirmationModal>
      <div className={classes.mainContainer}>
        {!hideHeaderSearch && (<div
          style={{
            padding: "10px",
            display: "flex",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            placeholder={i18n.t("chatList.searchChat")}
            value={effectiveSearchTerm}
            onChange={(e) =>
              onSearchTermChange
                ? onSearchTermChange(e.target.value)
                : setSearchTerm(e.target.value)
            }
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "20px",
              border: "1px solid #ccc",
              outline: "none",
            }}
          />
          {!isShowingOnlyGroups && (
            <IconButton
              onClick={handleOpenCreateChat}
              style={{
                backgroundColor: "#1976d2",
                color: "white",
                width: "40px",
                height: "40px",
              }}
              title={i18n.t("chatList.createNewChat")}
            >
              <AddIcon />
            </IconButton>
          )}
        </div>)}

        <div className={classes.chatList}>
          <List>
            {console.log(
              "Renderizando lista com",
              filteredChats.length,
              "chats"
            )}
            {filteredChats.map((chat, key) => {
              const isGroup = chat.isGroup;
              const usersArr = Array.isArray(chat.users) ? chat.users : [];
              const otherUser =
                !isGroup && usersArr.find((u) => u.userId !== loggedInUser.id);
              const isOnline =
                !isGroup &&
                otherUser &&
                availableUsers?.some((u) => u.id === otherUser.user.id);

              console.log(`Renderizando chat ${key}:`, {
                id: chat.id,
                uuid: chat.uuid,
                isGroup: isGroup,
                title: chat.title,
                name: otherUser?.user?.name,
                users: chat.users?.length,
              });

              return (
                <ListItem
                  key={key}
                  button
                  onClick={() => goToMessages(chat)}
                  className={
                    chat.uuid === id ? classes.listItemActive : classes.listItem
                  }
                >
                  <ListItemAvatar>
                    <div style={{ position: "relative" }}>
                      <Avatar
                        src={
                          isGroup
                            ? chat.groupImage
                              ? chat.groupImage.startsWith("http")
                                ? chat.groupImage
                                : `${getBackendUrl()}${chat.groupImage}`
                              : undefined
                            : otherUser &&
                              otherUser.user &&
                              otherUser.user.profileImage
                            ? otherUser.user.profileImage.startsWith("http")
                              ? otherUser.user.profileImage
                              : `${getBackendUrl()}/public/company${
                                  otherUser.user.companyId
                                }/user/${otherUser.user.profileImage}`
                            : undefined
                        }
                        className={classes.avatar}
                      >
                        {isGroup
                          ? chat.title
                            ? chat.title.charAt(0)
                            : "G"
                          : otherUser && otherUser.user && otherUser.user.name
                          ? otherUser.user.name.charAt(0)
                          : "?"}
                      </Avatar>
                    </div>
                  </ListItemAvatar>

                  <ListItemText
                    primary={
                      <div className={classes.listItemContent}>
                        <div className={classes.userName}>
                          <Typography
                            component="div"
                            variant="subtitle1"
                            className={classes.userName}
                          >
                            {isGroup
                              ? chat.title || "Grupo"
                              : otherUser &&
                                otherUser.user &&
                                otherUser.user.name
                              ? otherUser.user.name
                              : "Usuário"}
                          </Typography>
                          {!isGroup && (
                            <UserStatusIcon user={otherUser?.user} />
                          )}
                        </div>
                        {unreadMessages(chat) > 0 && (
                          <div
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: "50%",
                              background: "red",
                              color: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                              marginLeft: 8,
                            }}
                          >
                            {unreadMessages(chat)}
                          </div>
                        )}
                      </div>
                    }
                    secondary={
                      <Typography
                        component="div"
                        variant="body2"
                        style={{ color: "gray" }}
                      >
                        {getSecondaryText(chat)}
                      </Typography>
                    }
                  />

                  {(loggedInUser.profile === "admin" ||
                    (selectedChat.ownerId === loggedInUser.id &&
                      selectedChat.isGroup)) && (
                    <IconButton
                      edge="end"
                      aria-label="more"
                      onClick={(e) => handleClick(e, chat)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  )}
                </ListItem>
              );
            })}
          </List>
        </div>
      </div>
      <Dialog
        open={createChatModalOpen}
        onClose={handleCloseCreateChat}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AddIcon style={{ color: "#1976d2" }} />
            <Typography variant="h6">
              {i18n.t("chatList.createNewChat")}
            </Typography>
          </div>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            placeholder={i18n.t("chatList.searchUser")}
            value={userSearchTerm}
            onChange={(e) => setUserSearchTerm(e.target.value)}
            style={{ marginBottom: "20px", marginTop: "10px" }}
            InputProps={{
              startAdornment: (
                <SearchIcon style={{ marginRight: "8px", color: "#666" }} />
              ),
            }}
          />

          {usersLoading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "20px",
              }}
            >
              <CircularProgress />
            </div>
          ) : (
            <List style={{ maxHeight: "400px", overflow: "auto" }}>
              {filteredAvailableUsers.map((user) => (
                <ListItem
                  key={user.userId}
                  button
                  onClick={() => handleCreateChatWithUser(user)}
                  style={{ borderRadius: "8px", marginBottom: "4px" }}
                >
                  <ListItemAvatar>
                    <Avatar
                      src={
                        user?.profileImage?.startsWith("http")
                          ? user.profileImage
                          : `${getBackendUrl()}/public/company${
                              user.companyId
                            }/user/${user.profileImage}`
                      }
                    >
                      {/* {!user.profileImage && user.name.charAt(0)} */}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <Typography variant="subtitle1">{user.name}</Typography>
                        <UserStatusIcon user={user} />
                      </div>
                    }
                    secondary={user.email}
                  />
                </ListItem>
              ))}
              {filteredAvailableUsers.length === 0 && !usersLoading && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "#666",
                  }}
                >
                  {userSearchTerm
                    ? i18n.t("chatList.noUserFound")
                    : i18n.t("chatList.noUserAvailable")}
                </div>
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateChat} color="secondary">
            {i18n.t("chatList.cancel")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
