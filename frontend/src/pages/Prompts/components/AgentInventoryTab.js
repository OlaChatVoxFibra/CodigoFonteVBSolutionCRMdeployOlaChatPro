/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  InputAdornment,
  Switch,
  TextField,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { Copy, MessageSquare, Package, Search } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../../services/api";
import InventoryReplySettingsPanel from "../../../components/InventoryReplySettingsPanel";
import WhatsAppIphonePreview from "../../../components/WhatsAppIphonePreview";
import {
  DEFAULT_AGENT_INVENTORY_REPLY,
  buildInventoryWhatsAppPreview,
  formatPrice,
  normalizeAgentInventory,
  normalizeInventoryReply
} from "../../../helpers/inventoryReplyTemplates";

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const ink = isDark ? "rgba(255,255,255,0.92)" : "#1d1d1f";
  const muted = isDark ? "rgba(255,255,255,0.55)" : "#86868b";
  const hairline = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const surface = isDark ? "rgba(255,255,255,0.04)" : "#ffffff";
  const accent = isDark ? "#0a84ff" : "#0071e3";
  return {
    root: {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, system-ui, sans-serif',
      color: ink,
      width: "100%"
    },
    hero: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 16,
      marginBottom: 18
    },
    title: {
      fontSize: 22,
      fontWeight: 650,
      letterSpacing: "-0.03em",
      lineHeight: 1.2,
      color: ink
    },
    sub: {
      fontSize: 13.5,
      color: muted,
      marginTop: 4,
      maxWidth: 560,
      lineHeight: 1.45
    },
    steps: {
      fontSize: 11.5,
      color: muted,
      marginTop: 10,
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap"
    },
    stepDot: {
      width: 3,
      height: 3,
      borderRadius: "50%",
      background: muted,
      display: "inline-block"
    },
    activeRow: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexShrink: 0
    },
    activeLabel: { fontSize: 13, fontWeight: 600, color: ink },
    iosSwitch: {
      "& .MuiSwitch-switchBase.Mui-checked": { color: accent },
      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
        backgroundColor: accent,
        opacity: 1
      }
    },
    split: {
      display: "grid",
      gridTemplateColumns: "minmax(220px, 0.85fr) minmax(280px, 1.15fr) minmax(220px, 0.85fr)",
      gap: 14,
      transition: "opacity 0.2s ease",
      [theme.breakpoints.down(1200)]: {
        gridTemplateColumns: "1fr 1fr",
        "& $previewPanel": { gridColumn: "1 / -1" }
      },
      [theme.breakpoints.down(820)]: {
        gridTemplateColumns: "1fr"
      }
    },
    splitDisabled: {
      opacity: 0.55,
      pointerEvents: "none"
    },
    panel: {
      borderRadius: 14,
      border: `1px solid ${hairline}`,
      background: surface,
      minHeight: 520,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    },
    previewPanel: {},
    panelHead: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "14px 14px 10px",
      borderBottom: `1px solid ${hairline}`
    },
    panelTitle: {
      fontSize: 14,
      fontWeight: 650,
      letterSpacing: "-0.02em",
      flex: 1
    },
    badge: {
      fontSize: 11,
      fontWeight: 600,
      padding: "2px 8px",
      borderRadius: 999,
      background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
      color: muted
    },
    panelBody: {
      flex: 1,
      padding: 12,
      overflow: "auto",
      display: "flex",
      flexDirection: "column",
      gap: 10
    },
    searchField: {
      "& .MuiOutlinedInput-root": { borderRadius: 10 },
      "& .MuiInputBase-input": { fontSize: 13, padding: "10px 0" }
    },
    selectAllRow: {
      display: "flex",
      alignItems: "center",
      gap: 4
    },
    selectAllLabel: { fontSize: 12.5, color: ink, fontWeight: 500 },
    clearBtn: {
      textTransform: "none",
      color: accent,
      fontWeight: 600,
      fontSize: 12.5,
      marginLeft: "auto",
      padding: "2px 6px"
    },
    list: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      flex: 1,
      overflow: "auto",
      maxHeight: 380
    },
    productRow: {
      display: "grid",
      gridTemplateColumns: "28px 36px 1fr",
      gap: 8,
      alignItems: "center",
      padding: "8px 10px",
      borderRadius: 12,
      border: `1px solid ${hairline}`,
      cursor: "pointer",
      transition: "border-color 0.15s, background 0.15s"
    },
    productRowSelected: {
      borderColor: accent,
      background: isDark ? "rgba(10,132,255,0.14)" : "rgba(0,113,227,0.06)"
    },
    thumb: {
      width: 36,
      height: 36,
      borderRadius: 8,
      background: isDark ? "rgba(255,255,255,0.08)" : "#f0f0f2",
      backgroundSize: "cover",
      backgroundPosition: "center",
      flexShrink: 0
    },
    productName: {
      fontSize: 13,
      fontWeight: 700,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      color: ink
    },
    productSub: {
      fontSize: 11.5,
      color: muted,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    },
    empty: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      gap: 8,
      padding: 24,
      color: muted
    },
    emptyTitle: { fontSize: 14, fontWeight: 650, color: ink },
    emptyHint: { fontSize: 12.5, color: muted, maxWidth: 240 },
    sameCard: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "12px 14px",
      borderRadius: 12,
      border: `1px solid ${hairline}`,
      background: isDark ? "rgba(255,255,255,0.03)" : "#fafafa"
    },
    sameTitle: { fontSize: 13, fontWeight: 650, color: ink },
    sameHint: { fontSize: 11.5, color: muted, marginTop: 2 },
    editorCard: {
      borderRadius: 12,
      border: `1px solid ${hairline}`,
      padding: 12,
      display: "flex",
      flexDirection: "column",
      gap: 10
    },
    editorHead: {
      display: "flex",
      alignItems: "center",
      gap: 10
    },
    editorTitle: { fontSize: 13.5, fontWeight: 650, color: ink },
    chipRow: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6
    },
    phChip: {
      height: 26,
      fontSize: 11.5,
      borderRadius: 8,
      cursor: "pointer",
      background: isDark ? "rgba(255,255,255,0.06)" : "#f5f5f7"
    },
    optionsBtn: {
      textTransform: "none",
      color: accent,
      fontWeight: 600,
      fontSize: 12.5,
      alignSelf: "flex-start",
      padding: "2px 0"
    },
    footer: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginTop: 4,
      flexWrap: "wrap"
    },
    footerHint: { fontSize: 12, color: muted, flex: 1 },
    footerFlash: { fontSize: 12, color: "#34C759", fontWeight: 600, flex: 1 },
    saveBtn: {
      textTransform: "none",
      borderRadius: 10,
      background: accent,
      color: "#fff",
      fontWeight: 650,
      fontSize: 13,
      padding: "8px 16px",
      "&:hover": { background: isDark ? "#0060df" : "#0077ed" }
    },
    previewChips: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 8
    }
  };
});

