/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useReducer, useContext } from "react";
import { toast } from "react-toastify";
import { makeStyles } from "@material-ui/core/styles";
import { useTheme } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Tooltip from "@material-ui/core/Tooltip";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import IconButton from "@material-ui/core/IconButton";
import InputBase from "@material-ui/core/InputBase";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import CircularProgress from "@material-ui/core/CircularProgress";
import SearchIcon from "@material-ui/icons/Search";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import AddIcon from "@material-ui/icons/Add";
import ChatIcon from "@material-ui/icons/ChatBubbleOutline";
import MainContainer from "../../components/MainContainer";
import whatsappIcon from "../../assets/nopicture.png";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import UserModal from "../../components/UserModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import {
  SocketContext,
  socketManager,
} from "../../context/Socket/SocketContext";
import UserStatusIcon from "../../components/UserModal/statusIcon";
import { getBackendUrl } from "../../config";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Avatar } from "@material-ui/core";
import ForbiddenPage from "../../components/ForbiddenPage";
import { useHistory } from "react-router-dom";

const backendUrl = getBackendUrl();

const reducer = (state, action) => {
  if (action.type === "LOAD_USERS") {
    const users = action.payload;
    const newUsers = [];

    users.forEach((user) => {
      const userIndex = state.findIndex((u) => u.id === user.id);
      if (userIndex !== -1) {
        state[userIndex] = user;
      } else {
        newUsers.push(user);
      }
    });

    return [...state, ...newUsers];
  }

  if (action.type === "UPDATE_USERS") {
    const user = action.payload;
    const userIndex = state.findIndex((u) => u.id === user.id);

    if (userIndex !== -1) {
      state[userIndex] = user;
      return [...state];
    } else {
      return [user, ...state];
    }
  }

  if (action.type === "DELETE_USER") {
    const userId = action.payload;

    const userIndex = state.findIndex((u) => u.id === userId);
    if (userIndex !== -1) {
      state.splice(userIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const border = isDark ? "rgba(255,255,255,0.08)" : "#eaedf0";
  const surfaceBg = isDark ? "rgba(255,255,255,0.03)" : "#ffffff";
  const hoverBg = isDark ? "rgba(255,255,255,0.05)" : "#f8f9fb";
  const font = '"Helvetica Neue", Helvetica, Arial, sans-serif';

  return {
    root: { width: "100%", fontFamily: font },
    mainPaper: {
      flex: 1,
      padding: theme.spacing(2),
      overflowY: "auto",
      ...theme.scrollbarStyles,
      backgroundColor: isDark ? theme.palette.background.default : theme.palette.listScrollArea,
      boxShadow: "none",
    },

    /* ── Search bar (standalone mode) ── */
    searchBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px",
      height: 44,
      boxSizing: "border-box",
      borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(128,128,128,0.18)"}`,
      borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(128,128,128,0.12)"}`,
      backgroundColor: "inherit",
    },
    searchBox: {
      display: "flex",
      alignItems: "center",
      gap: 5,
      borderRadius: 7,
      background: isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6",
      padding: "3px 8px",
      minWidth: 160,
      height: 30,
      flex: 1,
      maxWidth: 340,
    },
    searchInput: {
      fontSize: 11.5,
      color: theme.palette.text.primary,
      flex: 1,
      fontFamily: font,
      "& input": { padding: 0, fontSize: 11.5 },
      "& input::placeholder": {
        color: isDark ? "rgba(255,255,255,0.35)" : "#9ca3af",
        opacity: 1,
      },
    },

    /* ── Table (desktop/tablet) ── */
    tableWrap: {
      borderRadius: 10,
      border: `1px solid ${border}`,
      background: surfaceBg,
      overflowX: "auto",
      "&::-webkit-scrollbar": { height: 4 },
      "&::-webkit-scrollbar-thumb": {
        background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
        borderRadius: 4,
      },
    },
    table: {
      minWidth: 700,
      "& .MuiTableCell-head": {
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
        borderBottom: `1px solid ${border}`,
        padding: "6px 10px",
        whiteSpace: "nowrap",
        fontFamily: font,
        background: isDark ? "rgba(255,255,255,0.02)" : "#fafbfc",
      },
      "& .MuiTableCell-body": {
        fontSize: 12,
        color: theme.palette.text.primary,
        borderBottom: `1px solid ${border}`,
        padding: "6px 10px",
        fontFamily: font,
      },
    },
    tableRow: {
      cursor: "pointer",
      transition: "background 0.12s",
      "&:hover": { background: hoverBg },
    },

    /* ── Tags ── */
    tag: {
      display: "inline-flex",
      alignItems: "center",
      height: 18,
      borderRadius: 5,
      padding: "0 6px",
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: "0.02em",
      lineHeight: 1,
      whiteSpace: "nowrap",
      fontFamily: font,
    },
    tagNeutral: {
      background: isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6",
      color: isDark ? "rgba(255,255,255,0.5)" : "#6b7280",
    },

    /* ── Avatar ── */
    userAvatar: {
      width: 40,
      height: 40,
    },
    avatarDiv: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },

    /* ── Action icons ── */
    actionBtn: {
      padding: 3,
    },
    actionIcon: {
      fontSize: 14,
      color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.25)",
    },

    /* ── Cards (mobile) ── */
    cardList: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
    },
    card: {
      borderRadius: 10,
      border: `1px solid ${border}`,
      background: surfaceBg,
      padding: "10px 12px",
      transition: "background 0.12s",
      "&:active": { background: hoverBg },
    },
    cardHeader: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 6,
    },
    cardInfo: {
      flex: 1,
      overflow: "hidden",
    },
    cardName: {
      fontSize: 13,
      fontWeight: 600,
      color: theme.palette.text.primary,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    cardEmail: {
      fontSize: 11,
      color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    cardRow: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap",
      marginTop: 6,
    },
    cardActions: {
      display: "flex",
      alignItems: "center",
      gap: 2,
      marginLeft: "auto",
      flexShrink: 0,
    },

    /* ── Loading ── */
    loadingContainer: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing(3),
    },
    loadingText: {
      marginLeft: theme.spacing(2),
      fontSize: 12,
      fontFamily: font,
      color: theme.palette.text.secondary,
    },
    emptyRow: {
      padding: 28,
      opacity: 0.5,
      fontSize: 12,
      fontFamily: font,
    },

    /* ── FAB ── */
    fab: {
      position: "fixed",
      bottom: theme.spacing(3),
      right: theme.spacing(3),
      width: 56,
      height: 56,
      borderRadius: "50%",
      backgroundColor: theme.palette.primary.main,
      color: "#fff",
      boxShadow: `0 8px 24px ${theme.palette.primary.main}4D`,
      zIndex: theme.zIndex.snackbar,
      "&:hover": {
        backgroundColor: theme.palette.primary.dark,
        color: "#fff",
      },
    },
  };
});

