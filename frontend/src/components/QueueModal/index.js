/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";
import {
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Box,
  Typography,
  IconButton,
  InputAdornment,
  Collapse,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Drawer from "@material-ui/core/Drawer";
import CircularProgress from "@material-ui/core/CircularProgress";
import CloseIcon from "@material-ui/icons/Close";
import { Colorize, ExpandMore, ExpandLess } from "@material-ui/icons";
import Switch from "@material-ui/core/Switch";
import Checkbox from "@mui/material/Checkbox";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import ColorPicker from "../ColorBoxModal";
import SchedulesForm from "../SchedulesForm";
import useCompanySettings from "../../hooks/useSettings/companySettings";

const useStyles = makeStyles((theme) => ({
  drawerPaper: {
    display: "flex",
    flexDirection: "column",
    width: 420,
    maxWidth: "100%",
    borderRadius: 14,
    height: "calc(100% - 32px)",
    marginTop: 16,
    marginBottom: 16,
    marginRight: 16,
    overflow: "hidden",
    backgroundColor: theme.palette.type === "dark" ? "#1c1c1e" : "#ffffff",
    boxShadow: "0 8px 40px rgba(0,0,0,0.14)",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.45)",
    backdropFilter: "blur(3px)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom:
      theme.palette.type === "dark"
        ? "1px solid rgba(255,255,255,0.06)"
        : "1px solid #f0f0f0",
  },
  closeButton: {
    width: 30,
    height: 30,
    color: theme.palette.text.secondary,
  },
  content: {
    padding: "16px 20px",
    overflowY: "auto",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  row2: {
    display: "grid",
    gridTemplateColumns: "1fr 120px",
    gap: 10,
    alignItems: "start",
  },
  sectionToggle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    padding: "8px 0",
    userSelect: "none",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.03em",
    textTransform: "uppercase",
    color: theme.palette.text.secondary,
  },
  footer: {
    borderTop:
      theme.palette.type === "dark"
        ? "1px solid rgba(255,255,255,0.06)"
        : "1px solid #f0f0f0",
    padding: "12px 20px",
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
  },
  colorAdorment: { width: 18, height: 18, borderRadius: 4 },
  btnWrapper: { position: "relative" },
  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
  form: { display: "flex", flexDirection: "column", height: "100%", minHeight: 0 },
}));

const QueueSchema = Yup.object().shape({
  name: Yup.string().min(2).max(50).required(),
  color: Yup.string().min(3).max(9).required(),
});

const initialState = {
  name: "",
  color: "#22c55e",
  outOfHoursMessage: "",
  orderQueue: "",
  tempoRoteador: 0,
  ativarRoteador: false,
  closeTicket: false,
  typeRandomMode: "RANDOM",
  randomizeImmediate: false,
};

const initialStateSchedule = [
  { weekday: "Segunda", weekdayEn: "monday", startTimeA: "08:00", endTimeA: "12:00", startTimeB: "13:00", endTimeB: "18:00" },
  { weekday: "Terça", weekdayEn: "tuesday", startTimeA: "08:00", endTimeA: "12:00", startTimeB: "13:00", endTimeB: "18:00" },
  { weekday: "Quarta", weekdayEn: "wednesday", startTimeA: "08:00", endTimeA: "12:00", startTimeB: "13:00", endTimeB: "18:00" },
  { weekday: "Quinta", weekdayEn: "thursday", startTimeA: "08:00", endTimeA: "12:00", startTimeB: "13:00", endTimeB: "18:00" },
  { weekday: "Sexta", weekdayEn: "friday", startTimeA: "08:00", endTimeA: "12:00", startTimeB: "13:00", endTimeB: "18:00" },
  { weekday: "Sábado", weekdayEn: "saturday", startTimeA: "08:00", endTimeA: "12:00", startTimeB: "13:00", endTimeB: "18:00" },
  { weekday: "Domingo", weekdayEn: "sunday", startTimeA: "08:00", endTimeA: "12:00", startTimeB: "13:00", endTimeB: "18:00" },
];