const PLACEHOLDER_CHIPS = [
  "{{nome}}",
  "{{preco}}",
  "{{estoque_frase}}",
  "{{link}}",
  "{{descricao}}"
];

function ProductMessageEditor({
  classes,
  title,
  thumb,
  reply,
  onChange
}) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const draft = normalizeInventoryReply(reply);

  const insertPlaceholder = (ph) => {
    onChange({ ...draft, template: `${draft.template || ""}${ph}`, strategyPreset: "custom" });
  };

  return (
    <Box className={classes.editorCard}>
      <Box className={classes.editorHead}>
        <Box
          className={classes.thumb}
          style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}
        />
        <Typography className={classes.editorTitle}>{title}</Typography>
      </Box>
      <TextField
        variant="outlined"
        size="small"
        fullWidth
        multiline
        minRows={3}
        placeholder="Como o agente deve responder sobre este produto…"
        value={draft.template}
        onChange={(e) =>
          onChange({
            ...draft,
            template: e.target.value,
            strategyPreset: "custom"
          })
        }
        InputProps={{ style: { borderRadius: 10, fontSize: 13 } }}
      />
      <Box className={classes.chipRow}>
        {PLACEHOLDER_CHIPS.map((ph) => (
          <Chip
            key={ph}
            size="small"
            label={ph}
            className={classes.phChip}
            onClick={() => insertPlaceholder(ph)}
          />
        ))}
      </Box>
      <Button className={classes.optionsBtn} onClick={() => setOptionsOpen((v) => !v)}>
        {optionsOpen ? "Menos opções" : "Tom, imagens e anexos"}
      </Button>
      <Collapse in={optionsOpen}>
        <InventoryReplySettingsPanel
          compact
          showPreview={false}
          hideTemplate
          value={draft}
          onChange={onChange}
        />
      </Collapse>
    </Box>
  );
}

