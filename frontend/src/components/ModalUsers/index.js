/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useContext } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";
import Select from "@material-ui/core/Select";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import QueueSelect from "../QueueSelect";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../Can";
import { isPlatformAdminEmail } from "../../constants/fullOrgSettingsAdmin";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },
  multFieldLine: {
    display: "flex",
    "& > *:not(:last-child)": {
      marginRight: theme.spacing(1),
    },
  },

  btnWrapper: {
    position: "relative",
  },

  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
  },
}));

const UserSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Too Short!")
    .max(50, "Too Long!")
    .required("Required"),
  password: Yup.string().min(5, "Too Short!").max(50, "Too Long!"),
  email: Yup.string().email("Invalid email").required("Required"),
});

const ModalUsers = ({ open, onClose, userId, companyId }) => {
  const classes = useStyles();

  const initialState = {
    name: "",
    email: "",
    password: "",
    profile: "user",
    allTicket: "disable",
    showDashboard: "enabled",
    allowConnections: "enabled",
    showContacts: "enabled",
    showCampaign: "enabled",
    showFlow: "enabled",
    allowSeeMessagesInPendingTickets: "enabled",
    allUserChat: "enabled",
    allHistoric: "enabled",
    userClosePendingTicket: "enabled",
    allowRealTime: "enabled",
    allowGroup: false,
    finalizacaoComValorVendaAtiva: "false"
  };

  const { user: loggedInUser } = useContext(AuthContext);

  const [user, setUser] = useState(initialState);
  const [selectedQueueIds, setSelectedQueueIds] = useState([]);

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;
      if (open) {
        try {
          const { data } = await api.get(`/users/${userId}`);
          setUser((prevState) => ({
            ...prevState,
            ...data,
            allTicket:
              data.allTicket === "enable" || data.allTicket === "enabled"
                ? "enable"
                : "disable",
            finalizacaoComValorVendaAtiva: data.finalizacaoComValorVendaAtiva
              ? "true"
              : "false"
          }));
          const userQueueIds = data.queues?.map((queue) => queue.id);
          setSelectedQueueIds(userQueueIds);
        } catch (err) {
          toastError(err);
        }
      }
    };

    fetchUser();
  }, [userId, open]);

  const handleClose = () => {
    onClose();
    setUser(initialState);
  };

  const handleSaveUser = async (values) => {
    const userData = { 
      ...values, 
      companyId, 
      queueIds: selectedQueueIds,
      finalizacaoComValorVendaAtiva: values.finalizacaoComValorVendaAtiva === "true",
      allowGroup: Boolean(values.allowGroup)
    };
    try {
      if (userId) {
        await api.put(`/users/${userId}`, userData);
      } else {
        await api.post("/users", userData);
      }
      toast.success(i18n.t("userModal.success"));
    } catch (err) {
      toastError(err);
    }
    handleClose();
  };

  const isSuperAdmin = isPlatformAdminEmail(loggedInUser.email);

  return (
    <div className={classes.root}>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="xs"
        fullWidth
        scroll="paper"
      >
        <DialogTitle id="form-dialog-title">
          {userId
            ? `${i18n.t("userModal.title.edit")}`
            : `${i18n.t("userModal.title.add")}`}
        </DialogTitle>
        <Formik
          initialValues={user}
          enableReinitialize={true}
          validationSchema={UserSchema}
          onSubmit={(values, actions) => {
            setTimeout(() => {
              handleSaveUser(values);
              actions.setSubmitting(false);
            }, 400);
          }}
        >
          {({ touched, errors, isSubmitting }) => (
            <Form>
              <DialogContent dividers>
                <div className={classes.multFieldLine}>
                  <Field
                    as={TextField}
                    label={i18n.t("userModal.form.name")}
                    autoFocus
                    name="name"
                    error={touched.name && Boolean(errors.name)}
                    helperText={touched.name && errors.name}
                    variant="outlined"
                    margin="dense"
                    fullWidth
                  />
                  <Field
                    as={TextField}
                    label={i18n.t("userModal.form.password")}
                    type="password"
                    name="password"
                    error={touched.password && Boolean(errors.password)}
                    helperText={touched.password && errors.password}
                    variant="outlined"
                    margin="dense"
                    fullWidth
                    autoComplete="new-password"
                  />
                </div>
                <div className={classes.multFieldLine}>
                  <Field
                    as={TextField}
                    label={i18n.t("userModal.form.email")}
                    name="email"
                    error={touched.email && Boolean(errors.email)}
                    helperText={touched.email && errors.email}
                    variant="outlined"
                    margin="dense"
                    fullWidth
                    autoComplete="off"
                  />
                  <FormControl
                    variant="outlined"
                    className={classes.formControl}
                    margin="dense"
                  >
                    {(isSuperAdmin || loggedInUser.profile === "admin") ? (
                      <>
                        <InputLabel id="profile-selection-input-label">
                          {i18n.t("userModal.form.profile")}
                        </InputLabel>

                        <Field
                          as={Select}
                          label={i18n.t("userModal.form.profile")}
                          name="profile"
                          labelId="profile-selection-label"
                          id="profile-selection"
                          required
                        >
                          <MenuItem value="admin">Admin</MenuItem>
                          <MenuItem value="user">User</MenuItem>
                        </Field>
                      </>
                    ) : (
                      <Field
                        as={TextField}
                        label={i18n.t("userModal.form.profile")}
                        name="profile"
                        variant="outlined"
                        margin="dense"
                        fullWidth
                        disabled
                      />
                    )}
                  </FormControl>
                </div>
                <div className={classes.multFieldLine}>
                  <FormControl variant="outlined" className={classes.formControl} margin="dense">
                    <InputLabel id="showDashboard-label">Dashboard</InputLabel>
                    <Field as={Select} label="Dashboard" name="showDashboard" labelId="showDashboard-label">
                      <MenuItem value="enabled">Habilitado</MenuItem>
                      <MenuItem value="disabled">Desabilitado</MenuItem>
                    </Field>
                  </FormControl>
                  <FormControl variant="outlined" className={classes.formControl} margin="dense">
                    <InputLabel id="allowConnections-label">Conexões</InputLabel>
                    <Field as={Select} label="Conexões" name="allowConnections" labelId="allowConnections-label">
                      <MenuItem value="enabled">Habilitado</MenuItem>
                      <MenuItem value="disabled">Desabilitado</MenuItem>
                    </Field>
                  </FormControl>
                  <FormControl variant="outlined" className={classes.formControl} margin="dense">
                    <InputLabel id="allowPending-label">Ver mensagens em pendentes</InputLabel>
                    <Field as={Select} label="Pendentes" name="allowSeeMessagesInPendingTickets" labelId="allowPending-label">
                      <MenuItem value="enabled">Habilitado</MenuItem>
                      <MenuItem value="disabled">Desabilitado</MenuItem>
                    </Field>
                  </FormControl>
                </div>
                <div className={classes.multFieldLine}>
                  <FormControl variant="outlined" className={classes.formControl} margin="dense">
                    <InputLabel id="showContacts-label">Contatos</InputLabel>
                    <Field as={Select} label="Contatos" name="showContacts" labelId="showContacts-label">
                      <MenuItem value="enabled">Habilitado</MenuItem>
                      <MenuItem value="disabled">Desabilitado</MenuItem>
                    </Field>
                  </FormControl>
                  <FormControl variant="outlined" className={classes.formControl} margin="dense">
                    <InputLabel id="showCampaign-label">Campanhas</InputLabel>
                    <Field as={Select} label="Campanhas" name="showCampaign" labelId="showCampaign-label">
                      <MenuItem value="enabled">Habilitado</MenuItem>
                      <MenuItem value="disabled">Desabilitado</MenuItem>
                    </Field>
                  </FormControl>
                  <FormControl variant="outlined" className={classes.formControl} margin="dense">
                    <InputLabel id="showFlow-label">Flow</InputLabel>
                    <Field as={Select} label="Flow" name="showFlow" labelId="showFlow-label">
                      <MenuItem value="enabled">Habilitado</MenuItem>
                      <MenuItem value="disabled">Desabilitado</MenuItem>
                    </Field>
                  </FormControl>
                </div>
                <div className={classes.multFieldLine}>
                  <FormControl variant="outlined" className={classes.formControl} margin="dense">
                    <InputLabel id="allTicket-label">Visualizar chamados sem fila</InputLabel>
                    <Field as={Select} label="Visualizar chamados sem fila" name="allTicket" labelId="allTicket-label">
                      <MenuItem value="enable">Habilitado</MenuItem>
                      <MenuItem value="disable">Desabilitado</MenuItem>
                    </Field>
                  </FormControl>
                  <FormControl variant="outlined" className={classes.formControl} margin="dense">
                    <InputLabel id="allowGroup-label">Permitir Grupos</InputLabel>
                    <Field as={Select} label="Permitir Grupos" name="allowGroup" labelId="allowGroup-label">
                      <MenuItem value={true}>Habilitado</MenuItem>
                      <MenuItem value={false}>Desabilitado</MenuItem>
                    </Field>
                  </FormControl>
                </div>
                <div className={classes.multFieldLine}>
                  <FormControl variant="outlined" className={classes.formControl} margin="dense">
                    <InputLabel id="allUserChat-label">Ver conversas de outros usuários</InputLabel>
                    <Field as={Select} label="Outros usuários" name="allUserChat" labelId="allUserChat-label">
                      <MenuItem value="enabled">Habilitado</MenuItem>
                      <MenuItem value="disabled">Desabilitado</MenuItem>
                    </Field>
                  </FormControl>
                  <FormControl variant="outlined" className={classes.formControl} margin="dense">
                    <InputLabel id="allHistoric-label">Ver conversas de outras filas</InputLabel>
                    <Field as={Select} label="Outras filas" name="allHistoric" labelId="allHistoric-label">
                      <MenuItem value="enabled">Habilitado</MenuItem>
                      <MenuItem value="disabled">Desabilitado</MenuItem>
                    </Field>
                  </FormControl>
                </div>
                <div className={classes.multFieldLine}>
                  <FormControl variant="outlined" className={classes.formControl} margin="dense">
                    <InputLabel id="userClosePendingTicket-label">Fechar tickets pendentes</InputLabel>
                    <Field as={Select} label="Fechar pendentes" name="userClosePendingTicket" labelId="userClosePendingTicket-label">
                      <MenuItem value="enabled">Habilitado</MenuItem>
                      <MenuItem value="disabled">Desabilitado</MenuItem>
                    </Field>
                  </FormControl>
                  <FormControl variant="outlined" className={classes.formControl} margin="dense">
                    <InputLabel id="allowRealTime-label">Painel de Atendimentos</InputLabel>
                    <Field as={Select} label="Painel" name="allowRealTime" labelId="allowRealTime-label">
                      <MenuItem value="enabled">Habilitado</MenuItem>
                      <MenuItem value="disabled">Desabilitado</MenuItem>
                    </Field>
                  </FormControl>
                  <FormControl variant="outlined" className={classes.formControl} margin="dense">
                    <InputLabel id="finalizacaoVenda-label">Finalização com Valor de Venda</InputLabel>
                    <Field as={Select} label="Finalização com Valor de Venda" name="finalizacaoComValorVendaAtiva" labelId="finalizacaoVenda-label">
                      <MenuItem value="true">Habilitado</MenuItem>
                      <MenuItem value="false">Desabilitado</MenuItem>
                    </Field>
                  </FormControl>
                </div>
                <div className={classes.multFieldLine}>
                  {(isSuperAdmin || loggedInUser.profile === "admin") ? (
                    <QueueSelect
                      companyId={companyId}
                      selectedQueueIds={selectedQueueIds}
                      onChange={(values) => setSelectedQueueIds(values)}
                    />
                  ) : null}
                </div>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={handleClose}
                  color="secondary"
                  disabled={isSubmitting}
                  variant="outlined"
                >
                  {i18n.t("userModal.buttons.cancel")}
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  disabled={isSubmitting}
                  variant="contained"
                  className={classes.btnWrapper}
                >
                  {userId
                    ? `${i18n.t("userModal.buttons.okEdit")}`
                    : `${i18n.t("userModal.buttons.okAdd")}`}
                  {isSubmitting && (
                    <CircularProgress
                      size={24}
                      className={classes.buttonProgress}
                    />
                  )}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </div>
  );
};

export default ModalUsers;
