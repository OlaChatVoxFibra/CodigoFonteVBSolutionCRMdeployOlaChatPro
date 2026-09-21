/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import { Paper } from "@material-ui/core";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import BirthdaySettings from "../../components/BirthdaySettings";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: 0,
    overflowY: "scroll",
    ...theme.scrollbarStyles,
    backgroundColor: theme.palette.listScrollArea,
  },
}));

const BirthdaySettingsPage = ({ renderAsTab }) => {
  const classes = useStyles();
  const Container = renderAsTab ? ({ children }) => <>{children}</> : MainContainer;

  return (
    <Container>
      {!renderAsTab && (
        <MainHeader>
          <Title>🎂 Configurações de Aniversário</Title>
        </MainHeader>
      )}
      <Paper className={classes.mainPaper} variant="outlined">
        <BirthdaySettings />
      </Paper>
    </Container>
  );
};

export default BirthdaySettingsPage;