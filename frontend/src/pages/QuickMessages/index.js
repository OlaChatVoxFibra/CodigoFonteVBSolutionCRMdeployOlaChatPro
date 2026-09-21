/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useReducer, useContext } from "react";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import IconButton from "@material-ui/core/IconButton";
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import Chip from '@material-ui/core/Chip';
import Box from '@material-ui/core/Box';
import ChevronLeft from "@material-ui/icons/ChevronLeft";
import ChevronRight from "@material-ui/icons/ChevronRight";
import Typography from "@material-ui/core/Typography";

import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";

import ActivitiesStyleLayout from "../../components/ActivitiesStyleLayout";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import QuickMessageDialog from "../../components/QuickMessageDialog";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import { isArray } from "lodash";
import { AuthContext } from "../../context/Auth/AuthContext";

const PAGE_SIZE = 500;

const reducer = (state, action) => {
  if (action.type === "LOAD_QUICKMESSAGES") {
    const quickmessages = action.payload;
    if (!isArray(quickmessages)) return state;
    /* Paginação por páginas discretas: cada fetch substitui a lista da página atual */
    return [...quickmessages];
  }

  if (action.type === "UPDATE_QUICKMESSAGES") {
    const quickemessage = action.payload;
    const quickemessageIndex = state.findIndex((u) => u.id === quickemessage.id);

    if (quickemessageIndex !== -1) {
      state[quickemessageIndex] = quickemessage;
      return [...state];
    } else {
      return [quickemessage, ...state];
    }
  }

  if (action.type === "DELETE_QUICKMESSAGE") {
    const quickemessageId = action.payload;

    const quickemessageIndex = state.findIndex((u) => u.id === quickemessageId);
    if (quickemessageIndex !== -1) {
      state.splice(quickemessageIndex, 1);
    }
    return [...state];
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
  fab: {
    position: 'fixed',
    bottom: theme.spacing(3),
    right: theme.spacing(3),
    width: 56,
    height: 56,
    borderRadius: '50%',
    backgroundColor: theme.palette.primary.main,
    color: '#fff',
    boxShadow: `0 8px 24px ${theme.palette.primary.main}4D`
  },
  mediaChip: {
    fontSize: '0.75rem',
    height: 24
  },
  paginationBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing(2),
    flexWrap: "wrap",
    padding: theme.spacing(2, 1, 3),
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.type === "dark"
      ? "rgba(255,255,255,0.03)"
      : theme.palette.background.paper,
  },
  paginationMeta: {
    textAlign: "center",
    minWidth: 200,
  }
}));

