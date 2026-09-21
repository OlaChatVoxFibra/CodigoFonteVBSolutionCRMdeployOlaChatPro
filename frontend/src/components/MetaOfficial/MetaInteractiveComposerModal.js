/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Popover,
  Select,
  TextField,
  Typography,
  makeStyles
} from "@material-ui/core";
import AddIcon from "@material-ui/icons/Add";
import DeleteIcon from "@material-ui/icons/Delete";
import WhatsApp from "@material-ui/icons/WhatsApp";
import { toast } from "react-toastify";

const emptyRow = () => ({ id: "", title: "", description: "" });

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  return {
    paper: {
      width: 320,
      maxWidth: "calc(100vw - 16px)",
      maxHeight: "min(72vh, 520px)",
      display: "flex",
      flexDirection: "column",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: isDark
        ? "0 12px 40px rgba(0,0,0,0.5)"
        : "0 12px 32px rgba(15,23,42,0.14)",
      border: isDark
        ? "1px solid rgba(255,255,255,0.08)"
        : "1px solid rgba(15,23,42,0.08)"
    },
    header: {
      padding: theme.spacing(1.25, 1.5, 1),
      flexShrink: 0
    },
    title: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontWeight: 600,
      fontSize: "0.82rem",
      color: "#25D366"
    },
    hint: {
      fontSize: "0.68rem",
      marginTop: 4,
      color: theme.palette.text.secondary,
      lineHeight: 1.35
    },
    body: {
      padding: theme.spacing(1, 1.5, 1),
      overflowY: "auto",
      flex: 1
    },
    actions: {
      display: "flex",
      justifyContent: "flex-end",
      gap: 8,
      padding: theme.spacing(1, 1.5, 1.25),
      borderTop: isDark
        ? "1px solid rgba(255,255,255,0.08)"
        : "1px solid rgba(15,23,42,0.08)",
      flexShrink: 0
    },
    field: { marginBottom: 10 }
  };
});

/**
 * Composer compacto (Popover) — botões ou lista/enquete Meta.
 */
