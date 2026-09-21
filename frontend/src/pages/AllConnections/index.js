/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useCallback, useContext, useEffect } from "react";
import { toast } from "react-toastify";
import { format, parseISO } from "date-fns";

import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import PopupState, { bindTrigger, bindMenu } from "material-ui-popup-state";
import { Stack, Box } from "@mui/material";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import { useHistory } from "react-router-dom";
import { green } from "@material-ui/core/colors";
import {
  Button,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Table,
  TableHead,
  Paper,
  Tooltip,
  Typography,
  CircularProgress,
} from "@material-ui/core";
import {
  Edit,
  CheckCircle,
  SignalCellularConnectedNoInternet2Bar,
  SignalCellularConnectedNoInternet0Bar,
  SignalCellular4Bar,
  CropFree,
  DeleteOutline,
  Facebook,
  Instagram,
  WhatsApp,
} from "@material-ui/icons";

import FacebookLogin from "react-facebook-login/dist/facebook-login-render-props";
import {
  META_FACEBOOK_LOGIN_SCOPE,
  META_INSTAGRAM_LOGIN_SCOPE,
} from "../../config/metaOAuthScopes";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import { AuthContext } from "../../context/Auth/AuthContext";
import useCompanies from "../../hooks/useCompanies";
import api from "../../services/api";
import WhatsAppModal from "../../components/WhatsAppModal";
import WhatsAppModalCompany from "../../components/CompanyWhatsapps";
import ConfirmationModal from "../../components/ConfirmationModal";
import QrcodeModal from "../../components/QrcodeModal";
import { i18n } from "../../translate/i18n";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import toastError from "../../errors/toastError";
import ForbiddenPage from "../../components/ForbiddenPage";

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const border = isDark ? "rgba(255,255,255,0.08)" : "#eaedf0";
  const surfaceBg = isDark ? "rgba(255,255,255,0.03)" : "#ffffff";
  const hoverBg = isDark ? "rgba(255,255,255,0.05)" : "#f8f9fb";
  const font = '"Helvetica Neue", Helvetica, Arial, sans-serif';

  return {
    mainPaper: {
      flex: 1,
      padding: theme.spacing(1),
      overflowY: "scroll",
      borderRadius: "10px",
      boxShadow: "rgba(0, 0, 0, 0.1) 0px 4px 12px",
      ...theme.scrollbarStyles,
      backgroundColor: theme.palette.listScrollArea,
    },
    tabOuterPaper: {
      flex: 1,
      padding: 0,
      overflowY: "auto",
      overflowX: "hidden",
      borderRadius: 0,
      boxShadow: "none",
      border: "none",
      backgroundColor: "transparent",
      ...theme.scrollbarStyles,
    },
    tabStack: {
      overflowY: "auto",
      padding: 0,
      backgroundColor: "transparent",
      borderRadius: 0,
      height: "auto",
      minHeight: 0,
    },
    tabTablePaper: {
      borderRadius: 0,
      boxShadow: "none",
      backgroundColor: "transparent",
      border: "none",
    },
    connectionsPageTitle: {
      fontWeight: 400,
      letterSpacing: "-0.02em",
      color: theme.palette.text.primary,
      fontFamily: font,
    },
    connectionsPageSubtitle: {
      color: theme.palette.text.secondary,
      marginTop: theme.spacing(0.5),
      fontFamily: font,
    },

    /* ── Table wrapper ── */
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
      minWidth: 600,
      fontFamily: font,
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
      transition: "background 0.12s",
      "&:hover": { background: hoverBg },
    },
    totalsRow: {
      "& .MuiTableCell-body": {
        fontWeight: 700,
        fontSize: 12,
        borderBottom: "none",
        background: isDark ? "rgba(255,255,255,0.03)" : "#f9fafb",
        fontFamily: font,
      },
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
    tagActive: {
      background: isDark ? "rgba(16,185,129,0.15)" : "#ecfdf5",
      color: isDark ? "#6ee7b7" : "#059669",
    },
    tagInactive: {
      background: isDark ? "rgba(239,68,68,0.15)" : "#fef2f2",
      color: isDark ? "#fca5a5" : "#dc2626",
    },
    tagNeutral: {
      background: isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6",
      color: isDark ? "rgba(255,255,255,0.5)" : "#6b7280",
    },

    /* ── Mobile cards ── */
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
      justifyContent: "space-between",
      marginBottom: 6,
    },
    cardName: {
      fontSize: 13,
      fontWeight: 600,
      color: theme.palette.text.primary,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      flex: 1,
      fontFamily: font,
    },
    cardRow: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap",
    },

    /* ── Action buttons ── */
    editIcon: {
      fontSize: 14,
      color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.25)",
    },

    /* ── Tooltip ── */
    tooltip: {
      backgroundColor: "#f5f5f9",
      color: "rgba(0, 0, 0, 0.87)",
      fontSize: theme.typography.pxToRem(14),
      border: "1px solid #dadde9",
      maxWidth: 450,
    },
    tooltipPopper: {
      textAlign: "center",
    },
    buttonProgress: {
      color: green[500],
    },
    customTableCell: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
  };
});