export default function AgentInventoryTab({
  value,
  onChange,
  promptId,
  onEnsureProductActions
}) {
  const classes = useStyles();
  const inventory = useMemo(() => normalizeAgentInventory(value), [value]);

  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [sharedDraft, setSharedDraft] = useState(() =>
    normalizeInventoryReply(inventory.reply)
  );
  const [savingMsgs, setSavingMsgs] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [previewId, setPreviewId] = useState(null);

  const patch = useCallback(
    (partial) => {
      if (typeof onChange === "function") {
        onChange(normalizeAgentInventory({ ...inventory, ...partial }));
      }
    },
    [inventory, onChange]
  );

  const load = useCallback(async (param) => {
    setLoading(true);
    try {
      const { data } = await api.get("/inventory", {
        params: { searchParam: param || "", pageNumber: 1 }
      });
      setItems(Array.isArray(data?.inventory) ? data.inventory : []);
    } catch (e) {
      toast.error("Não foi possível carregar produtos do inventário.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  // Hidrata drafts quando seleção muda
  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      inventory.productIds.forEach((id) => {
        const key = String(id);
        if (next[key]) return;
        const item = items.find((p) => Number(p.id) === Number(id));
        next[key] = normalizeInventoryReply(
          inventory.productReplies[key] ||
            item?.replySettings ||
            inventory.reply ||
            DEFAULT_AGENT_INVENTORY_REPLY
        );
      });
      Object.keys(next).forEach((key) => {
        if (!inventory.productIds.map(String).includes(key)) delete next[key];
      });
      return next;
    });
  }, [inventory.productIds, inventory.productReplies, inventory.reply, items]);

  useEffect(() => {
    if (inventory.useSameMessage) {
      setSharedDraft(normalizeInventoryReply(inventory.reply));
    }
  }, [inventory.useSameMessage, inventory.reply]);

  useEffect(() => {
    if (!inventory.productIds.length) {
      setPreviewId(null);
      return;
    }
    if (!previewId || !inventory.productIds.includes(Number(previewId))) {
      setPreviewId(inventory.productIds[0]);
    }
  }, [inventory.productIds, previewId]);

  const selectedSet = useMemo(
    () => new Set(inventory.productIds.map(Number)),
    [inventory.productIds]
  );

  const pageIds = items.map((p) => Number(p.id));
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedSet.has(id));
  const somePageSelected =
    pageIds.some((id) => selectedSet.has(id)) && !allPageSelected;

  const toggleProduct = (id) => {
    const n = Number(id);
    const next = selectedSet.has(n)
      ? inventory.productIds.filter((x) => Number(x) !== n)
      : [...inventory.productIds, n];
    patch({ productIds: next });
  };

  const selectAllVisible = () => {
    const merged = new Set([...inventory.productIds.map(Number), ...pageIds]);
    patch({ productIds: Array.from(merged) });
  };

  const clearSelection = () => patch({ productIds: [] });

  const handleEnabled = async (checked) => {
    patch({ enabled: checked });
    if (checked && typeof onEnsureProductActions === "function") {
      await onEnsureProductActions();
    }
  };

  const handleUseSame = (checked) => {
    if (checked) {
      const firstId = inventory.productIds[0];
      const fromFirst =
        (firstId != null && drafts[String(firstId)]) || sharedDraft || inventory.reply;
      setSharedDraft(normalizeInventoryReply(fromFirst));
    }
    patch({ useSameMessage: checked });
  };

  const saveMessages = () => {
    setSavingMsgs(true);
    try {
      if (!inventory.productIds.length) {
        patch({ productReplies: {} });
        toast.info("Nenhum produto selecionado");
        return;
      }
      if (inventory.useSameMessage) {
        patch({
          reply: normalizeInventoryReply(sharedDraft),
          productReplies: {},
          useSameMessage: true
        });
        toast.success("Mesma mensagem aplicada a todos — salve o agente");
      } else {
        const productReplies = {};
        inventory.productIds.forEach((id) => {
          const key = String(id);
          productReplies[key] = normalizeInventoryReply(
            drafts[key] || inventory.reply || DEFAULT_AGENT_INVENTORY_REPLY
          );
        });
        patch({
          productReplies,
          useSameMessage: false
        });
        toast.success("Mensagens por produto atualizadas — salve o agente");
      }
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } finally {
      setSavingMsgs(false);
    }
  };

  const previewProduct =
    items.find((p) => Number(p.id) === Number(previewId)) ||
    items.find((p) => selectedSet.has(Number(p.id))) ||
    null;

  const previewDraft = inventory.useSameMessage
    ? sharedDraft
    : normalizeInventoryReply(
        drafts[String(previewId)] || inventory.reply || DEFAULT_AGENT_INVENTORY_REPLY
      );

  const selectedItems = inventory.productIds.map((id) => {
    const item = items.find((p) => Number(p.id) === Number(id));
    return item || { id, name: `Produto #${id}` };
  });

  return (
    <Box className={classes.root}>
      <Box className={classes.hero}>
        <Box>
          <Typography className={classes.title}>Inventário</Typography>
          <Typography className={classes.sub}>
            Escolha os produtos do agente e defina como ele responde sobre cada um.
          </Typography>
          <Box className={classes.steps}>
            <span>1. Selecionar</span>
            <span className={classes.stepDot} />
            <span>2. Personalizar</span>
            <span className={classes.stepDot} />
            <span>3. Salvar</span>
          </Box>
        </Box>
        <Box className={classes.activeRow}>
          <Typography className={classes.activeLabel}>Ativo</Typography>
          <Switch
            className={classes.iosSwitch}
            checked={inventory.enabled !== false}
            onChange={(e) => handleEnabled(e.target.checked)}
            color="primary"
          />
        </Box>
      </Box>

      <Box
        className={`${classes.split} ${
          inventory.enabled === false ? classes.splitDisabled : ""
        }`}
      >
        {/* Coluna 1 — Produtos */}
        <Box className={classes.panel}>
          <Box className={classes.panelHead}>
            <Package size={16} strokeWidth={1.75} />
            <Typography className={classes.panelTitle}>Produtos</Typography>
            <span className={classes.badge}>{inventory.productIds.length}</span>
          </Box>
          <Box className={classes.panelBody}>
            <TextField
              className={classes.searchField}
              variant="outlined"
              size="small"
              fullWidth
              placeholder="Buscar produtos…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") load(search);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      size="small"
                      style={{ textTransform: "none", fontWeight: 600 }}
                      onClick={() => load(search)}
                    >
                      Buscar
                    </Button>
                  </InputAdornment>
                )
              }}
            />

            <Box className={classes.selectAllRow}>
              <Checkbox
                size="small"
                color="primary"
                indeterminate={somePageSelected}
                checked={allPageSelected}
                onChange={() => {
                  if (allPageSelected) {
                    patch({
                      productIds: inventory.productIds.filter(
                        (id) => !pageIds.includes(Number(id))
                      )
                    });
                  } else {
                    selectAllVisible();
                  }
                }}
              />
              <Typography className={classes.selectAllLabel}>Selecionar todos</Typography>
              {inventory.productIds.length > 0 ? (
                <Button className={classes.clearBtn} onClick={clearSelection}>
                  Limpar
                </Button>
              ) : null}
            </Box>

            {loading ? (
              <Box className={classes.empty}>
                <CircularProgress size={28} />
              </Box>
            ) : !items.length ? (
              <Box className={classes.empty}>
                <Package size={28} strokeWidth={1.5} />
                <Typography className={classes.emptyTitle}>Nenhum produto</Typography>
                <Typography className={classes.emptyHint}>
                  Cadastre produtos no Inventário para usá-los no agente.
                </Typography>
              </Box>
            ) : (
              <Box className={classes.list}>
                {items.map((item) => {
                  const selected = selectedSet.has(Number(item.id));
                  return (
                    <Box
                      key={item.id}
                      className={`${classes.productRow} ${
                        selected ? classes.productRowSelected : ""
                      }`}
                      onClick={() => toggleProduct(item.id)}
                    >
                      <Checkbox
                        size="small"
                        color="primary"
                        checked={selected}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleProduct(item.id)}
                      />
                      <Box
                        className={classes.thumb}
                        style={
                          item.image
                            ? { backgroundImage: `url(${item.image})` }
                            : undefined
                        }
                      />
                      <Box minWidth={0}>
                        <Typography className={classes.productName}>{item.name}</Typography>
                        <Typography className={classes.productSub}>
                          {formatPrice(item.price, item.currency)}
                          {item.sku ? ` · ${item.sku}` : ""}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </Box>

        {/* Coluna 2 — Como responder */}
        <Box className={classes.panel}>
          <Box className={classes.panelHead}>
            <MessageSquare size={16} strokeWidth={1.75} />
            <Typography className={classes.panelTitle}>Como responder</Typography>
            <span className={classes.badge}>
              {inventory.useSameMessage
                ? "1 msg"
                : `${Math.max(inventory.productIds.length, 0)}`}
            </span>
          </Box>
          <Box className={classes.panelBody}>
            {!inventory.productIds.length ? (
              <Box className={classes.empty}>
                <Package size={28} strokeWidth={1.5} />
                <Typography className={classes.emptyTitle}>
                  Selecione produtos à esquerda
                </Typography>
                <Typography className={classes.emptyHint}>
                  Depois personalize a mensagem de cada um aqui.
                </Typography>
              </Box>
            ) : (
              <>
                <Box className={classes.sameCard}>
                  <Copy size={18} strokeWidth={1.75} />
                  <Box flex={1} minWidth={0}>
                    <Typography className={classes.sameTitle}>
                      Usar a mesma mensagem para todos os produtos
                    </Typography>
                    <Typography className={classes.sameHint}>
                      Uma única resposta vale para todos os selecionados.
                    </Typography>
                  </Box>
                  <Switch
                    className={classes.iosSwitch}
                    checked={!!inventory.useSameMessage}
                    onChange={(e) => handleUseSame(e.target.checked)}
                    color="primary"
                  />
                </Box>

                {inventory.useSameMessage ? (
                  <ProductMessageEditor
                    classes={classes}
                    title={`Mensagem única · ${inventory.productIds.length} produto(s)`}
                    thumb={selectedItems[0]?.image}
                    reply={sharedDraft}
                    onChange={setSharedDraft}
                  />
                ) : (
                  selectedItems.map((item) => (
                    <ProductMessageEditor
                      key={item.id}
                      classes={classes}
                      title={item.name || `Produto #${item.id}`}
                      thumb={item.image}
                      reply={
                        drafts[String(item.id)] ||
                        inventory.reply ||
                        DEFAULT_AGENT_INVENTORY_REPLY
                      }
                      onChange={(next) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [String(item.id)]: normalizeInventoryReply(next)
                        }))
                      }
                    />
                  ))
                )}

                <Box className={classes.footer}>
                  {savedFlash ? (
                    <Typography className={classes.footerFlash}>
                      Salvo neste agente
                    </Typography>
                  ) : (
                    <Typography className={classes.footerHint}>
                      Em seguida, salve o agente no topo da página.
                    </Typography>
                  )}
                  <Button
                    className={classes.saveBtn}
                    disableElevation
                    disabled={savingMsgs}
                    onClick={saveMessages}
                  >
                    {savingMsgs ? "Salvando…" : "Salvar mensagens"}
                  </Button>
                </Box>
              </>
            )}
          </Box>
        </Box>

        {/* Coluna 3 — Preview */}
        <Box className={`${classes.panel} ${classes.previewPanel}`}>
          <Box className={classes.panelHead}>
            <Typography className={classes.panelTitle}>Preview</Typography>
            <span className={classes.badge}>WhatsApp</span>
          </Box>
          <Box className={classes.panelBody}>
            {!inventory.productIds.length ? (
              <Box className={classes.empty}>
                <Typography className={classes.emptyTitle}>Sem preview</Typography>
              </Box>
            ) : (
              <>
                {inventory.productIds.length > 1 ? (
                  <Box className={classes.previewChips}>
                    {selectedItems.map((item) => (
                      <Chip
                        key={item.id}
                        size="small"
                        label={item.name || `#${item.id}`}
                        color={Number(previewId) === Number(item.id) ? "primary" : "default"}
                        onClick={() => setPreviewId(item.id)}
                        style={{ borderRadius: 8 }}
                      />
                    ))}
                  </Box>
                ) : null}
                <WhatsAppIphonePreview
                  message={buildInventoryWhatsAppPreview(previewDraft, previewProduct)}
                  agentName="Seu agente"
                  contactName="Cliente"
                  avatarUrl={previewProduct?.image || ""}
                  showImages={!!previewDraft.sendImages}
                  showDocument={!!previewDraft.sendDocument}
                  label={
                    previewProduct?.name
                      ? `Como fica · ${previewProduct.name}`
                      : "Como a mensagem aparece"
                  }
                />
              </>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
