/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect } from "react";
import {
  IconButton,
  Tooltip,
  Button,
  Typography,
  Box,
  Fade,
  Paper,
  CircularProgress,
} from "@material-ui/core";
import { 
  Update as UpdateIcon, 
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Close as CloseIcon 
} from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";
import api from "../../services/api";

const packageVersion = require("../../../package.json").version;

const useStyles = makeStyles((theme) => ({
  banner: {
    position: "fixed",
    top: 64,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: theme.zIndex.drawer + 2,
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    backgroundColor: theme.palette.info.main,
    color: "white",
    padding: theme.spacing(1.5, 3),
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    maxWidth: "600px",
    minWidth: "400px",
    width: "90%",
    [theme.breakpoints.down("sm")]: {
      width: "95%",
      minWidth: "300px",
      padding: theme.spacing(1, 2),
    },
  },
  pulseIcon: {
    animation: "$pulse 2s infinite",
    color: theme.palette.error.main,
  },
  updateButton: {
    backgroundColor: theme.palette.success.main,
    color: "white",
    fontWeight: "bold",
    "&:hover": {
      backgroundColor: theme.palette.success.dark,
    },
  },
  bannerButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    color: "white",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.3)",
    },
  },
  iconContainer: {
    display: "flex",
    alignItems: "center",
    marginRight: theme.spacing(1),
  },
  "@keyframes pulse": {
    "0%": { transform: "scale(1)", opacity: 1 },
    "50%": { transform: "scale(1.1)", opacity: 0.8 },
    "100%": { transform: "scale(1)", opacity: 1 },
  },
}));

const VersionControl = () => {
  const classes = useStyles();
  const [storedVersion] = useState(
    window.localStorage.getItem("version") || "4.7.7"
  );
  const [showBanner, setShowBanner] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const hasNewVersion = false; // storedVersion !== packageVersion;

  useEffect(() => {
    if (hasNewVersion) {
      const timer = setTimeout(() => setShowBanner(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [hasNewVersion]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    try {
      window.localStorage.setItem("version", packageVersion);
      await api.post("/version", { version: packageVersion });

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error("Erro na atualização:", error);
      setIsUpdating(false);
    }
  };

  if (!hasNewVersion) {
    return null;
  }

  return (
    <>
      {/* Banner de Atualização Centralizado */}
      <Fade in={showBanner && !isUpdating}>
        <Paper className={classes.banner} elevation={4}>
          <Box display="flex" alignItems="center" flex={1}>
            <div className={classes.iconContainer}>
              <InfoIcon />
            </div>
            <Typography variant="body2">
              <strong>Nova versão {packageVersion} disponível!</strong>
              {" Clique em atualizar para obter as últimas melhorias."}
            </Typography>
          </Box>
          <Box display="flex" gap={1} alignItems="center" ml={2}>
            {isUpdating && <CircularProgress size={20} style={{ color: "white" }} />}
            <Button
              size="small"
              onClick={handleUpdate}
              disabled={isUpdating}
              startIcon={!isUpdating && <RefreshIcon />}
              className={classes.updateButton}
            >
              {isUpdating ? "Atualizando..." : "Atualizar"}
            </Button>
            {!isUpdating && (
              <IconButton
                size="small"
                onClick={() => setShowBanner(false)}
                style={{ color: "white" }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Paper>
      </Fade>
    </>
  );
};

export default VersionControl;