export default function MetaInteractiveComposerModal({
  open,
  anchorEl,
  onClose,
  onSend
}) {
  const classes = useStyles();
  const [mode, setMode] = useState("list");
  const [bodyText, setBodyText] = useState("Escolha uma opção:");
  const [footerText, setFooterText] = useState("");
  const [listTitle, setListTitle] = useState("Opções");
  const [buttonLabel, setButtonLabel] = useState("Ver opções");
  const [buttons, setButtons] = useState([
    { id: "opt_1", title: "Opção 1" },
    { id: "opt_2", title: "Opção 2" }
  ]);
  const [rows, setRows] = useState([
    { id: "row_1", title: "Opção A", description: "" },
    { id: "row_2", title: "Opção B", description: "" }
  ]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) {
      setSending(false);
    }
  }, [open]);

  const buildPayload = () => {
    if (!bodyText.trim()) {
      throw new Error("Informe o texto da mensagem.");
    }

    if (mode === "button") {
      const validButtons = buttons.filter((b) => b.title.trim());
      if (validButtons.length === 0) {
        throw new Error("Adicione ao menos um botão.");
      }
      if (validButtons.length > 3) {
        throw new Error("Máximo de 3 botões na API oficial.");
      }
      return {
        type: "button",
        body: { text: bodyText.trim() },
        ...(footerText.trim() ? { footer: { text: footerText.trim() } } : {}),
        action: {
          buttons: validButtons.map((b, i) => {
            const title = b.title.trim().slice(0, 20);
            const slug = title
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "_")
              .replace(/^_|_$/g, "")
              .slice(0, 100);
            return {
              type: "reply",
              reply: {
                id: (b.id && !/^opt_\d+$/i.test(b.id) ? b.id : slug || `btn_${i + 1}`).slice(0, 256),
                title
              }
            };
          })
        }
      };
    }

    const validRows = rows.filter((r) => r.title.trim());
    if (validRows.length === 0) {
      throw new Error("Adicione ao menos uma opção na enquete.");
    }
    if (!buttonLabel.trim()) {
      throw new Error("Informe o texto do botão que abre a lista.");
    }
    return {
      type: "list",
      body: { text: bodyText.trim() },
      ...(footerText.trim() ? { footer: { text: footerText.trim() } } : {}),
      action: {
        button: buttonLabel.trim().slice(0, 20),
        sections: [
          {
            title: listTitle.trim().slice(0, 24) || "Opções",
            rows: validRows.map((r, i) => {
              const title = r.title.trim().slice(0, 24);
              const slug = title
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/^_|_$/g, "")
                .slice(0, 100);
              return {
                id: (r.id && !/^row_\d+$/i.test(r.id) ? r.id : slug || `row_${i + 1}`).slice(0, 200),
                title,
                ...(r.description?.trim()
                  ? { description: r.description.trim().slice(0, 72) }
                  : {})
              };
            })
          }
        ]
      }
    };
  };

  const handleSend = async () => {
    try {
      const interactive = buildPayload();
      const label =
        mode === "button" ? `🔘 ${bodyText.trim()}` : `📋 ${bodyText.trim()}`;
      setSending(true);
      await onSend({ interactive, bodyToSave: label });
      setSending(false);
    } catch (e) {
      // onSend já trata toast de API; aqui só erros locais de validação
      if (e?.message && !e?.response) {
        toast.error(e.message);
      }
      setSending(false);
    }
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      transformOrigin={{ vertical: "bottom", horizontal: "right" }}
      marginThreshold={8}
      disableScrollLock
      PaperProps={{ className: classes.paper, elevation: 8 }}
    >
      <Box className={classes.header}>
        <Typography className={classes.title} component="div">
          <WhatsApp style={{ fontSize: 18 }} />
          Botões / Enquete
        </Typography>
        <Typography className={classes.hint}>
          Lista = enquete (Meta não tem poll nativo). Precisa da janela 24h ativa.
          Preencha o texto antes de enviar.
        </Typography>
      </Box>
      <Divider />
      <Box className={classes.body}>
        <FormControl
          fullWidth
          variant="outlined"
          size="small"
          className={classes.field}
        >
          <InputLabel>Tipo</InputLabel>
          <Select
            label="Tipo"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <MenuItem value="list">Lista / Enquete</MenuItem>
            <MenuItem value="button">Botões de resposta (até 3)</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          multiline
          minRows={2}
          label="Texto da mensagem *"
          variant="outlined"
          size="small"
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          className={classes.field}
          required
        />

        <TextField
          fullWidth
          label="Rodapé (opcional)"
          variant="outlined"
          size="small"
          value={footerText}
          onChange={(e) => setFooterText(e.target.value)}
          className={classes.field}
        />

        {mode === "button" ? (
          <Box>
            {buttons.map((b, idx) => (
              <Box key={idx} display="flex" alignItems="center" mb={1}>
                <TextField
                  label={`Botão ${idx + 1}`}
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={b.title}
                  onChange={(e) => {
                    const next = [...buttons];
                    next[idx] = { ...next[idx], title: e.target.value };
                    setButtons(next);
                  }}
                />
                <IconButton
                  size="small"
                  disabled={buttons.length <= 1}
                  onClick={() =>
                    setButtons(buttons.filter((_, i) => i !== idx))
                  }
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button
              size="small"
              startIcon={<AddIcon />}
              disabled={buttons.length >= 3}
              onClick={() =>
                setButtons([
                  ...buttons,
                  { id: `opt_${buttons.length + 1}`, title: "" }
                ])
              }
            >
              Adicionar botão
            </Button>
          </Box>
        ) : (
          <Box>
            <TextField
              fullWidth
              label="Botão que abre a lista *"
              variant="outlined"
              size="small"
              value={buttonLabel}
              onChange={(e) => setButtonLabel(e.target.value)}
              className={classes.field}
            />
            <TextField
              fullWidth
              label="Título da seção"
              variant="outlined"
              size="small"
              value={listTitle}
              onChange={(e) => setListTitle(e.target.value)}
              className={classes.field}
            />
            {rows.map((r, idx) => (
              <Box key={idx} display="flex" alignItems="center" mb={1}>
                <TextField
                  label={`Opção ${idx + 1}`}
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={r.title}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...next[idx], title: e.target.value };
                    setRows(next);
                  }}
                />
                <IconButton
                  size="small"
                  disabled={rows.length <= 1}
                  onClick={() => setRows(rows.filter((_, i) => i !== idx))}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button
              size="small"
              startIcon={<AddIcon />}
              disabled={rows.length >= 10}
              onClick={() =>
                setRows([
                  ...rows,
                  {
                    id: `row_${rows.length + 1}`,
                    title: "",
                    description: ""
                  }
                ])
              }
            >
              Adicionar opção
            </Button>
          </Box>
        )}
      </Box>
      <Box className={classes.actions}>
        <Button size="small" onClick={onClose} disabled={sending}>
          Cancelar
        </Button>
        <Button
          size="small"
          color="primary"
          variant="contained"
          onClick={handleSend}
          disabled={sending}
          startIcon={
            sending ? <CircularProgress size={14} color="inherit" /> : null
          }
        >
          Enviar
        </Button>
      </Box>
    </Popover>
  );
}
