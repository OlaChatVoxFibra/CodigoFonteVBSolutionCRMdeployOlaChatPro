/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Box, Button, makeStyles } from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import AddIcon from "@material-ui/icons/Add";
import { CONNECTIONS_FONT } from "./connectionsTypography";
import { getConnectionsBorder } from "./connectionsTheme";

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  return {
    root: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing(1),
      marginBottom: theme.spacing(1.5),
      flexWrap: "wrap",
    },
    searchWrap: {
      flex: 1,
      minWidth: 160,
      display: "flex",
      alignItems: "center",
      padding: theme.spacing(0.65, 1.1),
      borderRadius: 8,
      border: `1px solid ${getConnectionsBorder(theme)}`,
      backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#fafafa",
      fontFamily: CONNECTIONS_FONT,
      transition: "border-color 0.2s ease",
      "&:focus-within": {
        borderColor: theme.palette.primary.main,
      },
    },
    searchIcon: {
      opacity: theme.palette.type === "dark" ? 0.5 : 0.35,
      marginRight: theme.spacing(0.75),
      fontSize: 18,
      color: theme.palette.text.secondary,
    },
    searchInput: {
      border: "none",
      outline: "none",
      width: "100%",
      fontSize: "0.8125rem",
      fontFamily: CONNECTIONS_FONT,
      fontWeight: 400,
      background: "transparent",
      color: theme.palette.text.primary,
      "&::placeholder": {
        color: theme.palette.text.secondary,
        opacity: 0.85,
      },
    },
    createBtn: {
      fontFamily: CONNECTIONS_FONT,
      fontWeight: 500,
      fontSize: "0.8125rem",
      textTransform: "none",
      borderRadius: 8,
      padding: theme.spacing(0.65, 1.5),
      boxShadow: "none",
      flexShrink: 0,
      whiteSpace: "nowrap",
    },
  };
});

export default function ConnectionsManageToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar conexões...",
  onCreateConnection,
  createLabel = "Criar conexão",
  createDisabled = false,
}) {
  const classes = useStyles();

  return (
    <Box className={classes.root}>
      <Box className={classes.searchWrap}>
        <SearchIcon className={classes.searchIcon} />
        <input
          type="search"
          className={classes.searchInput}
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label={searchPlaceholder}
        />
      </Box>
      {typeof onCreateConnection === "function" ? (
        <Button
          variant="contained"
          color="primary"
          className={classes.createBtn}
          startIcon={<AddIcon style={{ fontSize: 18 }} />}
          onClick={onCreateConnection}
          disabled={createDisabled}
          disableElevation
        >
          {createLabel}
        </Button>
      ) : null}
    </Box>
  );
}
