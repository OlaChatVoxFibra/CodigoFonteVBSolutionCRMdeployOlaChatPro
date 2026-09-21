/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Typography,
  makeStyles
} from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import SyncIcon from "@material-ui/icons/Sync";
import CheckCircleOutline from "@material-ui/icons/CheckCircleOutline";
import { toast } from "react-toastify";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import TemplateModal from "../TemplateMetaModal";

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  return {
    toolbar: {
      display: "flex",
      gap: 10,
      alignItems: "center",
      marginBottom: theme.spacing(1.75),
      flexWrap: "wrap"
    },
    search: { flex: 1, minWidth: 200 },
    list: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      maxHeight: 420,
      overflowY: "auto",
      paddingRight: 4,
      marginRight: -4
    },
    card: {
      borderRadius: 12,
      border: `1px solid ${border}`,
      background: isDark ? "rgba(255,255,255,0.03)" : "#fafbfc",
      padding: theme.spacing(1.5, 1.75),
      transition: "border-color 0.15s ease, background 0.15s ease",
      minWidth: 0,
      "&:hover": {
        borderColor: "rgba(37,211,102,0.45)",
        background: isDark ? "rgba(37,211,102,0.06)" : "rgba(37,211,102,0.04)"
      }
    },
    cardSelectable: {
      cursor: "pointer"
    },
    cardActive: {
      borderColor: "#25D366",
      background: isDark ? "rgba(37,211,102,0.1)" : "rgba(37,211,102,0.08)"
    },
    cardHead: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      minWidth: 0
    },
    name: {
      fontWeight: 650,
      fontSize: "0.88rem",
      letterSpacing: "-0.01em",
      wordBreak: "break-word",
      lineHeight: 1.35
    },
    preview: {
      marginTop: 6,
      fontSize: "0.78rem",
      lineHeight: 1.45,
      color: theme.palette.text.secondary,
      wordBreak: "break-word",
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere"
    },
    metaRow: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 10
    },
    empty: {
      borderRadius: 12,
      border: `1px dashed ${border}`,
      padding: theme.spacing(3, 2),
      textAlign: "center"
    }
  };
});

/**
 * Lista / seletor de templates Meta (API Oficial).
 * listMode: cards modernos sem checkbox (página Templates Meta).
 */
