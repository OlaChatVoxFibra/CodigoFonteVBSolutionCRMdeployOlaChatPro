/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useReducer, useContext, useRef } from "react";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Avatar from "@material-ui/core/Avatar";
import SearchIcon from "@material-ui/icons/Search";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";
import IconButton from "@material-ui/core/IconButton";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import AccountBalanceWalletIcon from "@material-ui/icons/AccountBalanceWallet";
import PersonIcon from "@material-ui/icons/Person";
import QueueIcon from "@material-ui/icons/Queue";

import api from "../../services/api";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import ConfirmationModal from "../../components/ConfirmationModal/";
import { i18n } from "../../translate/i18n";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import MainContainer from "../../components/MainContainer";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Autocomplete from "@material-ui/lab/Autocomplete";
import CircularProgress from "@material-ui/core/CircularProgress";

const reducer = (state, action) => {
  if (action.type === "LOAD_WALLETS") {
    const wallets = action.payload;
    const newWallets = [];

    wallets.forEach((wallet) => {
      const walletIndex = state.findIndex((w) => w.id === wallet.id);
      if (walletIndex !== -1) {
        state[walletIndex] = wallet;
      } else {
        newWallets.push(wallet);
      }
    });

    return [...state, ...newWallets];
  }

  if (action.type === "UPDATE_WALLET") {
    const wallet = action.payload;
    const walletIndex = state.findIndex((w) => w.id === wallet.id);

    if (walletIndex !== -1) {
      state[walletIndex] = wallet;
      return [...state];
    } else {
      return [wallet, ...state];
    }
  }

  if (action.type === "DELETE_WALLET") {
    const walletId = action.payload;
    return state.filter((w) => w.id !== walletId);
  }

  if (action.type === "RESET") {
    return [];
  }
};

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
    backgroundColor: theme.palette.listScrollArea,
  },
  tableRow: {
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
  },
  avatar: {
    width: theme.spacing(4),
    height: theme.spacing(4),
  },
  filterContainer: {
    display: "flex",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
    alignItems: "center",
  },
  formControl: {
    minWidth: 200,
  },
  dialogContent: {
    minWidth: 400,
  },
}));

