/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Box, Typography, Paper } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import {
  ListAlt,
  Palette,
  Message,
  Link,
  Star,
  AccountTree,
} from "@material-ui/icons";
import { motion } from "framer-motion";

const HELVETICA =
  '"Helvetica Neue", Helvetica, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';

const useStyles = makeStyles((theme) => ({
  root: { fontFamily: HELVETICA },
  intro: {
    fontSize: 12,
    color: theme.palette.text.secondary,
    lineHeight: 1.45,
    marginBottom: 14,
  },
  stepCard: {
    display: "flex",
    gap: 12,
    padding: theme.spacing(1.25, 1.5),
    borderRadius: 10,
    marginBottom: 8,
    border: `1px solid ${
      theme.palette.type === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"
    }`,
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    background: theme.palette.type === "dark" ? "rgba(255,255,255,0.1)" : "#e8e8ed",
  },
  stepTitle: { fontSize: 13, fontWeight: 600, marginBottom: 2 },
  stepDesc: { fontSize: 11, color: theme.palette.text.secondary, lineHeight: 1.4 },
  tip: {
    fontSize: 11,
    padding: theme.spacing(1, 1.25),
    borderRadius: 8,
    marginTop: 10,
    background:
      theme.palette.type === "dark" ? "rgba(52,199,89,0.12)" : "rgba(52,199,89,0.1)",
    color: theme.palette.type === "dark" ? "#6ee7a0" : "#248a3d",
  },
}));

const STEPS = [
  {
    icon: ListAlt,
    color: "#5856d6",
    title: "Criar uma fila",
    desc: 'Acesse Filas & Chatbot → Filas e clique em "+". Cada fila organiza um tipo de atendimento.',
  },
  {
    icon: Palette,
    color: "#ff9500",
    title: "Nome, cor e ordem",
    desc: "Defina um nome claro e uma cor para identificar a fila na tela de tickets.",
  },
  {
    icon: Message,
    color: "#25D366",
    title: "Saudação da fila",
    desc: "Opcional: mensagem automática quando o cliente entra nesta fila.",
  },
  {
    icon: Link,
    color: "#007aff",
    title: "Vincular à conexão",
    desc: "Ao criar o WhatsApp, na etapa Filas, marque quais listas essa conexão atende.",
  },
  {
    icon: Star,
    color: "#ffcc00",
    title: "NPS na conexão",
    desc: "Na criação da conexão, etapa opcional: configure mensagem de avaliação (NPS) após o atendimento.",
  },
  {
    icon: AccountTree,
    color: "#af52de",
    title: "Fluxos automáticos",
    desc: "Também na conexão: fluxos de boas-vindas e resposta padrão para novos contatos.",
  },
];

const QueuesDocs = () => {
  const classes = useStyles();
  return (
    <Box className={classes.root}>
      <Typography className={classes.intro}>
        As filas (listas) distribuem os tickets entre sua equipe. Configure-as antes ou
        junto com a conexão WhatsApp.
      </Typography>
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        return (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Paper className={classes.stepCard} elevation={0}>
              <Box className={classes.stepNum}>
                <Icon style={{ fontSize: 16, color: step.color }} />
              </Box>
              <Box>
                <Typography className={classes.stepTitle}>{step.title}</Typography>
                <Typography className={classes.stepDesc}>{step.desc}</Typography>
              </Box>
            </Paper>
          </motion.div>
        );
      })}
      <Typography className={classes.tip}>
        Dica: sem fila vinculada à conexão, os tickets podem não ser distribuídos
        corretamente aos atendentes.
      </Typography>
    </Box>
  );
};

export default QueuesDocs;
