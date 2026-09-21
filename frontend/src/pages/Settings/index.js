/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useContext } from "react";
import { useLocation } from "react-router-dom";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import { makeStyles, Paper, Tabs, Tab } from "@material-ui/core";

import TabPanel from "../../components/TabPanel";

import SchedulesForm from "../../components/SchedulesForm";
import CompaniesManager from "../../components/CompaniesManager";
import PlansManager from "../../components/PlansManager";
import HelpsManager from "../../components/HelpsManager";
import Options from "../../components/Settings/Options";
import BrainTokenLogsPage from "../../components/BrainTokenLogsPage";
import Whitelabel from "../../components/Settings/Whitelabel";
import FinalizacaoAtendimento from "../../components/Settings/FinalizacaoAtendimento";

import { i18n } from "../../translate/i18n";
import { toast } from "react-toastify";

import useCompanies from "../../hooks/useCompanies";
import { AuthContext } from "../../context/Auth/AuthContext";
import { isPlatformAdminEmail } from "../../constants/fullOrgSettingsAdmin";

import OnlyForSuperUser from "../../components/OnlyForSuperUser";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import useSettings from "../../hooks/useSettings";
import ForbiddenPage from "../../components/ForbiddenPage";

const useStyles = makeStyles((theme) => ({
  root: {
    flex: 1,
    backgroundColor:
      theme.palette.type === "dark"
        ? theme.palette.background.default
        : theme.palette.background.paper,
  },
  mainPaper: {
    ...theme.scrollbarStyles,
    overflowY: "auto",
    flex: 1,
  },
  tab: {
    backgroundColor: theme.mode === "light" ? "#f2f2f2" : "#7f7f7f",
    borderRadius: 4,
  },
  paper: {
    overflowY: "visible",
    padding: theme.spacing(2),
    display: "flex",
    alignItems: "center",
    width: "100%",
  },
  container: {
    width: "100%",
    maxHeight: "100%",
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
  const [tab, setTab] = useState("options");
  const [schedules, setSchedules] = useState([]);
  const [company, setCompany] = useState({});
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState({});
  const [settings, setSettings] = useState({});
  const [oldSettings, setOldSettings] = useState({});
  const [schedulesEnabled, setSchedulesEnabled] = useState(false);

  const { find, updateSchedules } = useCompanies();

  const { getAll: getAllSettings } = useCompanySettings();
  const { getAll: getAllSettingsOld } = useSettings();
  const { user, socket } = useContext(AuthContext);

  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const initialTab = params.get("tab");
    if (initialTab) {
      setTab(initialTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  }, []);

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

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

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

  const isSuper = () => {
    return currentUser && currentUser.super;
  };

  const isPlatformBrainAdmin = () => {
    return isPlatformAdminEmail(user?.email);
  };

  return (
    <MainContainer className={classes.root}>
      {user.profile === "user" ? (
        <ForbiddenPage />
      ) : (
        <>
          <MainHeader>
            <Title>{i18n.t("settings.title")}</Title>
          </MainHeader>
          <Paper className={classes.mainPaper} elevation={1}>
            <Tabs
              value={tab}
              indicatorColor="primary"
              textColor="primary"
              scrollButtons="on"
              variant="scrollable"
              onChange={handleTabChange}
              className={classes.tab}
            >
              <Tab label={i18n.t("settings.tabs.options")} value={"options"} />
              {schedulesEnabled && <Tab label="Horários" value={"schedules"} />}
              {user.profile === "admin" &&
                user.finalizacaoComValorVendaAtiva && (
                  <Tab
                    label="Finalização do Atendimento"
                    value={"finalizacao"}
                  />
                )}
              {isSuper() ? (
                <Tab
                  label={i18n.t("settings.tabs.companies")}
                  value={"companies"}
                />
              ) : null}
              {isSuper() ? (
                <Tab label={i18n.t("settings.tabs.plans")} value={"plans"} />
              ) : null}

              {isSuper() ? (
                <Tab label="Identidade Visual" value={"whitelabel"} />
              ) : null}
              {isPlatformBrainAdmin() && (
                <Tab label="Logs Tokens" value={"brain_token_logs"} />
              )}
            </Tabs>
            <Paper className={classes.paper} elevation={0}>
              {/* Renderização condicional simples - apenas a aba ativa renderiza */}
              {tab === "schedules" && (
                <div className={classes.container}>
                  <SchedulesForm
                    loading={loading}
                    onSubmit={handleSubmitSchedules}
                    initialValues={schedules}
                  />
                </div>
              )}

              {tab === "companies" && isSuper() && (
                <div className={classes.container}>
                  <CompaniesManager />
                </div>
              )}

              {tab === "plans" && isSuper() && (
                <div className={classes.container}>
                  <PlansManager />
                </div>
              )}



              {tab === "whitelabel" && isSuper() && (
                <div className={classes.container}>
                  <Whitelabel settings={oldSettings} />
                </div>
              )}

              {tab === "finalizacao" && (
                <div className={classes.container}>
                  <FinalizacaoAtendimento
                    settings={settings}
                    onSettingsChange={(newSettings) => setSettings(newSettings)}
                  />
                </div>
              )}

              {tab === "brain_token_logs" && isPlatformBrainAdmin() && (
                <div className={classes.container}>
                  <BrainTokenLogsPage />
                </div>
              )}

              {tab === "options" && (
                <div className={classes.container}>
                  <Options
                    settings={settings}
                    oldSettings={oldSettings}
                    user={currentUser}
                    scheduleTypeChanged={(value) =>
                      setSchedulesEnabled(value === "company")
                    }
                  />
                </div>
              )}
            </Paper>
          </Paper>
        </>
      )}
    </MainContainer>
  );
};

export default SettingsCustom;