const Wallets = () => {
  const classes = useStyles();
  const history = useHistory();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchParam, setSearchParam] = useState("");
  const [wallets, dispatch] = useReducer(reducer, []);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [deletingWallet, setDeletingWallet] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [queues, setQueues] = useState([]);
  const [loadingQueues, setLoadingQueues] = useState(false);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam, selectedUserId]);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchWallets = async () => {
        try {
          const { data } = await api.get("/contacts/wallets", {
            params: {
              searchParam,
              pageNumber,
              userId: selectedUserId || undefined,
            },
          });
          dispatch({ type: "LOAD_WALLETS", payload: data.wallets || [] });
          setHasMore(!!data.hasMore);
        } catch (err) {
          toastError(err);
          dispatch({ type: "RESET" });
          setHasMore(false);
        } finally {
          setLoading(false);
        }
      };

      fetchWallets();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber, selectedUserId]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data } = await api.get("/users/");
      setUsers(data.users);
    } catch (err) {
      toastError(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value);
  };

  const handleUserChange = (event) => {
    setSelectedUserId(event.target.value);
  };

  const handleDeleteWallet = async (walletId) => {
    try {
      // Encontra a carteira para obter o contactId
      const wallet = wallets.find(w => w.id === walletId);
      if (!wallet) {
        toast.error("Carteira não encontrada");
        return;
      }
      
      await api.delete(`/contacts/wallet/${wallet.contactId}`);
      dispatch({ type: "DELETE_WALLET", payload: walletId });
      toast.success(i18n.t("wallets.deleteSuccess"));
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenEditModal = (wallet) => {
    setEditingWallet(wallet);
    setSelectedUser({
      id: wallet.userId,
      name: wallet.userName,
    });
    setSelectedQueue(wallet.queueId);
    setQueues([{ id: wallet.queueId, name: wallet.queueName }]);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingWallet(null);
    setSelectedUser(null);
    setSelectedQueue(null);
    setQueues([]);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser || !selectedQueue) {
      toast.error(i18n.t("wallets.selectUserAndQueue"));
      return;
    }

    try {
      await api.put(`/contacts/wallet/${editingWallet.contactId}`, {
        wallets: {
          userId: selectedUser.id,
          queueId: selectedQueue,
        },
      });

      // Atualiza a lista
      const updatedWallet = {
        ...editingWallet,
        userId: selectedUser.id,
        userName: selectedUser.name,
        queueId: selectedQueue,
        queueName: queues.find(q => q.id === selectedQueue)?.name || "",
      };
      dispatch({ type: "UPDATE_WALLET", payload: updatedWallet });

      toast.success(i18n.t("wallets.updateSuccess"));
      handleCloseEditModal();
    } catch (err) {
      toastError(err);
    }
  };

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  const formatPhoneNumber = (number) => {
    if (!number) return "";
    const cleaned = number.replace(/\D/g, "");
    const match = cleaned.match(/^(\d{2})(\d{2})(\d{5})(\d{4})$/);
    if (match) {
      return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}`;
    }
    return number;
  };

  return (
    <MainContainer>
      <MainHeader>
        <Title>
          {/* <AccountBalanceWalletIcon /> */}
          {i18n.t("wallets.title")}
        </Title>
        <MainHeaderButtonsWrapper>
          <TextField
            placeholder={i18n.t("wallets.searchPlaceholder")}
            type="search"
            value={searchParam}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: "gray" }} />
                </InputAdornment>
              ),
            }}
            size="small"
          />
        </MainHeaderButtonsWrapper>
      </MainHeader>

      <Paper className={classes.mainPaper} variant="outlined" onScroll={handleScroll}>
        <div className={classes.filterContainer}>
          <FormControl className={classes.formControl}>
            <InputLabel>{i18n.t("wallets.filterByUser")}</InputLabel>
            <Select
              value={selectedUserId}
              onChange={handleUserChange}
              disabled={loadingUsers}
            >
              <MenuItem value="">
                <em>{i18n.t("wallets.allUsers")}</em>
              </MenuItem>
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>{i18n.t("wallets.contact")}</TableCell>
              <TableCell>{i18n.t("wallets.user")}</TableCell>
              <TableCell>{i18n.t("wallets.queue")}</TableCell>
              <TableCell>{i18n.t("wallets.phone")}</TableCell>
              <TableCell>{i18n.t("wallets.email")}</TableCell>
              <TableCell align="center">{i18n.t("wallets.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {wallets.map((wallet) => (
              <TableRow key={wallet.id} className={classes.tableRow}>
                <TableCell padding="checkbox">
                  <Avatar className={classes.avatar}>
                    {wallet.contactName ? wallet.contactName.charAt(0).toUpperCase() : "?"}
                  </Avatar>
                </TableCell>
                <TableCell>{wallet.contactName}</TableCell>
                <TableCell>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <PersonIcon fontSize="small" />
                    {wallet.userName}
                  </div>
                </TableCell>
                <TableCell>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <QueueIcon fontSize="small" />
                    {wallet.queueName}
                  </div>
                </TableCell>
                <TableCell>{formatPhoneNumber(wallet.contactNumber)}</TableCell>
                <TableCell>{wallet.contactEmail}</TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenEditModal(wallet)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setDeletingWallet(wallet);
                      setConfirmOpen(true);
                    }}
                  >
                    <DeleteOutlineIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {loading && <TableRowSkeleton avatar columns={7} />}
          </TableBody>
        </Table>
      </Paper>

      {/* Modal de Edição */}
      <Dialog open={editModalOpen} onClose={handleCloseEditModal} maxWidth="sm" fullWidth>
        <DialogTitle>{i18n.t("wallets.editWallet")}</DialogTitle>
        <DialogContent className={classes.dialogContent}>
          <div style={{ marginBottom: 16 }}>
            <Autocomplete
              value={selectedUser}
              onChange={(e, newValue) => {
                setSelectedUser(newValue);
                if (newValue && newValue.queues) {
                  setQueues(newValue.queues);
                  if (newValue.queues.length === 1) {
                    setSelectedQueue(newValue.queues[0].id);
                  } else {
                    setSelectedQueue(null);
                  }
                } else {
                  setQueues([]);
                  setSelectedQueue(null);
                }
              }}
              options={users}
              getOptionLabel={(option) => option.name}
              loading={loadingUsers}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={i18n.t("wallets.selectUser")}
                  variant="outlined"
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingUsers ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </div>
          <div>
            <FormControl fullWidth variant="outlined">
              <InputLabel>{i18n.t("wallets.selectQueue")}</InputLabel>
              <Select
                value={selectedQueue || ""}
                onChange={(e) => setSelectedQueue(e.target.value)}
                label={i18n.t("wallets.selectQueue")}
              >
                {queues.map((queue) => (
                  <MenuItem key={queue.id} value={queue.id}>
                    {queue.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditModal} color="secondary">
            {i18n.t("wallets.cancel")}
          </Button>
          <Button onClick={handleSaveEdit} color="primary" variant="contained">
            {i18n.t("wallets.save")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Confirmação */}
      <ConfirmationModal
        title={i18n.t("wallets.confirmDeleteTitle")}
        open={confirmOpen}
        onClose={setConfirmOpen}
        onConfirm={() => {
          handleDeleteWallet(deletingWallet.id);
          setConfirmOpen(false);
        }}
      >
        {i18n.t("wallets.confirmDeleteMessage")}
      </ConfirmationModal>
    </MainContainer>
  );
};

export default Wallets; 
