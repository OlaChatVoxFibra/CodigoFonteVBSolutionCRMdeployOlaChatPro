/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useContext } from "react";
import { makeStyles } from "@material-ui/core/styles";

import MomentsUser from "../../components/MomentsUser";
// import MomentsQueues from "../../components/MomentsQueues";

import MainHeader from "../../components/MainHeader";
import { Grid, Paper } from "@material-ui/core";
import Title from "../../components/Title";
import ForbiddenPage from "../../components/ForbiddenPage";
import { AuthContext } from "../../context/Auth/AuthContext";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles((theme) => ({
  container: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    paddingLeft: "5px",
    maxWidth: "100%",
  },
  mainPaper: {
    display: "flex",
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
    alignItems: "center",
    backgroundColor: theme.palette.listScrollArea,
  },
  fixedHeightPaper: {
    padding: theme.spacing(2),
    display: "flex",
    flexDirection: "column",
    height: 100,
  },
  chatPapper: {
    display: "flex",
    height: "100%",
  },
  contactsHeader: {
    display: "flex",
    flexWrap: "wrap",
    padding: "0px 6px 6px 6px",
  },
}));

const ChatMoments = ({ renderAsTab }) => {
  const classes = useStyles();
  const Wrapper = renderAsTab ? React.Fragment : MainHeader;
  const { user } = useContext(AuthContext);
  return user.profile === "user" && user.allowRealTime === "disabled" ? (
    <ForbiddenPage />
  ) : (
    <Wrapper>
      <Grid
        style={{ width: "99.6%" }}
        container
        justifyContent="center"
        alignItems="flex-start"
      >
        <Grid xs={12} sm={8} xl={4} item>
          <Title>{i18n.t("servicePanel.allowRealTime")}</Title>
        </Grid>
        <Grid style={{ width: "100%", height: "100vh" }} item>
          <Paper
            className={classes.mainPaper}
            variant="outlined"
            style={{ maxWidth: "100%" }}
          >
            <MomentsUser />
          </Paper>
        </Grid>
      </Grid>
    </Wrapper>
  );
};

export default ChatMoments;
