/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState } from "react";
import {
  Box,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Popover,
  TextField,
  Typography,
  makeStyles
} from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import WhatsApp from "@material-ui/icons/WhatsApp";

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
      fontWeight: 500,
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
    searchContainer: {
      display: "flex",
      alignItems: "center",
      marginBottom: theme.spacing(1),
      gap: 6
    },
    searchInput: {
      flex: 1,
      "& .MuiOutlinedInput-input": { padding: "10px 12px", fontSize: "0.8rem" }
    },
    templateItem: {
      borderRadius: 8,
      marginBottom: 6,
      paddingTop: 8,
      paddingBottom: 8,
      backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
      "&:hover": {
        backgroundColor: isDark
          ? "rgba(37,211,102,0.1)"
          : "rgba(37,211,102,0.08)"
      }
    },
    templateInfo: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8
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

const TemplateModal = ({
  open,
  handleClose,
  templates,
  onSelectTemplate,
  anchorEl
}) => {
  const classes = useStyles();
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [variables, setVariables] = useState([]);
  const [variableValues, setVariableValues] = useState({});
  const [renderedContent, setRenderedContent] = useState("");

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
  };

  const extractVariablesByComponent = (components) => {
    const regex = /\{\{(\d+)\}\}/g;
    const result = {
      header: [],
      body: [],
      buttons: []
    };

    (components || []).forEach((component) => {
      const type = String(component.type || "").toUpperCase();
      const format = String(component.format || "TEXT").toUpperCase();
      const text = component.text || "";

      if (type === "HEADER") {
        if (["IMAGE", "VIDEO", "DOCUMENT"].includes(format)) {
          result.header.push({
            index: 1,
            prompt: `URL da mídia do HEADER (${format})`,
            kind: format.toLowerCase()
          });
          return;
        }
        let match;
        while ((match = regex.exec(text)) !== null) {
          result.header.push({
            index: Number(match[1]),
            prompt: `HEADER {{${match[1]}}}`
          });
        }
        regex.lastIndex = 0;
        return;
      }

      if (type === "BODY") {
        let match;
        while ((match = regex.exec(text)) !== null) {
          result.body.push({
            index: Number(match[1]),
            prompt: `BODY {{${match[1]}}}`
          });
        }
        regex.lastIndex = 0;
        return;
      }

      if (type === "BUTTONS") {
        let buttons = [];
        try {
          buttons =
            typeof component.buttons === "string"
              ? JSON.parse(component.buttons || "[]")
              : component.buttons || [];
        } catch {
          buttons = [];
        }
        (buttons || []).forEach((button, btnIndex) => {
          const btnType = String(button?.type || "").toUpperCase();
          if (btnType === "COPY_CODE") {
            result.buttons.push({
              index: btnIndex,
              buttonIndex: btnIndex,
              prompt: `Código do cupom (botão ${btnIndex + 1})`,
              kind: "copy_code"
            });
          } else if (
            btnType === "URL" &&
            (String(button?.url || "").includes("{{") ||
              String(button?.example || "").includes("{{"))
          ) {
            result.buttons.push({
              index: btnIndex,
              buttonIndex: btnIndex,
              prompt: `Sufixo dinâmico da URL (botão ${btnIndex + 1})`,
              kind: "url"
            });
          }
        });
      }
    });

    return result;
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    const vars = extractVariablesByComponent(template?.components || []);
    setVariables(vars);
    setVariableValues({});
    const preview = (template?.components || [])
      .map((c) => c?.text)
      .filter(Boolean)
      .join("\n");
    setRenderedContent(preview);
  };

  const handleSendTemplate = () => {
    if (!selectedTemplate) return;
    let bodyToSave = renderedContent || "";
    // Normaliza chaves buttons -> button para o backend
    const normalized = { ...variableValues };
    if (normalized.buttons && !normalized.button) {
      normalized.button = normalized.buttons;
      delete normalized.buttons;
    }
    Object.keys(normalized).forEach((componentType) => {
      Object.keys(normalized[componentType] || {}).forEach((index) => {
        const entry = normalized[componentType][index];
        if (entry?.value != null) {
          bodyToSave = bodyToSave.replace(
            new RegExp(`\\{\\{${index}\\}\\}`, "g"),
            entry.value
          );
        }
      });
    });
    onSelectTemplate({
      ...selectedTemplate,
      variables: normalized,
      bodyToSave
    });
    setSelectedTemplate(null);
    setVariableValues({});
    setRenderedContent("");
    setSearch("");
  };

  const handleVariableChange = (componentType, index, value, buttonIndex) => {
    const newComponentValues = {
      ...variableValues[componentType],
      [String(index)]: { value, buttonIndex }
    };
    setVariableValues({ ...variableValues, [componentType]: newComponentValues });
  };

  const filteredTemplates = (templates || []).filter((template) =>
    String(template?.shortcode || template?.name || "")
      .toLowerCase()
      .includes(String(search || "").toLowerCase())
  );

  const onClose = () => {
    setSelectedTemplate(null);
    setVariableValues({});
    setRenderedContent("");
    setSearch("");
    handleClose?.();
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
          Templates do WhatsApp
        </Typography>
        <Typography className={classes.hint}>
          Selecione um template APPROVED. Obrigatório fora da janela 24h.
        </Typography>
      </Box>
      <Divider />
      <Box className={classes.body}>
        {!selectedTemplate ? (
          <>
            <div className={classes.searchContainer}>
              <SearchIcon style={{ fontSize: 18, opacity: 0.7 }} />
              <TextField
                variant="outlined"
                size="small"
                placeholder="Pesquisar Templates"
                value={search}
                onChange={handleSearchChange}
                className={classes.searchInput}
                fullWidth
              />
            </div>
            <List dense disablePadding>
              {filteredTemplates.map((template, index) => (
                <ListItem
                  key={template.id || index}
                  button
                  className={classes.templateItem}
                  onClick={() => handleSelectTemplate(template)}
                >
                  <ListItemText
                    primary={
                      <div className={classes.templateInfo}>
                        <Typography style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                          {template.shortcode || template.name}
                        </Typography>
                        <Typography
                          style={{ fontSize: "0.68rem" }}
                          color="textSecondary"
                        >
                          {template.language}
                        </Typography>
                      </div>
                    }
                    secondary={
                      <Typography
                        component="span"
                        style={{ fontSize: "0.68rem", lineHeight: 1.35 }}
                        color="textSecondary"
                      >
                        {(template?.components || [])
                          .map((c) => c?.text)
                          .filter(Boolean)
                          .join(" · ")
                          .slice(0, 120)}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
              {filteredTemplates.length === 0 ? (
                <Typography
                  variant="caption"
                  color="textSecondary"
                  style={{ display: "block", padding: "8px 4px" }}
                >
                  Nenhum template encontrado. Sincronize a Meta na conexão.
                </Typography>
              ) : null}
            </List>
          </>
        ) : (
          <Box>
            <Typography style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: 6 }}>
              {selectedTemplate.shortcode || selectedTemplate.name}
            </Typography>
            <Typography
              color="textSecondary"
              style={{ fontSize: "0.72rem", whiteSpace: "pre-wrap", marginBottom: 10 }}
            >
              {renderedContent}
            </Typography>
            {Object.keys(variables).map((componentType) =>
              variables[componentType].length > 0 ? (
                <Box key={componentType} className={classes.field}>
                  <Typography
                    style={{ fontSize: "0.72rem", fontWeight: 600, marginBottom: 4 }}
                  >
                    {componentType.toUpperCase()}
                  </Typography>
                  {variables[componentType].map((variable) => (
                    <TextField
                      key={`${componentType}-${variable.index}-${variable.buttonIndex || 0}`}
                      label={variable?.prompt}
                      value={
                        variableValues[componentType]?.[String(variable.index)]
                          ?.value || ""
                      }
                      onChange={(e) =>
                        handleVariableChange(
                          componentType,
                          variable.index,
                          e.target.value,
                          variable?.buttonIndex ?? variable.index
                        )
                      }
                      fullWidth
                      size="small"
                      variant="outlined"
                      margin="dense"
                    />
                  ))}
                </Box>
              ) : null
            )}
          </Box>
        )}
      </Box>
      {selectedTemplate ? (
        <Box className={classes.actions}>
          <Button
            size="small"
            onClick={() => {
              setSelectedTemplate(null);
              setVariableValues({});
              setRenderedContent("");
            }}
          >
            Voltar
          </Button>
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={handleSendTemplate}
          >
            Enviar
          </Button>
        </Box>
      ) : null}
    </Popover>
  );
};

export default TemplateModal;
