/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useContext } from "react";
import { useLocation } from "react-router-dom";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";

import TabPanel from "../../components/TabPanel/index.js";

import SchedulesForm from "../../components/SchedulesForm";
import Options from "../../components/Settings/Options.js";
import Whitelabel from "../../components/Settings/Whitelabel.js";
import FinalizacaoAtendimento from "../../components/Settings/FinalizacaoAtendimento";
import Users from "../Users";
import AllConnections from "../AllConnections";


import { i18n } from "../../translate/i18n.js";
import { toast } from "react-toastify";

import useCompanies from "../../hooks/useCompanies";
import { AuthContext } from "../../context/Auth/AuthContext";

import useCompanySettings from "../../hooks/useSettings/companySettings";
import useSettings from "../../hooks/useSettings";
import ForbiddenPage from "../../components/ForbiddenPage/index.js";
import ActivitiesStyleLayout from "../../components/ActivitiesStyleLayout/index.js";
import { canAccessVisualIdentityUi } from "../../helpers/visualIdentityAccess.js";
import {
  hasFullSettingsUi,
  isFullOrgSettingsAdmin,
  isPlatformAdminEmail,
} from "../../constants/fullOrgSettingsAdmin.js";
import BrainTokenLogsPage from "../../components/BrainTokenLogsPage";
import StripeAssinaturasHub from "../../components/StripeAssinaturasHub";
import PlansManager from "../../components/PlansManager";
import OrgBrainTokenLogsPanel from "../../components/Settings/OrgBrainTokenLogsPanel.js";

