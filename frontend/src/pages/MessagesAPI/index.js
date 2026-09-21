/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useContext } from "react";
import { useHistory } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import ActivitiesStyleLayout from "../../components/ActivitiesStyleLayout";

import { i18n } from "../../translate/i18n";
import {
  Button,
  CircularProgress,
  Grid,
  TextField,
  Typography,
} from "@material-ui/core";
import { Field, Form, Formik } from "formik";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";

import axios from "axios";
import usePlans from "../../hooks/usePlans";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  return {
  mainPaper: {
    flex: 1,
    padding: theme.spacing(2),
    paddingBottom: 100,
    backgroundColor: isDark ? theme.palette.listScrollArea : "transparent",
    boxShadow: "none",
    color: theme.palette.text.primary,
    ...(isDark
      ? {
          "& h6.MuiTypography-root": {
            color: `${theme.palette.common.white} !important`,
          },
          "& .MuiTypography-colorPrimary": {
            color: `${theme.palette.common.white} !important`,
          },
          "& p, & li, & ul, & ol, & b, & strong": {
            color: theme.palette.text.primary,
          },
        }
      : {}),
  },
  /** Títulos de seção: no claro mantêm a cor primária (azul marca); no escuro branco para contraste */
  sectionTitle: {
    color: isDark ? theme.palette.common.white : theme.palette.primary.main,
  },
  mainHeader: {
    marginTop: theme.spacing(1),
  },
  elementMargin: {
    padding: theme.spacing(2),
  },
  formContainer: {
    maxWidth: 500,
  },
  textRight: {
    textAlign: "right",
  },
};
});

