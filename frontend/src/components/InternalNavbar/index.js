/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.paper,
    marginBottom: theme.spacing(2),
    borderRadius: 8,
  },
  tabs: {
    "& .MuiTab-root": {
      minWidth: 100,
      fontWeight: "bold",
    },
  },
}));

const InternalNavbar = ({ tabs, activeTab, onChange }) => {
  const classes = useStyles();

  return (
    <Paper className={classes.root} elevation={1}>
      <Tabs
        value={activeTab}
        onChange={onChange}
        indicatorColor="primary"
        textColor="primary"
        className={classes.tabs}
        variant="scrollable"
        scrollButtons="auto"
      >
        {tabs.map((tab) => (
          <Tab 
            key={tab.value} 
            label={tab.label} 
            value={tab.value} 
            icon={tab.icon} 
            labelPlacement="end"
          />
        ))}
      </Tabs>
    </Paper>
  );
};

export default InternalNavbar;