const settingsFontStack = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const useStyles = makeStyles((theme) => ({
  /** Tipografia /settings: Helvetica Neue; títulos como modal Nova Atividade (h6, peso normal) */
  settingsRoot: {
    fontFamily: settingsFontStack,
    height: "calc(100vh - 32px)",
    minHeight: "0 !important",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    [theme.breakpoints.down("sm")]: {
      height: "calc(100vh - 56px)",
    },
    ...(theme.palette.type === "dark"
      ? {
          color: theme.palette.text.primary,
          "& .MuiTableCell-body": {
            color: theme.palette.text.primary,
            borderBottomColor: "rgba(255, 255, 255, 0.08)",
          },
          "& .MuiTableCell-head": {
            color: theme.palette.text.secondary,
            borderBottomColor: "rgba(255, 255, 255, 0.12)",
          },
        }
      : {}),
    "& .MuiTypography-h6": {
      fontFamily: settingsFontStack,
      fontWeight: 400,
    },
    "& .MuiTypography-h5": {
      fontFamily: settingsFontStack,
      fontWeight: 400,
    },
    "& .MuiTypography-h4": {
      fontFamily: settingsFontStack,
      fontWeight: 400,
    },
    "& .MuiTypography-subtitle1": {
      fontFamily: settingsFontStack,
      fontWeight: 400,
    },
    "& .MuiTypography-subtitle2": {
      fontFamily: settingsFontStack,
      fontWeight: 400,
    },
    "& .MuiTypography-body1": {
      fontFamily: settingsFontStack,
    },
    "& .MuiTypography-body2": {
      fontFamily: settingsFontStack,
    },
    "& .MuiTypography-caption": {
      fontFamily: settingsFontStack,
    },
    "& .MuiButton-root": {
      fontFamily: settingsFontStack,
      fontSize: "0.75rem",
      padding: "4px 14px",
      minWidth: 0,
      minHeight: 32,
      maxHeight: 32,
      lineHeight: 1.4,
      textTransform: "none",
      borderRadius: 6,
    },
    "& .MuiButton-containedPrimary, & .MuiButton-outlinedPrimary, & .MuiButton-textPrimary": {
      fontSize: "0.75rem",
      padding: "4px 14px",
    },
    "& .MuiIconButton-root": {
      padding: 6,
    },
    "& .MuiInputBase-root": {
      fontFamily: settingsFontStack,
    },
    "& .MuiFormLabel-root": {
      fontFamily: settingsFontStack,
    },
    "& .MuiTab-root": {
      fontFamily: settingsFontStack,
      fontWeight: 400,
    },
    "& .MuiTableCell-head": {
      fontFamily: settingsFontStack,
      fontWeight: 400,
    },
    "& .MuiTableCell-body": {
      fontFamily: settingsFontStack,
    },
  },
  root: {
    flex: 1,
    backgroundColor: "transparent",
    "& *": theme.palette.type === "dark" ? {
      borderColor: "rgba(255,255,255,0.08) !important",
    } : {},
  },
  mainPaper: {
    overflowY: "visible",
    overflowX: "hidden",
    flex: "none",
  },
  paper: {
    overflowY: "visible",
    overflowX: "hidden",
    padding: theme.spacing(1.25, 1.5, 2),
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
    alignSelf: "stretch",
    alignItems: "stretch",
    width: "100%",
    maxWidth: "100%",
    margin: 0,
    borderRadius: 0,
    backgroundColor: "transparent",
    boxSizing: "border-box",
    fontFamily: settingsFontStack,
    [theme.breakpoints.up("sm")]: {
      padding: theme.spacing(1.25, 2, 2),
    },
    [theme.breakpoints.up("md")]: {
      padding: theme.spacing(1.5, 2.5, 2.5),
    },
  },
  container: {
    width: "100%",
    maxHeight: "none",
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    alignSelf: "stretch",
  },
  /** Planos / Assinaturas — edge-to-edge, preenche altura da aba */
  paperFlush: {
    padding: 0,
    flex: 1,
    minHeight: 0,
    height: "100%",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  containerFlush: {
    flex: 1,
    minHeight: 0,
    height: "100%",
    width: "100%",
    maxWidth: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  control: {
    padding: theme.spacing(1),
  },
  textfield: {
    width: "100%",
  },
}));

const SettingsCustom = () => {
  const classes = useStyles();
  const theme = useTheme();
  const [tab, setTab] = useState("whitelabel");
  const [schedules, setSchedules] = useState([]);
  const [company, setCompany] = useState({});
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState({});
  const [settings, setSettings] = useState({});
  const [oldSettings, setOldSettings] = useState({});
  const [schedulesEnabled, setSchedulesEnabled] = useState(false);
  const [usersSearchParam, setUsersSearchParam] = useState("");

  const { find, updateSchedules } = useCompanies();

  //novo hook
  const { getAll: getAllSettings } = useCompanySettings();
  const { getAll: getAllSettingsOld } = useSettings();
  const { user, socket } = useContext(AuthContext);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const initialTab = params.get("tab");
    if (initialTab === "tags" || initialTab === "options") {
      setTab("config_atendimento");
    } else if (initialTab && initialTab !== "financeiro") {
      setTab(initialTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === "financeiro" || tab === "announcements" || tab === "options") {
      setTab("config_atendimento");
    }
  }, [tab]);

  /** Mantém o mesmo objeto do login no estado local (evita tabs admin com currentUser vazio). */
  useEffect(() => {
    if (user) setCurrentUser(user);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.companyId, user?.profile]);

  useEffect(() => {
    async function findData() {
      if (!user || !user.companyId) {
        return;
      }

      setLoading(true);
      try {
        const companyId = user.companyId;

        const company = await find(companyId);

        const settingList = await getAllSettings(companyId);

        const settingListOld = await getAllSettingsOld();

        setCompany(company);
        setSchedules(company.schedules);
        setSettings(settingList);
        setOldSettings(settingListOld);

        setSchedulesEnabled(settingList.scheduleType === "company");
        setCurrentUser(user);
      } catch (e) {
        toast.error(e);
      }
      setLoading(false);
    }
    findData();
    // Recarrega dados da empresa quando o usuário logado muda (find/getAll vêm dos hooks).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.companyId]);

  useEffect(() => {
    if (!socket || !user || !user.companyId) return;
    const onSettingsEvent = () => {
      getAllSettingsOld().then(setOldSettings);
    };
    socket.on(`company-${user.companyId}-settings`, onSettingsEvent);
    return () => {
      socket.off(`company-${user.companyId}-settings`, onSettingsEvent);
    };
  }, [socket, user?.companyId]);

  const handleSubmitSchedules = async (data) => {
    setLoading(true);
    try {
      setSchedules(data);
      await updateSchedules({ id: company.id, schedules: data });
      toast.success("Horários atualizados com sucesso.");
    } catch (e) {
      toast.error(e);
    }
    setLoading(false);
  };

  /** Usar sempre `user` do AuthContext — `currentUser` podia ficar {} se o primeiro fetch rodasse antes do login hidratar. */
  const isPlatformAdmin = () => isPlatformAdminEmail(user?.email);

  /** Identidade visual: helper único (allowlist, empresa 1, flag manual, WL, etc.). */
  const canIdentityVisualTab = () =>
    canAccessVisualIdentityUi(user) || isFullOrgSettingsAdmin(user);

  /** Assinaturas / Planos: somente admin plataforma (admin@admin.com). */
  const canStripeAdminTabs = () => isPlatformAdmin();
  const canBrainLogsTab = () => hasFullSettingsUi(user);
  const canPlatformBrainLogs = () => isPlatformAdmin();
  const canOrgBrainLogs = () =>
    isFullOrgSettingsAdmin(user) && !isPlatformAdmin();

  const baseTabs = [
    ...(canIdentityVisualTab() ? [{ value: "whitelabel", label: "Identidade Visual" }] : []),
    ...(canStripeAdminTabs() ? [{ value: "companies", label: "Assinaturas" }] : []),
    ...(canStripeAdminTabs() ? [{ value: "plans", label: "Planos" }] : []),
    { value: "users", label: "Usuários" },
    { value: "connections", label: "Gerenciar Conexões" },
    { value: "config_atendimento", label: "Configuração Atendimento" },
    ...(canBrainLogsTab() ? [{ value: "brain_token_logs", label: "Logs Tokens" }] : []),
  ];
  const settingsTabs = baseTabs;

  useEffect(() => {
    if (baseTabs.length > 0 && !baseTabs.find((t) => t.value === tab)) {
      setTab(baseTabs[0].value);
    }
  }, [baseTabs.length]);

  return (
    <>
      {user.profile === "user" ? (
        <ForbiddenPage />
      ) : (
        <ActivitiesStyleLayout
          title={i18n.t("settings.title")}
          viewModes={settingsTabs}
          currentViewMode={tab}
          onViewModeChange={setTab}
          searchPlaceholder={tab === "users" ? "Filtrar por nome..." : "Buscar configurações..."}
          searchValue={tab === "users" ? usersSearchParam : ""}
          onSearchChange={tab === "users" ? (val) => setUsersSearchParam(val) : undefined}
          disableFilterBar={tab !== "users"}
          hideSearch={tab !== "users"}
          hideDefaultRightFilters={true}
          hideLeftIcon={false}
          enableTabsScroll={true}
          contentEdgeToEdge={true}
          scrollContent={tab !== "companies"}
          compactHeader={tab === "companies" || tab === "plans"}
          hideNavDivider={tab !== "users"}
          hideHeaderDivider={true}
          rootClassName={classes.settingsRoot}
        >
            <Paper
              className={`${classes.paper} ${
                tab === "companies" ? classes.paperFlush : ""
              }`}
              elevation={0}
            >
              {canIdentityVisualTab() && (
                <TabPanel
                  className={classes.container}
                  value={tab}
                  name={"whitelabel"}
                >
                  <Whitelabel settings={oldSettings} />
                </TabPanel>
              )}
              {canStripeAdminTabs() && (
                <TabPanel
                  className={`${classes.container} ${classes.containerFlush}`}
                  value={tab}
                  name={"companies"}
                >
                  <StripeAssinaturasHub />
                </TabPanel>
              )}
              {canStripeAdminTabs() && (
                <TabPanel
                  className={classes.container}
                  value={tab}
                  name={"plans"}
                >
                  <PlansManager />
                </TabPanel>
              )}
              <TabPanel
                className={classes.container}
                value={tab}
                name={"users"}
              >
                <Users renderAsTab={true} externalSearchParam={usersSearchParam} />
              </TabPanel>
              <TabPanel
                className={classes.container}
                value={tab}
                name={"connections"}
              >
                <AllConnections renderAsTab={true} />
              </TabPanel>
              <TabPanel
                className={classes.container}
                value={tab}
                name={"config_atendimento"}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1 }}>
                  {user.profile === "admin" && user.finalizacaoComValorVendaAtiva && (
                    <FinalizacaoAtendimento
                      settings={settings}
                      onSettingsChange={(newSettings) => setSettings(newSettings)}
                    />
                  )}
                  <Options
                    settings={settings}
                    oldSettings={oldSettings}
                    user={user || currentUser}
                    scheduleTypeChanged={(value) =>
                      setSchedulesEnabled(value === "company")
                    }
                  />
                  {schedulesEnabled && (
                    <SchedulesForm
                      loading={loading}
                      onSubmit={handleSubmitSchedules}
                      initialValues={schedules}
                    />
                  )}
                </div>
              </TabPanel>
              {canPlatformBrainLogs() && (
                <TabPanel
                  className={classes.container}
                  value={tab}
                  name={"brain_token_logs"}
                >
                  <BrainTokenLogsPage />
                </TabPanel>
              )}
              {canOrgBrainLogs() && (
                <TabPanel
                  className={classes.container}
                  value={tab}
                  name={"brain_token_logs"}
                >
                  <OrgBrainTokenLogsPanel />
                </TabPanel>
              )}
            </Paper>
        </ActivitiesStyleLayout>
      )}
    </>
  );
};

export default SettingsCustom;