const QueueModal = ({ open, onClose, queueId, onEdit }) => {
  const classes = useStyles();
  const isEdit = Boolean(queueId);
  const [queue, setQueue] = useState(initialState);
  const [schedulesEnabled, setSchedulesEnabled] = useState(false);
  const [tab, setTab] = useState(0);
  const [schedules, setSchedules] = useState(initialStateSchedule);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [routerOpen, setRouterOpen] = useState(false);

  const { get: getSetting } = useCompanySettings();

  useEffect(() => {
    (async () => {
      const setting = await getSetting({ column: "scheduleType" });
      if (setting.scheduleType === "queue") setSchedulesEnabled(true);
    })();
  }, [getSetting]);

  useEffect(() => {
    if (!queueId || !open) {
      setQueue(initialState);
      setSchedules(initialStateSchedule);
      setTab(0);
      return;
    }
    (async () => {
      try {
        const { data } = await api.get(`/queue/${queueId}`);
        setQueue({ ...initialState, ...data });
        if (Array.isArray(data.schedules) && data.schedules.length > 0) {
          setSchedules(data.schedules);
        }
      } catch (err) {
        toastError(err);
      }
    })();
  }, [queueId, open]);

  const handleClose = () => {
    onClose();
  };

  const handleSaveSchedules = (values) => {
    setSchedules(values);
    setTab(0);
    toast.success(i18n.t("queueModal.form.saveHint") || "Salve a fila para aplicar.");
  };

  const handleSaveQueue = async (values) => {
    try {
      const payload = queueId
        ? {
            name: values.name,
            color: values.color,
            orderQueue: values.orderQueue,
            ativarRoteador: values.ativarRoteador,
            tempoRoteador: values.tempoRoteador,
            typeRandomMode: values.typeRandomMode,
            randomizeImmediate: values.randomizeImmediate,
            closeTicket: values.closeTicket,
            outOfHoursMessage: values.outOfHoursMessage || "",
            schedules,
          }
        : {
            name: values.name,
            color: values.color,
            ativarRoteador: false,
            tempoRoteador: 0,
            closeTicket: false,
            typeRandomMode: "RANDOM",
            randomizeImmediate: false,
            sendQueueEntryMessage: true,
            queueEntryMessage:
              "Você está na fila *{{queue}}*. Em breve será atendido!",
            greetingMessage: "",
            outOfHoursMessage: "",
          };
      if (queueId) {
        const { data } = await api.put(`/queue/${queueId}`, payload);
        onEdit?.(data);
      } else {
        await api.post("/queue", payload);
      }
      toast.success(i18n.t("queues.toasts.success"));
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      classes={{ paper: classes.drawerPaper }}
      BackdropProps={{ className: classes.backdrop }}
    >
      <Box className={classes.header}>
        <Typography style={{ fontSize: 15, fontWeight: 600 }}>
          {queueId ? i18n.t("queueModal.title.edit") : i18n.t("queueModal.title.add")}
        </Typography>
        <IconButton onClick={handleClose} size="small" className={classes.closeButton}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {isEdit && schedulesEnabled && (
        <Tabs value={tab} onChange={(_, v) => setTab(v)} indicatorColor="primary">
          <Tab label={i18n.t("queueModal.title.queueData")} />
          <Tab label={i18n.t("queueModal.title.text")} />
        </Tabs>
      )}

      {tab === 0 && (
        <Formik
          initialValues={queue}
          enableReinitialize
          validationSchema={QueueSchema}
          onSubmit={handleSaveQueue}
        >
          {({ setFieldValue, touched, errors, isSubmitting, values }) => (
            <Form className={classes.form}>
              <Box className={classes.content}>
                <div className={classes.row2}>
                  <Field
                    as={TextField}
                    label={i18n.t("queueModal.form.name")}
                    name="name"
                    autoFocus
                    error={touched.name && Boolean(errors.name)}
                    helperText={touched.name && errors.name}
                    variant="outlined"
                    size="small"
                    fullWidth
                  />
                  <Field
                    as={TextField}
                    label={i18n.t("queueModal.form.color")}
                    name="color"
                    error={touched.color && Boolean(errors.color)}
                    variant="outlined"
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <div
                            className={classes.colorAdorment}
                            style={{ backgroundColor: values.color }}
                          />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setColorPickerOpen(true)}>
                            <Colorize fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </div>
                <ColorPicker
                  open={colorPickerOpen}
                  handleClose={() => setColorPickerOpen(false)}
                  onChange={(color) => {
                    const raw = typeof color === "string" ? color : color?.hex;
                    const hex = String(raw || "")
                      .replace(/^#/, "")
                      .replace(/[^0-9a-f]/gi, "")
                      .slice(0, 6);
                    if (hex) setFieldValue("color", `#${hex}`);
                  }}
                  currentColor={values.color}
                />

                {isEdit && (
                  <>
                <Field
                  as={TextField}
                  label={i18n.t("queueModal.form.orderQueue")}
                  name="orderQueue"
                  variant="outlined"
                  size="small"
                  fullWidth
                />

                <FormControlLabel
                  control={
                    <Field as={Switch} color="primary" name="closeTicket" checked={values.closeTicket} />
                  }
                  label={i18n.t("queueModal.form.closeTicket")}
                />

                <div
                  className={classes.sectionToggle}
                  onClick={() => setRouterOpen((o) => !o)}
                  role="button"
                  tabIndex={0}
                >
                  <span className={classes.sectionLabel}>{i18n.t("queueModal.form.rotate")}</span>
                  {routerOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                </div>
                <Collapse in={routerOpen}>
                  <FormControlLabel
                    control={
                      <Field
                        as={Switch}
                        color="primary"
                        name="ativarRoteador"
                        checked={values.ativarRoteador}
                      />
                    }
                    label={i18n.t("queueModal.form.rotate")}
                  />
                  <Field
                    as={Select}
                    name="tempoRoteador"
                    variant="outlined"
                    size="small"
                    fullWidth
                    disabled={!values.ativarRoteador}
                    displayEmpty
                  >
                    <MenuItem value={0} disabled>
                      {i18n.t("queueModal.form.timeRotate")}
                    </MenuItem>
                    {[1, 2, 3, 5, 10, 15, 30, 60].map((m) => (
                      <MenuItem key={m} value={m}>
                        {m} min
                      </MenuItem>
                    ))}
                  </Field>
                  <Field
                    as={Select}
                    name="typeRandomMode"
                    variant="outlined"
                    size="small"
                    fullWidth
                    disabled={!values.ativarRoteador}
                    style={{ marginTop: 8 }}
                  >
                    <MenuItem value="RANDOM">Random</MenuItem>
                    <MenuItem value="ORDENADO">Ordenado</MenuItem>
                  </Field>
                  <FormControlLabel
                    control={
                      <Field
                        as={Checkbox}
                        color="primary"
                        name="randomizeImmediate"
                        checked={values.randomizeImmediate}
                        disabled={!values.ativarRoteador}
                      />
                    }
                    label={i18n.t("queueModal.form.randomizeImmediate")}
                  />
                </Collapse>

                {schedulesEnabled && (
                  <Field
                    as={TextField}
                    label={i18n.t("queueModal.form.outOfHoursMessage")}
                    name="outOfHoursMessage"
                    multiline
                    rows={3}
                    variant="outlined"
                    size="small"
                    fullWidth
                  />
                )}
                  </>
                )}
              </Box>
              <Box className={classes.footer}>
                <Button onClick={handleClose} disabled={isSubmitting} style={{ textTransform: "none" }}>
                  {i18n.t("queueModal.buttons.cancel")}
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  variant="contained"
                  disabled={isSubmitting}
                  className={classes.btnWrapper}
                  style={{ textTransform: "none", boxShadow: "none" }}
                >
                  {queueId ? i18n.t("queueModal.buttons.okEdit") : i18n.t("queueModal.buttons.okAdd")}
                  {isSubmitting && (
                    <CircularProgress size={22} className={classes.buttonProgress} />
                  )}
                </Button>
              </Box>
            </Form>
          )}
        </Formik>
      )}

      {isEdit && tab === 1 && schedulesEnabled && (
        <Box style={{ padding: 16, flex: 1, overflow: "auto" }}>
          <SchedulesForm
            loading={false}
            onSubmit={handleSaveSchedules}
            initialValues={schedules}
            labelSaveButton={i18n.t("whatsappModal.buttons.okAdd")}
          />
        </Box>
      )}
    </Drawer>
  );
};

export default QueueModal;