const Quickemessages = () => {
  const classes = useStyles();

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedQuickemessage, setSelectedQuickemessage] = useState(null);
  const [deletingQuickemessage, setDeletingQuickemessage] = useState(null);
  const [quickemessageModalOpen, setQuickMessageDialogOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [quickemessages, dispatch] = useReducer(reducer, []);
  const { user, socket } = useContext(AuthContext);

  const { profile } = user;

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchQuickemessages();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const companyId = user.companyId;

    const onQuickMessageEvent = (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_QUICKMESSAGES", payload: data.record });
      }
      if (data.action === "delete") {
        dispatch({ type: "DELETE_QUICKMESSAGE", payload: +data.id });
      }
    };
    socket.on(`company-${companyId}-quickmessage`, onQuickMessageEvent);

    return () => {
      socket.off(`company-${companyId}-quickmessage`, onQuickMessageEvent);
    };
  }, [socket]);

  const fetchQuickemessages = async (explicitPage) => {
    try {
      setLoading(true);
      const page =
        explicitPage !== undefined && explicitPage !== null
          ? explicitPage
          : pageNumber;
      const { data } = await api.get("/quick-messages", {
        params: { searchParam, pageNumber: page },
      });

      dispatch({ type: "LOAD_QUICKMESSAGES", payload: data.records });
      setTotalCount(typeof data.count === "number" ? data.count : Number(data.count) || 0);
      setLoading(false);
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  const handleOpenQuickMessageDialog = () => {
    setSelectedQuickemessage(null);
    setQuickMessageDialogOpen(true);
  };

  const handleCloseQuickMessageDialog = () => {
    setSelectedQuickemessage(null);
    setQuickMessageDialogOpen(false);
    dispatch({ type: "RESET" });
    setPageNumber(1);
    fetchQuickemessages(1);
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleEditQuickemessage = (quickemessage) => {
    setSelectedQuickemessage(quickemessage);
    setQuickMessageDialogOpen(true);
  };

  const handleDeleteQuickemessage = async (quickemessageId) => {
    try {
      await api.delete(`/quick-messages/${quickemessageId}`);
      toast.success(i18n.t("quickemessages.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingQuickemessage(null);
    setSearchParam("");
    setPageNumber(1);
    dispatch({ type: "RESET" });
    fetchQuickemessages(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const rangeFrom = totalCount === 0 ? 0 : (pageNumber - 1) * PAGE_SIZE + 1;
  const rangeTo = totalCount === 0 ? 0 : Math.min(pageNumber * PAGE_SIZE, totalCount);

  const goPrevPage = () => {
    if (pageNumber <= 1 || loading) return;
    setPageNumber((p) => p - 1);
  };

  const goNextPage = () => {
    if (loading || pageNumber >= totalPages) return;
    setPageNumber((p) => p + 1);
  };

  const getMediaTypeDisplay = (quickmessage) => {
    if (!quickmessage.mediaName) {
      return i18n.t("quickMessages.noAttachment");
    }

    const mediaType = quickmessage.mediaType || 'document';
    const getIcon = (type) => {
      switch (type) {
        case 'audio': return '🎵';
        case 'image': return '🖼️';
        case 'video': return '🎥';
        default: return '📎';
      }
    };

    const getColor = (type) => {
      switch (type) {
        case 'audio': return 'secondary';
        case 'image': return 'primary';
        case 'video': return 'default';
        default: return 'default';
      }
    };

    return (
      <Box display="flex" alignItems="center" gap={1}>
        <span>{getIcon(mediaType)}</span>
        <Chip 
          size="small" 
          label={mediaType} 
          color={getColor(mediaType)}
          className={classes.mediaChip}
        />
      </Box>
    );
  };

  return (
    <ActivitiesStyleLayout
      viewModes={[{ value: "list", label: i18n.t("quickMessages.title") }]}
      currentViewMode="list"
      searchPlaceholder={i18n.t("quickMessages.searchPlaceholder")}
      searchValue={searchParam}
      onSearchChange={(v) => handleSearch({ target: { value: v } })}
      hideDefaultRightFilters
      navActions={
        <>
        </>
      }
      onCreateClick={handleOpenQuickMessageDialog}
    >
      <ConfirmationModal
        title={deletingQuickemessage && `${i18n.t("quickMessages.confirmationModal.deleteTitle")} ${deletingQuickemessage.shortcode}?`}
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={() => handleDeleteQuickemessage(deletingQuickemessage.id)}
      >
        {i18n.t("quickMessages.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <QuickMessageDialog
        resetPagination={() => {
          dispatch({ type: "RESET" });
          setPageNumber(1);
          fetchQuickemessages(1);
        }}
        open={quickemessageModalOpen}
        onClose={handleCloseQuickMessageDialog}
        aria-labelledby="form-dialog-title"
        quickemessageId={selectedQuickemessage && selectedQuickemessage.id}
      />
      <Paper
        className={classes.mainPaper}
        variant="outlined"
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">
                {i18n.t("quickMessages.table.shortcode")}
              </TableCell>
              <TableCell align="center">
                Mídia
              </TableCell>
              <TableCell align="center">
                {i18n.t("quickMessages.table.status")}
              </TableCell>
              <TableCell align="center">
                {i18n.t("quickMessages.table.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {quickemessages.map((quickemessage) => (
                <TableRow key={quickemessage.id}>
                  <TableCell align="center">{quickemessage.shortcode}</TableCell>
                  <TableCell align="center">
                    {getMediaTypeDisplay(quickemessage)}
                  </TableCell>
                  <TableCell align="center">
                    {quickemessage.geral === true ? (
                      <CheckCircleIcon style={{ color: 'green' }} />
                    ) : (
                      ''
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleEditQuickemessage(quickemessage)}
                    >
                      <EditIcon />
                    </IconButton>

                    <IconButton
                      size="small"
                      onClick={(e) => {
                        setConfirmModalOpen(true);
                        setDeletingQuickemessage(quickemessage);
                      }}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton columns={4} />}
            </>
          </TableBody>
        </Table>
        <Box className={classes.paginationBar}>
          <IconButton
            aria-label={i18n.t("quickMessages.pagination.prev")}
            onClick={goPrevPage}
            disabled={pageNumber <= 1 || loading}
            size="small"
          >
            <ChevronLeft />
          </IconButton>
          <Box className={classes.paginationMeta}>
            <Typography variant="body2" color="textSecondary" component="div">
              {i18n.t("quickMessages.pagination.pageOf", { page: pageNumber, pages: totalPages })}
            </Typography>
            <Typography variant="caption" color="textSecondary" component="div">
              {rangeFrom}–{rangeTo} · {i18n.t("quickMessages.pagination.total", { total: totalCount })}
            </Typography>
            <Typography variant="caption" color="textSecondary" component="div">
              {i18n.t("quickMessages.pagination.perPage")}
            </Typography>
          </Box>
          <IconButton
            aria-label={i18n.t("quickMessages.pagination.next")}
            onClick={goNextPage}
            disabled={pageNumber >= totalPages || loading}
            size="small"
          >
            <ChevronRight />
          </IconButton>
        </Box>
      </Paper>
    </ActivitiesStyleLayout>
  );
};

export default Quickemessages;