const CustomToolTip = ({ title, content, children }) => {
  const classes = useStyles();

  return (
    <Tooltip
      arrow
      classes={{
        tooltip: classes.tooltip,
        popper: classes.tooltipPopper,
      }}
      title={
        <React.Fragment>
          <Typography gutterBottom color="inherit">
            {title}
          </Typography>
          {content && <Typography>{content}</Typography>}
        </React.Fragment>
      }
    >
      {children}
    </Tooltip>
  );
};

const IconChannel = (channel) => {
  switch (channel) {
    case "facebook":
      return <Facebook />;
    case "instagram":
      return <Instagram />;
    case "whatsapp":
      return <WhatsApp />;
    default:
      return "error";
  }
};

const AllConnections = ({ renderAsTab }) => {
  const classes = useStyles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("xs"));
  const { user, socket } = useContext(AuthContext);
  const { list } = useCompanies();
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(true);
  const [loadingComp, setLoadingComp] = useState(false);
  const [whats, setWhats] = useState([]);
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedWhatsApp, setSelectedWhatsApp] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [filterConnections, setFilterConnections] = useState([]);
  const [companyWhatsApps, setCompanyWhatsApps] = useState(null);
  const confirmationModalInitialState = {
    action: "",
    title: "",
    message: "",
    whatsAppId: "",
    open: false,
  };
  const [confirmModalInfo, setConfirmModalInfo] = useState(
    confirmationModalInitialState
  );

  const history = useHistory();
  if (!user.super && !renderAsTab) {
    history.push("/tickets");
  }

  useEffect(() => {
    setLoadingWhatsapp(true);
    const fetchSession = async () => {
      try {
        const { data } = await api.get("/whatsapp/all/?session=0");
        setWhats(data);
        setLoadingWhatsapp(false);
      } catch (err) {
        setLoadingWhatsapp(false);
        toastError(err);
      }
    };
    fetchSession();
  }, []);

  const responseFacebook = (response) => {
    if (response.status !== "unknown") {
      const { accessToken, id } = response;

      api
        .post("/facebook", {
          facebookUserId: id,
          facebookUserToken: accessToken,
        })
        .then((response) => {
          toast.success(i18n.t("connections.facebook.success"));
        })
        .catch((error) => {
          toastError(error);
        });
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setLoadingComp(true);
    try {
      const companyList = await list();
      setCompanies(companyList);
    } catch (e) {
      toast.error("Não foi possível carregar a lista de registros");
    }
    setLoadingComp(false);
  };

  const responseInstagram = (response) => {
    if (response.status !== "unknown") {
      const { accessToken, id } = response;

      api
        .post("/facebook", {
          addInstagram: true,
          facebookUserId: id,
          facebookUserToken: accessToken,
        })
        .then((response) => {
          toast.success(i18n.t("connections.facebook.success"));
        })
        .catch((error) => {
          toastError(error);
        });
    }
  };

  const handleStartWhatsAppSession = async (whatsAppId) => {
    try {
      await api.post(`/whatsappsession/${whatsAppId}`);
    } catch (err) {
      toastError(err);
    }
  };

  const handleRequestNewQrCode = async (whatsAppId) => {
    try {
      await api.put(`/whatsappsession/${whatsAppId}`);
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenWhatsAppModal = (whatsappsFilter, comp) => {
    setSelectedWhatsApp(null);
    setFilterConnections(whatsappsFilter || []);
    setCompanyWhatsApps(comp || null);
    setWhatsAppModalOpen(true);
  };

  const handleCloseWhatsAppModal = useCallback(() => {
    setWhatsAppModalOpen(false);
    setSelectedWhatsApp(null);
    setFilterConnections([]);
    setCompanyWhatsApps(null);
  }, [setSelectedWhatsApp, setWhatsAppModalOpen]);

  const handleOpenQrModal = (whatsApp) => {
    setSelectedWhatsApp(whatsApp);
    setQrModalOpen(true);
  };

  const handleCloseQrModal = useCallback(() => {
    setSelectedWhatsApp(null);
    setQrModalOpen(false);
  }, [setQrModalOpen, setSelectedWhatsApp]);

  const handleEditWhatsApp = (whatsApp) => {
    setSelectedWhatsApp(whatsApp);
    setWhatsAppModalOpen(true);
  };

  const handleOpenConfirmationModal = (action, whatsAppId) => {
    if (action === "disconnect") {
      setConfirmModalInfo({
        action: action,
        title: i18n.t("connections.confirmationModal.disconnectTitle"),
        message: i18n.t("connections.confirmationModal.disconnectMessage"),
        whatsAppId: whatsAppId,
      });
    }

    if (action === "delete") {
      setConfirmModalInfo({
        action: action,
        title: i18n.t("connections.confirmationModal.deleteTitle"),
        message: i18n.t("connections.confirmationModal.deleteMessage"),
        whatsAppId: whatsAppId,
      });
    }
    setConfirmModalOpen(true);
  };

  const handleSubmitConfirmationModal = async () => {
    if (confirmModalInfo.action === "disconnect") {
      try {
        await api.delete(`/whatsappsession/${confirmModalInfo.whatsAppId}`);
      } catch (err) {
        toastError(err);
      }
    }

    if (confirmModalInfo.action === "delete") {
      try {
        await api.delete(`/whatsapp/${confirmModalInfo.whatsAppId}`);
        toast.success(i18n.t("connections.toasts.deleted"));
      } catch (err) {
        toastError(err);
      }
    }

    setConfirmModalInfo(confirmationModalInitialState);
  };

  const renderActionButtons = (whatsApp) => {
    return (
      <>
        {whatsApp.status === "qrcode" && (
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={() => handleOpenQrModal(whatsApp)}
          >
            {i18n.t("connections.buttons.qrcode")}
          </Button>
        )}
        {whatsApp.status === "DISCONNECTED" && (
          <>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              onClick={() => handleStartWhatsAppSession(whatsApp.id)}
            >
              {i18n.t("connections.buttons.tryAgain")}
            </Button>{" "}
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              onClick={() => handleRequestNewQrCode(whatsApp.id)}
            >
              {i18n.t("connections.buttons.newQr")}
            </Button>
          </>
        )}
        {(whatsApp.status === "CONNECTED" ||
          whatsApp.status === "PAIRING" ||
          whatsApp.status === "TIMEOUT") && (
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            onClick={() => {
              handleOpenConfirmationModal("disconnect", whatsApp.id);
            }}
          >
            {i18n.t("connections.buttons.disconnect")}
          </Button>
        )}
        {whatsApp.status === "OPENING" && (
          <Button size="small" variant="outlined" disabled color="default">
            {i18n.t("connections.buttons.connecting")}
          </Button>
        )}
      </>
    );
  };

  const renderStatusToolTips = (whatsApp) => {
    return (
      <div className={classes.customTableCell}>
        {whatsApp.status === "DISCONNECTED" && (
          <CustomToolTip
            title={i18n.t("connections.toolTips.disconnected.title")}
            content={i18n.t("connections.toolTips.disconnected.content")}
          >
            <SignalCellularConnectedNoInternet0Bar color="secondary" />
          </CustomToolTip>
        )}
        {whatsApp.status === "OPENING" && (
          <CircularProgress size={24} className={classes.buttonProgress} />
        )}
        {whatsApp.status === "qrcode" && (
          <CustomToolTip
            title={i18n.t("connections.toolTips.qrcode.title")}
            content={i18n.t("connections.toolTips.qrcode.content")}
          >
            <CropFree />
          </CustomToolTip>
        )}
        {whatsApp.status === "CONNECTED" && (
          <CustomToolTip title={i18n.t("connections.toolTips.connected.title")}>
            <SignalCellular4Bar style={{ color: green[500] }} />
          </CustomToolTip>
        )}
        {(whatsApp.status === "TIMEOUT" || whatsApp.status === "PAIRING") && (
          <CustomToolTip
            title={i18n.t("connections.toolTips.timeout.title")}
            content={i18n.t("connections.toolTips.timeout.content")}
          >
            <SignalCellularConnectedNoInternet2Bar color="secondary" />
          </CustomToolTip>
        )}
      </div>
    );
  };

  const getConnectedCount = (companyId) => {
    if (!whats?.length) return 0;
    return whats.filter(
      (item) => item?.companyId === companyId && item?.status === "CONNECTED"
    ).length;
  };

  const getDisconnectedCount = (companyId) => {
    if (!whats?.length) return 0;
    return whats.filter(
      (item) => item?.companyId === companyId && item?.status !== "CONNECTED"
    ).length;
  };

  const getTotalCount = (companyId) => {
    if (!whats?.length) return 0;
    return whats.filter((item) => item?.companyId === companyId).length;
  };

  const totalConnected = whats?.length
    ? whats.filter((item) => item?.status === "CONNECTED").length
    : 0;
  const totalDisconnected = whats?.length
    ? whats.filter((item) => item?.status !== "CONNECTED").length
    : 0;
  const totalAll = whats?.length || 0;

  const Container = renderAsTab
    ? ({ children, className }) => (
        <Box
          width="100%"
          display="flex"
          flexDirection="column"
          flex={1}
          minHeight={0}
          className={className}
        >
          {children}
        </Box>
      )
    : MainContainer;

  const renderMobileCards = () => (
    <div className={classes.cardList}>
      {companies?.length > 0 &&
        companies.map((company) => (
          <div key={company.id} className={classes.card}>
            <div className={classes.cardHeader}>
              <span className={classes.cardName}>{company?.name}</span>
              {user.profile === "admin" && (
                <IconButton
                  size="small"
                  style={{ padding: 3 }}
                  onClick={() =>
                    handleOpenWhatsAppModal(
                      whats.filter(
                        (item) => item?.companyId === company?.id
                      ),
                      company
                    )
                  }
                >
                  <Edit className={classes.editIcon} />
                </IconButton>
              )}
            </div>
            <div className={classes.cardRow}>
              <span className={`${classes.tag} ${classes.tagActive}`}>
                {getConnectedCount(company.id)} conectadas
              </span>
              <span className={`${classes.tag} ${classes.tagInactive}`}>
                {getDisconnectedCount(company.id)} desconectadas
              </span>
              <span className={`${classes.tag} ${classes.tagNeutral}`}>
                {getTotalCount(company.id)} total
              </span>
            </div>
          </div>
        ))}
      {/* Totals card */}
      {companies?.length > 0 && (
        <div className={classes.card} style={{ borderWidth: 2 }}>
          <div className={classes.cardHeader}>
            <span className={classes.cardName}>
              {i18n.t("connections.total")}
            </span>
          </div>
          <div className={classes.cardRow}>
            <span className={`${classes.tag} ${classes.tagActive}`}>
              {totalConnected} conectadas
            </span>
            <span className={`${classes.tag} ${classes.tagInactive}`}>
              {totalDisconnected} desconectadas
            </span>
            <span className={`${classes.tag} ${classes.tagNeutral}`}>
              {totalAll} total
            </span>
          </div>
        </div>
      )}
      {(!companies || companies.length === 0) && !loadingWhatsapp && (
        <div
          style={{
            textAlign: "center",
            padding: 24,
            opacity: 0.5,
            fontSize: 12,
          }}
        >
          Nenhuma conexão encontrada.
        </div>
      )}
    </div>
  );

  const renderDesktopTable = () => (
    <div className={classes.tableWrap}>
      <Table className={classes.table} aria-label="connections table">
        <TableHead>
          <TableRow>
            <TableCell>{i18n.t("connections.client")}</TableCell>
            <TableCell align="center">
              {i18n.t("connections.connectedConnections")}
            </TableCell>
            <TableCell align="center">
              {i18n.t("connections.disconnectedConnections")}
            </TableCell>
            <TableCell align="center">
              {i18n.t("connections.totalConnections")}
            </TableCell>
            {user.profile === "admin" && (
              <TableCell align="center" style={{ width: 60 }}>
                {i18n.t("connections.table.actions")}
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {loadingWhatsapp ? (
            <TableRowSkeleton />
          ) : (
            <>
              {companies?.length > 0 &&
                companies.map((company) => (
                  <TableRow key={company.id} className={classes.tableRow}>
                    <TableCell
                      style={{
                        fontWeight: 500,
                        maxWidth: 220,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {company?.name}
                    </TableCell>
                    <TableCell align="center">
                      <span
                        className={`${classes.tag} ${classes.tagActive}`}
                      >
                        {getConnectedCount(company.id)}
                      </span>
                    </TableCell>
                    <TableCell align="center">
                      <span
                        className={`${classes.tag} ${classes.tagInactive}`}
                      >
                        {getDisconnectedCount(company.id)}
                      </span>
                    </TableCell>
                    <TableCell align="center">
                      <span
                        className={`${classes.tag} ${classes.tagNeutral}`}
                      >
                        {getTotalCount(company.id)}
                      </span>
                    </TableCell>
                    {user.profile === "admin" && (
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          style={{ padding: 3 }}
                          onClick={() =>
                            handleOpenWhatsAppModal(
                              whats.filter(
                                (item) =>
                                  item?.companyId === company?.id
                              ),
                              company
                            )
                          }
                        >
                          <Edit className={classes.editIcon} />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              {/* Totals row */}
              {companies?.length > 0 && (
                <TableRow className={classes.totalsRow}>
                  <TableCell style={{ fontWeight: 700 }}>
                    {i18n.t("connections.total")}
                  </TableCell>
                  <TableCell align="center">
                    <span
                      className={`${classes.tag} ${classes.tagActive}`}
                    >
                      {totalConnected}
                    </span>
                  </TableCell>
                  <TableCell align="center">
                    <span
                      className={`${classes.tag} ${classes.tagInactive}`}
                    >
                      {totalDisconnected}
                    </span>
                  </TableCell>
                  <TableCell align="center">
                    <span
                      className={`${classes.tag} ${classes.tagNeutral}`}
                    >
                      {totalAll}
                    </span>
                  </TableCell>
                  {user.profile === "admin" && (
                    <TableCell align="center" />
                  )}
                </TableRow>
              )}
              {(!companies || companies.length === 0) && (
                <TableRow>
                  <TableCell
                    colSpan={user.profile === "admin" ? 5 : 4}
                    align="center"
                    style={{ padding: 28, opacity: 0.5, fontSize: 12 }}
                  >
                    Nenhuma conexão encontrada.
                  </TableCell>
                </TableRow>
              )}
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Container
      className={renderAsTab ? classes.tabOuterPaper : classes.mainPaper}
    >
      <ConfirmationModal
        title={confirmModalInfo.title}
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={handleSubmitConfirmationModal}
      >
        {confirmModalInfo.message}
      </ConfirmationModal>
      <QrcodeModal
        open={qrModalOpen}
        onClose={handleCloseQrModal}
        whatsAppId={!whatsAppModalOpen && selectedWhatsApp?.id}
      />
      <WhatsAppModalCompany
        open={whatsAppModalOpen}
        onClose={handleCloseWhatsAppModal}
        filteredWhatsapps={filterConnections}
        companyInfos={companyWhatsApps}
        whatsAppId={!qrModalOpen && selectedWhatsApp?.id}
      />

      {user.profile === "user" ? (
        <ForbiddenPage />
      ) : (
        <>
          <Paper
            className={renderAsTab ? classes.tabOuterPaper : classes.mainPaper}
            style={
              renderAsTab ? { overflow: "visible" } : { overflow: "hidden" }
            }
            variant={renderAsTab ? "elevation" : "outlined"}
            elevation={renderAsTab ? 0 : undefined}
            square={renderAsTab}
          >
            <MainHeader>
              <Stack>
                <Typography
                  variant="h5"
                  className={classes.connectionsPageTitle}
                  style={{
                    marginLeft: renderAsTab ? 0 : "10px",
                    marginTop: renderAsTab ? 0 : "10px",
                  }}
                  gutterBottom
                >
                  Gerenciar Conexões
                </Typography>
                <Typography
                  className={classes.connectionsPageSubtitle}
                  style={{
                    marginLeft: renderAsTab ? 0 : "10px",
                  }}
                  variant="caption"
                  color="textSecondary"
                >
                  {i18n.t(
                    "connections.connectYourServiceChannelsToReceiveMessagesAndStartConversationsWithYourCustomers"
                  )}
                </Typography>
              </Stack>

              <MainHeaderButtonsWrapper>
                <PopupState variant="popover" popupId="demo-popup-menu">
                  {(popupState) => (
                    <React.Fragment>
                      <Menu {...bindMenu(popupState)}>
                        <MenuItem
                          onClick={() => {
                            handleOpenWhatsAppModal();
                            popupState.close();
                          }}
                        >
                          <WhatsApp
                            fontSize="small"
                            style={{
                              marginRight: "10px",
                            }}
                          />
                          WhatsApp
                        </MenuItem>
                        <FacebookLogin
                          appId={process.env.REACT_APP_FACEBOOK_APP_ID}
                          autoLoad={false}
                          fields="name,email,picture"
                          version="19.0"
                          redirectUri={
                            typeof window !== "undefined"
                              ? window.location.origin
                              : undefined
                          }
                          scope={META_FACEBOOK_LOGIN_SCOPE}
                          callback={responseFacebook}
                          render={(renderProps) => (
                            <MenuItem onClick={renderProps.onClick}>
                              <Facebook
                                fontSize="small"
                                style={{
                                  marginRight: "10px",
                                }}
                              />
                              Facebook
                            </MenuItem>
                          )}
                        />

                        <FacebookLogin
                          appId={process.env.REACT_APP_FACEBOOK_APP_ID}
                          autoLoad={false}
                          fields="name,email,picture"
                          version="19.0"
                          redirectUri={
                            typeof window !== "undefined"
                              ? window.location.origin
                              : undefined
                          }
                          scope={META_INSTAGRAM_LOGIN_SCOPE}
                          callback={responseInstagram}
                          render={(renderProps) => (
                            <MenuItem onClick={renderProps.onClick}>
                              <Instagram
                                fontSize="small"
                                style={{
                                  marginRight: "10px",
                                }}
                              />
                              Instagram
                            </MenuItem>
                          )}
                        />
                      </Menu>
                    </React.Fragment>
                  )}
                </PopupState>
              </MainHeaderButtonsWrapper>
            </MainHeader>
            <Stack
              className={renderAsTab ? classes.tabStack : undefined}
              style={
                renderAsTab
                  ? undefined
                  : {
                      overflowY: "auto",
                      padding: "20px",
                      borderRadius: "5px",
                      height: "93%",
                    }
              }
            >
              {isMobile ? renderMobileCards() : renderDesktopTable()}
            </Stack>
          </Paper>
        </>
      )}
    </Container>
  );
};

export default AllConnections;