const Users = ({ renderAsTab, externalSearchParam }) => {
  const classes = useStyles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("xs"));
  const history = useHistory();

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [internalSearchParam, setInternalSearchParam] = useState("");
  const searchParam = externalSearchParam !== undefined ? externalSearchParam : internalSearchParam;
  const [users, dispatch] = useReducer(reducer, []);
  const { user: loggedInUser, socket } = useContext(AuthContext);
  const { profileImage } = loggedInUser;
  const companyId = loggedInUser.companyId;

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const fetchUsers = async () => {
      try {
        const { data } = await api.get("/users/", {
          params: { searchParam, pageNumber },
        });
        dispatch({ type: "LOAD_USERS", payload: data.users });
        setHasMore(data.hasMore);
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };
    fetchUsers();
  }, [searchParam, pageNumber]);

  useEffect(() => {
    if (loggedInUser && socket) {
      const companyId = loggedInUser.companyId;

      const onCompanyUser = (data) => {
        if (data.action === "update" || data.action === "create") {
          dispatch({ type: "UPDATE_USERS", payload: data.user });
        }
        if (data.action === "delete") {
          dispatch({ type: "DELETE_USER", payload: +data.userId });
        }
      };

      socket.on(`company-${companyId}-user`, onCompanyUser);

      return () => {
        socket.off(`company-${companyId}-user`, onCompanyUser);
      };
    }
  }, [socket, loggedInUser]);

  const handleOpenUserModal = () => {
    setSelectedUser(null);
    setUserModalOpen(true);
  };

  const handleCloseUserModal = () => {
    setSelectedUser(null);
    setUserModalOpen(false);
  };

  const handleSearch = (event) => {
    setInternalSearchParam(event.target.value.toLowerCase());
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setUserModalOpen(true);
  };

  const handleDeleteUser = async (userId) => {
    try {
      await api.delete(`/users/${userId}`);
      toast.success(i18n.t("users.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingUser(null);
    setInternalSearchParam("");
    setPageNumber(1);
  };

  const loadMore = () => {
    setLoadingMore(true);
    setPageNumber((prevPage) => prevPage + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  const renderProfileImage = (user) => {
    const buildImageUrl = (userData) => {
      if (!userData.profileImage) {
        return whatsappIcon;
      }
      return `${backendUrl}/public/company${userData.companyId}/user/${userData.profileImage}`;
    };

    if (user.id === loggedInUser.id) {
      const savedProfileImage = localStorage.getItem("profileImage");
      const profileImageToUse = savedProfileImage || user.profileImage;

      const imageUrl = profileImageToUse
        ? `${backendUrl}/public/company${user.companyId}/user/${profileImageToUse}`
        : whatsappIcon;

      return (
        <Avatar
          src={imageUrl}
          alt={user.name}
          className={classes.userAvatar}
          onError={(e) => {
            e.target.src = whatsappIcon;
          }}
        />
      );
    }

    return (
      <Avatar
        src={buildImageUrl(user)}
        alt={user.name}
        className={classes.userAvatar}
      />
    );
  };

  const handleCreateChat = async (targetUser) => {
    try {
      setLoading(true);
      const { data } = await api.post("/chats", {
        users: [{ id: loggedInUser.id }, { id: targetUser.id }],
        isGroup: false,
        title: targetUser.name,
      });
      toast.success("Chat criado com sucesso!");
      history.push(`/chats/${data.uuid}`);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  const Container = renderAsTab ? ({ children }) => <>{children}</> : MainContainer;

  const renderMobileCards = () => (
    <div className={classes.cardList}>
      {users.map((user) => (
        <div key={user.id} className={classes.card}>
          <div className={classes.cardHeader}>
            <div className={classes.avatarDiv}>
              {renderProfileImage(user)}
            </div>
            <div className={classes.cardInfo}>
              <div className={classes.cardName}>{user.name}</div>
              <div className={classes.cardEmail}>{user.email}</div>
            </div>
            <UserStatusIcon user={user} />
          </div>
          <div className={classes.cardRow}>
            <span className={`${classes.tag} ${classes.tagNeutral}`}>
              {user.profile}
            </span>
            {user.startWork && (
              <span style={{ fontSize: 10, opacity: 0.5 }}>
                {user.startWork} - {user.endWork}
              </span>
            )}
            <div className={classes.cardActions}>
              <IconButton
                className={classes.actionBtn}
                onClick={() => handleCreateChat(user)}
                title="Chat"
              >
                <ChatIcon className={classes.actionIcon} />
              </IconButton>
              <IconButton
                className={classes.actionBtn}
                onClick={() => handleEditUser(user)}
                title="Editar"
              >
                <EditIcon className={classes.actionIcon} />
              </IconButton>
              <IconButton
                className={classes.actionBtn}
                onClick={() => {
                  setConfirmModalOpen(true);
                  setDeletingUser(user);
                }}
                title="Excluir"
              >
                <DeleteOutlineIcon className={classes.actionIcon} />
              </IconButton>
            </div>
          </div>
        </div>
      ))}
      {users.length === 0 && !loading && (
        <div style={{ textAlign: "center", padding: 24, opacity: 0.5, fontSize: 12 }}>
          {i18n.t("users.table.noUsers") || "Nenhum usuário encontrado."}
        </div>
      )}
    </div>
  );

  const renderDesktopTable = () => (
    <div className={classes.tableWrap}>
      <Table className={classes.table}>
        <TableHead>
          <TableRow>
            <TableCell align="center" style={{ width: 40 }}>
              {i18n.t("users.table.ID")}
            </TableCell>
            <TableCell align="center" style={{ width: 36 }}>
              {i18n.t("users.table.status")}
            </TableCell>
            <TableCell align="center" style={{ width: 50 }}>
              Avatar
            </TableCell>
            <TableCell>
              {i18n.t("users.table.name")}
            </TableCell>
            <TableCell>
              {i18n.t("users.table.email")}
            </TableCell>
            <TableCell align="center">
              {i18n.t("users.table.profile")}
            </TableCell>
            <TableCell align="center">
              {i18n.t("users.table.startWork")}
            </TableCell>
            <TableCell align="center">
              {i18n.t("users.table.endWork")}
            </TableCell>
            <TableCell align="center" style={{ width: 100 }}>
              {i18n.t("users.table.actions")}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} className={classes.tableRow}>
              <TableCell align="center">{user.id}</TableCell>
              <TableCell align="center">
                <UserStatusIcon user={user} />
              </TableCell>
              <TableCell align="center">
                <div className={classes.avatarDiv}>
                  {renderProfileImage(user)}
                </div>
              </TableCell>
              <TableCell style={{
                fontWeight: 500,
                maxWidth: 180,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {user.name}
              </TableCell>
              <TableCell style={{
                maxWidth: 200,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {user.email}
              </TableCell>
              <TableCell align="center">
                <span className={`${classes.tag} ${classes.tagNeutral}`}>
                  {user.profile}
                </span>
              </TableCell>
              <TableCell align="center">{user.startWork}</TableCell>
              <TableCell align="center">{user.endWork}</TableCell>
              <TableCell align="center">
                <IconButton
                  className={classes.actionBtn}
                  onClick={() => handleEditUser(user)}
                  title="Editar"
                >
                  <EditIcon className={classes.actionIcon} />
                </IconButton>
                <IconButton
                  className={classes.actionBtn}
                  onClick={(e) => {
                    setConfirmModalOpen(true);
                    setDeletingUser(user);
                  }}
                  title="Excluir"
                >
                  <DeleteOutlineIcon className={classes.actionIcon} />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          {loadingMore && (
            <TableRow>
              <TableCell colSpan={9} align="center" style={{ padding: 12 }}>
                <CircularProgress size={20} />
              </TableCell>
            </TableRow>
          )}
          {users.length === 0 && !loading && (
            <TableRow>
              <TableCell colSpan={9} align="center" className={classes.emptyRow}>
                {i18n.t("users.table.noUsers") || "Nenhum usuário encontrado."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Container>
      <ConfirmationModal
        title={
          deletingUser &&
          `${i18n.t("users.confirmationModal.deleteTitle")} ${
            deletingUser.name
          }?`
        }
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => handleDeleteUser(deletingUser.id)}
      >
        {i18n.t("users.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <UserModal
        open={userModalOpen}
        onClose={handleCloseUserModal}
        aria-labelledby="form-dialog-title"
        userId={selectedUser && selectedUser.id}
      />
      {loggedInUser.profile === "user" ? (
        <ForbiddenPage />
      ) : (
        <>
          {!renderAsTab && (
            <div className={classes.searchBar}>
              <div className={classes.searchBox}>
                <SearchIcon style={{ fontSize: 14, opacity: 0.4 }} />
                <InputBase
                  placeholder="Filtrar por nome..."
                  className={classes.searchInput}
                  value={searchParam}
                  onChange={handleSearch}
                />
              </div>
            </div>
          )}
          <Paper
            className={classes.mainPaper}
            variant="outlined"
            onScroll={handleScroll}
          >
            {isMobile ? renderMobileCards() : renderDesktopTable()}
            {loading && !loadingMore && (
              <div className={classes.loadingContainer}>
                <CircularProgress size={20} />
                <span className={classes.loadingText}>{i18n.t("loading")}</span>
              </div>
            )}
          </Paper>
          <Tooltip title={i18n.t("users.buttons.add")}>
            <IconButton
              className={`${classes.fab} premium-fab`}
              onClick={handleOpenUserModal}
              aria-label={i18n.t("users.buttons.add")}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        </>
      )}
    </Container>
  );
};

export default Users;