export default function MetaOfficialTemplateSelector({
  whatsappId,
  value = null,
  onChange,
  multiple = false,
  selectedIds = [],
  onChangeMultiple,
  disabled = false,
  showSync = true,
  listMode = false
}) {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [templates, setTemplates] = useState([]);
  const [configOpen, setConfigOpen] = useState(false);
  const [pickedTemplate, setPickedTemplate] = useState(null);

  const loadTemplates = useCallback(async () => {
    if (!whatsappId) {
      setTemplates([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get("/quick-messages/list", {
        params: {
          isOficial: true,
          status: "APPROVED",
          whatsappId
        }
      });
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      toastError(err);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [whatsappId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleSync = async () => {
    if (!whatsappId) return;
    setSyncing(true);
    try {
      await api.get(`/whatsapp/sync-templates/${whatsappId}`);
      toast.success("Templates sincronizados com a Meta.");
      await loadTemplates();
    } catch (err) {
      toastError(err);
    } finally {
      setSyncing(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => {
      const name = String(t.shortcode || "").toLowerCase();
      const body = String(t.message || "").toLowerCase();
      const cat = String(t.category || "").toLowerCase();
      return name.includes(q) || body.includes(q) || cat.includes(q);
    });
  }, [templates, search]);

  const handlePickSingle = (template) => {
    if (!template || disabled) return;
    setPickedTemplate(template);
    setConfigOpen(true);
  };

  const handleTemplateConfigured = (payload) => {
    if (!pickedTemplate) return;
    if (typeof onChange === "function") {
      onChange({
        quickMessageId: payload?.id || pickedTemplate.id,
        template: pickedTemplate,
        variables: payload?.variables || {},
        bodyToSave: payload?.bodyToSave || ""
      });
    }
    setConfigOpen(false);
    setPickedTemplate(null);
  };

  const toggleMulti = (id) => {
    if (typeof onChangeMultiple !== "function" || disabled) return;
    const set = new Set((selectedIds || []).map(Number));
    if (set.has(Number(id))) set.delete(Number(id));
    else set.add(Number(id));
    onChangeMultiple(Array.from(set));
  };

  const selectAllFiltered = () => {
    if (typeof onChangeMultiple !== "function" || disabled) return;
    onChangeMultiple(filtered.map((t) => Number(t.id)));
  };

  const clearSelection = () => {
    if (typeof onChangeMultiple !== "function" || disabled) return;
    onChangeMultiple([]);
  };

  if (!whatsappId) {
    return (
      <Typography variant="body2" color="textSecondary">
        Selecione uma conexão WhatsApp API Oficial para carregar os templates.
      </Typography>
    );
  }

  const renderCards = (opts = {}) => {
    const { selectable = false, multiSelect = false } = opts;
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" py={3}>
          <CircularProgress size={28} />
        </Box>
      );
    }
    if (filtered.length === 0) {
      return (
        <Box className={classes.empty}>
          <Typography variant="body2" color="textSecondary">
            Nenhum template aprovado encontrado. Clique em Sincronizar Meta.
          </Typography>
        </Box>
      );
    }
    return (
      <Box className={classes.list}>
        {filtered.map((t) => {
          const selected =
            multiSelect &&
            (selectedIds || []).map(Number).includes(Number(t.id));
          const isValue =
            !multiSelect &&
            value?.quickMessageId &&
            Number(value.quickMessageId) === Number(t.id);
          return (
            <Box
              key={t.id}
              className={[
                classes.card,
                selectable || multiSelect ? classes.cardSelectable : "",
                selected || isValue ? classes.cardActive : ""
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                if (multiSelect) toggleMulti(t.id);
                else if (selectable) handlePickSingle(t);
              }}
              role={selectable || multiSelect ? "button" : undefined}
            >
              <Box className={classes.cardHead}>
                <Typography className={classes.name}>{t.shortcode}</Typography>
                {(selected || isValue) && (
                  <CheckCircleOutline style={{ fontSize: 18, color: "#25D366" }} />
                )}
              </Box>
              {t.message ? (
                <Typography className={classes.preview}>{t.message}</Typography>
              ) : null}
              <Box className={classes.metaRow}>
                <Chip
                  size="small"
                  label={t.status || "APPROVED"}
                  style={{
                    height: 22,
                    fontSize: "0.68rem",
                    background: "rgba(37,211,102,0.12)",
                    color: "#15803d"
                  }}
                />
                {t.language ? (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={t.language}
                    style={{ height: 22, fontSize: "0.68rem" }}
                  />
                ) : null}
                {t.category ? (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={t.category}
                    style={{ height: 22, fontSize: "0.68rem" }}
                  />
                ) : null}
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  };

  return (
    <Box>
      <Box className={classes.toolbar}>
        <TextField
          size="small"
          variant="outlined"
          placeholder="Buscar template..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={disabled}
          className={classes.search}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }}
        />
        {showSync && (
          <Button
            size="small"
            variant="outlined"
            color="primary"
            disabled={disabled || syncing}
            startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
            onClick={handleSync}
          >
            Sincronizar Meta
          </Button>
        )}
        {multiple && filtered.length > 0 && (
          <>
            <Button size="small" variant="text" color="primary" disabled={disabled} onClick={selectAllFiltered}>
              Selecionar todos
            </Button>
            <Button size="small" variant="text" disabled={disabled || !(selectedIds || []).length} onClick={clearSelection}>
              Limpar
            </Button>
            <Typography variant="caption" color="textSecondary">
              {(selectedIds || []).length} selecionado(s)
            </Typography>
          </>
        )}
      </Box>

      {listMode
        ? renderCards({ selectable: false, multiSelect: false })
        : multiple
          ? renderCards({ selectable: false, multiSelect: true })
          : (
            <>
              {loading ? (
                <Box display="flex" justifyContent="center" py={2}>
                  <CircularProgress size={28} />
                </Box>
              ) : (
                <FormControl
                  fullWidth
                  variant="outlined"
                  size="small"
                  disabled={disabled}
                >
                  <InputLabel id="meta-template-select-label">Template Meta</InputLabel>
                  <Select
                    labelId="meta-template-select-label"
                    label="Template Meta"
                    value={value?.quickMessageId || ""}
                    onChange={(e) => {
                      const tpl = filtered.find(
                        (t) => Number(t.id) === Number(e.target.value)
                      );
                      handlePickSingle(tpl);
                    }}
                    renderValue={(selected) => {
                      const tpl = templates.find((t) => Number(t.id) === Number(selected));
                      return tpl ? tpl.shortcode : "Selecione um template";
                    }}
                  >
                    <MenuItem value="">
                      <em>Selecione...</em>
                    </MenuItem>
                    {filtered.map((t) => (
                      <MenuItem key={t.id} value={t.id}>
                        <ListItemText primary={t.shortcode} secondary={t.message} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              {value?.template && (
                <Box mt={1}>
                  <Chip
                    size="small"
                    color="primary"
                    label={`Selecionado: ${value.template.shortcode}`}
                  />
                </Box>
              )}
            </>
          )}

      {configOpen && pickedTemplate && (
        <TemplateModal
          open={configOpen}
          handleClose={() => {
            setConfigOpen(false);
            setPickedTemplate(null);
          }}
          templates={[pickedTemplate]}
          onSelectTemplate={handleTemplateConfigured}
        />
      )}
    </Box>
  );
}