const MessagesAPI = ({ renderAsTab }) => {
  const classes = useStyles();
  const history = useHistory();

  const [formMessageTextData] = useState({
    token: "",
    number: "",
    body: "",
    userId: "",
    queueId: "",
  });
  const [formMessageMediaData] = useState({
    token: "",
    number: "",
    medias: "",
    body: "",
    userId: "",
    queueId: "",
  });
  const [file, setFile] = useState({});
  const { user, socket } = useContext(AuthContext);

  const { getPlanCompany } = usePlans();
  const [searchParam, setSearchParam] = useState("");

  useEffect(() => {
    async function fetchData() {
      const companyId = user.companyId;
      const planConfigs = await getPlanCompany(undefined, companyId);
      if (!planConfigs.plan.useExternalApi) {
        toast.error(
          "Esta empresa não possui permissão para acessar essa página! Estamos lhe redirecionando."
        );
        setTimeout(() => {
          history.push(`/`);
        }, 1000);
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.scrollTo) {
      window.scrollTo(0, 0);
    }
  }, []);

  const getEndpoint = () => {
    return process.env.REACT_APP_BACKEND_URL + "/api/messages/send";
  };

  const handleSendTextMessage = async (values) => {
    const { number, body, userId, queueId } = values;
    const data = { number, body, userId, queueId };
    try {
      await axios.request({
        url: getEndpoint(),
        method: "POST",
        data,
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${values.token}`,
        },
      });
      toast.success("Mensagem enviada com sucesso");
    } catch (err) {
      toastError(err);
    }
  };

  const handleSendMediaMessage = async (values) => {
    try {
      const firstFile = file[0];
      const data = new FormData();
      data.append("number", values.number);
      data.append("body", values.body ? values.body : firstFile.name);
      data.append("userId", values.userId);
      data.append("queueId", values.queueId);
      data.append("medias", firstFile);
      await axios.request({
        url: getEndpoint(),
        method: "POST",
        data,
        headers: {
          "Content-type": "multipart/form-data",
          Authorization: `Bearer ${values.token}`,
        },
      });
      toast.success("Mensagem enviada com sucesso");
    } catch (err) {
      toastError(err);
    }
  };

  const renderFormMessageText = () => {
    return (
      <Formik
        initialValues={formMessageTextData}
        enableReinitialize={true}
        onSubmit={(values, actions) => {
          setTimeout(async () => {
            await handleSendTextMessage(values);
            actions.setSubmitting(false);
            actions.resetForm();
          }, 400);
        }}
        className={classes.elementMargin}
      >
        {({ isSubmitting }) => (
          <Form className={classes.formContainer}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Field
                  as={TextField}
                  label={i18n.t("messagesAPI.textMessage.token")}
                  name="token"
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  className={classes.textField}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Field
                  as={TextField}
                  label={i18n.t("messagesAPI.textMessage.number")}
                  name="number"
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  className={classes.textField}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <Field
                  as={TextField}
                  label={i18n.t("messagesAPI.textMessage.body")}
                  name="body"
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  className={classes.textField}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Field
                  as={TextField}
                  label={i18n.t("messagesAPI.textMessage.userId")}
                  name="userId"
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  className={classes.textField}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Field
                  as={TextField}
                  label={i18n.t("messagesAPI.textMessage.queueId")}
                  name="queueId"
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  className={classes.textField}
                />
              </Grid>
              <Grid item xs={12} className={classes.textRight}>
                <Button
                  type="submit"
                  color="primary"
                  variant="contained"
                  className={classes.btnWrapper}
                >
                  {isSubmitting ? (
                    <CircularProgress
                      size={24}
                      className={classes.buttonProgress}
                    />
                  ) : (
                    <>{i18n.t("messagesAPI.toSend")}</>
                  )}
                </Button>
              </Grid>
            </Grid>
          </Form>
        )}
      </Formik>
    );
  };

  const renderFormMessageMedia = () => {
    return (
      <Formik
        initialValues={formMessageMediaData}
        enableReinitialize={true}
        onSubmit={(values, actions) => {
          setTimeout(async () => {
            await handleSendMediaMessage(values);
            actions.setSubmitting(false);
            actions.resetForm();
            document.getElementById("medias").files = null;
            document.getElementById("medias").value = null;
          }, 400);
        }}
        className={classes.elementMargin}
      >
        {({ isSubmitting }) => (
          <Form className={classes.formContainer}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Field
                  as={TextField}
                  label={i18n.t("messagesAPI.mediaMessage.token")}
                  name="token"
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  className={classes.textField}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Field
                  as={TextField}
                  label={i18n.t("messagesAPI.mediaMessage.number")}
                  name="number"
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  className={classes.textField}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <Field
                  as={TextField}
                  label={i18n.t("messagesAPI.textMessage.body")}
                  name="body"
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  className={classes.textField}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Field
                  as={TextField}
                  label={i18n.t("messagesAPI.textMessage.userId")}
                  name="userId"
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  className={classes.textField}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Field
                  as={TextField}
                  label={i18n.t("messagesAPI.textMessage.queueId")}
                  name="queueId"
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  className={classes.textField}
                />
              </Grid>
              <Grid item xs={12}>
                <input
                  type="file"
                  name="medias"
                  id="medias"
                  required
                  onChange={(e) => setFile(e.target.files)}
                />
              </Grid>
              <Grid item xs={12} className={classes.textRight}>
                <Button
                  type="submit"
                  color="primary"
                  variant="contained"
                  className={classes.btnWrapper}
                >
                  {isSubmitting ? (
                    <CircularProgress
                      size={24}
                      className={classes.buttonProgress}
                    />
                  ) : (
                    "Enviar"
                  )}
                </Button>
              </Grid>
            </Grid>
          </Form>
        )}
      </Formik>
    );
  };

  const content = (
    <Paper className={classes.mainPaper} elevation={0}>
      <Typography
        variant="h6"
        color="primary"
        className={classes.elementMargin}
      >
        {i18n.t("messagesAPI.API.methods.title")}
      </Typography>
      <Typography className={classes.elementMargin} component="div">
        <ol>
          <li>{i18n.t("messagesAPI.API.methods.messagesText")}</li>
          <li>{i18n.t("messagesAPI.API.methods.messagesMidia")}</li>
        </ol>
      </Typography>
      <Typography
        variant="h6"
        color="primary"
        className={classes.elementMargin}
      >
        {i18n.t("messagesAPI.API.instructions.title")}
      </Typography>
      <Typography className={classes.elementMargin} component="div">
        <b>{i18n.t("messagesAPI.API.instructions.comments")}</b>
        <br />
        <ul>
          <li>{i18n.t("messagesAPI.API.instructions.comments1")}</li>
          <li>
            {i18n.t("messagesAPI.API.instructions.comments2")}
            <ul>
              <li>{i18n.t("messagesAPI.API.instructions.codeCountry")}</li>
              <li>{i18n.t("messagesAPI.API.instructions.code")}</li>
              <li>{i18n.t("messagesAPI.API.instructions.number")}</li>
            </ul>
          </li>
        </ul>
      </Typography>
      <Typography
        variant="h6"
        className={`${classes.elementMargin} ${classes.sectionTitle}`}
      >
        {i18n.t("messagesAPI.API.text.title")}
      </Typography>
      <Grid container>
        <Grid item xs={12} sm={6}>
          <Typography className={classes.elementMargin} component="div">
            <p>{i18n.t("messagesAPI.API.text.instructions")}</p>
            <b>
              {i18n.t("messagesAPIInstructions.endpoint")}
            </b> {getEndpoint()} <br />
            <b>{i18n.t("messagesAPIInstructions.method")}</b>{" "}
            {i18n.t("messagesAPIInstructions.post")} <br />
            <b>{i18n.t("messagesAPIInstructions.headers")}</b>{" "}
            {i18n.t("messagesAPIInstructions.headerAuthorization")} <br />
            <b>{i18n.t("messagesAPIInstructions.body")}</b> {"{"} <br />
            {i18n.t("messagesAPIInstructions.fieldNumber")} <br />
            {i18n.t("messagesAPIInstructions.fieldBody")} <br />
            {i18n.t("messagesAPIInstructions.fieldUserId")} <br />
            {i18n.t("messagesAPIInstructions.fieldQueueId")} <br />
            {i18n.t("messagesAPIInstructions.fieldSendSignature")} <br />
            {i18n.t("messagesAPIInstructions.fieldCloseTicket")} <br />
            {"}"}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography className={classes.elementMargin}>
            <b>{i18n.t("messagesAPIInstructions.testSend")}</b>
          </Typography>
          {renderFormMessageText()}
        </Grid>
      </Grid>
      <Typography
        variant="h6"
        className={`${classes.elementMargin} ${classes.sectionTitle}`}
      >
        {i18n.t("messagesAPI.API.media.title")}
      </Typography>
      <Grid container>
        <Grid item xs={12} sm={6}>
          <Typography className={classes.elementMargin} component="div">
            <p>{i18n.t("messagesAPI.API.media.instructions")}</p>
            <b>Endpoint: </b> {getEndpoint()} <br />
            <b>Método: </b> POST <br />
            <b>Headers: </b> Authorization Bearer (token cadastrado) e
            Content-Type (multipart/form-data) <br />
            <b>FormData: </b> <br />
            <ul>
              <li>
                <b>number: </b> 558599999999
              </li>
              <li>
                <b>body:</b> Message
              </li>
              <li>
                <b>userId:</b> ID usuário ou ""
              </li>
              <li>
                <b>queueId:</b> ID da fila ou ""
              </li>
              <li>
                <b>medias: </b> arquivo
              </li>
              <li>
                <b>sendSignature:</b>{" "}
                {i18n.t("messagesAPIInstructions.singMessage")} <br />
              </li>
              <li>
                <b>closeTicket:</b>{" "}
                {i18n.t("messagesAPIInstructions.closeTicket")} <br />
              </li>
            </ul>
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography className={classes.elementMargin}>
            <b>{i18n.t("messagesAPIInstructions.testSend")}</b>
          </Typography>
          {renderFormMessageMedia()}
        </Grid>
      </Grid>
    </Paper>
  );

  if (renderAsTab) {
    return content;
  }

  return (
    <ActivitiesStyleLayout
      viewModes={[{ value: "api", label: i18n.t("messagesAPI.API.title") }]}
      currentViewMode="api"
      searchPlaceholder={"Buscar..."}
      searchValue={searchParam}
      onSearchChange={setSearchParam}
      scrollContent={false}
      hideDefaultRightFilters
    >
      {content}
    </ActivitiesStyleLayout>
  );
};

export default MessagesAPI;
