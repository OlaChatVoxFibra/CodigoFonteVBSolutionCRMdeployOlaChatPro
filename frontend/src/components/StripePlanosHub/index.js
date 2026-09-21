/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  MenuItem,
  Select,
  FormControlLabel,
  Checkbox
} from "@material-ui/core";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import EditOutlinedIcon from "@material-ui/icons/EditOutlined";
import PersonAddOutlinedIcon from "@material-ui/icons/PersonAddOutlined";
import RefreshIcon from "@material-ui/icons/Refresh";
import api from "../../services/api";
import { toast } from "react-toastify";
import { useStripeSettingsPageStyles } from "../StripeAdminHub/stripeSettingsPageStyles";
import {
  AnnualPriceCell,
  MonthlyPriceCell
} from "../StripeAdminHub/StripePriceCells";
import { EntitlementTags, PlanTypeTag } from "../StripeAdminHub/StripeAdminTags";

export default function StripePlanosHub() {
  const classes = useStripeSettingsPageStyles();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [editPlan, setEditPlan] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [pricePlan, setPricePlan] = useState(null);
  const [priceForm, setPriceForm] = useState({ interval: "monthly", amountReais: "" });
  const [subDialog, setSubDialog] = useState(null);
  const [subForm, setSubForm] = useState({
    email: "",
    customerName: "",
    sendInvoice: false,
    interval: "monthly"
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/subscription/stripe/admin/plans?type=all");
      setProducts(Array.isArray(data?.products) ? data.products : []);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Erro ao carregar planos");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sortedProducts = [...products].sort((a, b) => {
    if (a.type !== b.type) return a.type === "crm" ? -1 : 1;
    return String(a.name || "").localeCompare(String(b.name || ""), "pt-BR");
  });

  const openEdit = (plan) => {
    const ent = plan.entitlements || {};
    setEditPlan(plan);
    setEditForm({
      maxUsers: ent.maxUsers ?? "",
      maxConnections: ent.maxConnections ?? "",
      maxLeads: ent.maxLeads ?? "",
      brainCreditsIncluded: ent.brainCreditsIncluded ?? "",
      brainAddonCredits: ent.brainAddonCredits ?? "",
      webhooks: ent.webhooks ?? "",
      apiAccess: Boolean(ent.apiAccess)
    });
  };

  const saveEntitlements = async () => {
    if (!editPlan) return;
    setSaving(true);
    try {
      const payload = {};
      ["maxUsers", "maxConnections", "maxLeads", "brainCreditsIncluded", "brainAddonCredits", "webhooks"].forEach((k) => {
        const v = editForm[k];
        if (v === "" || v == null) payload[k] = null;
        else payload[k] = Number(v);
      });
      payload.apiAccess = Boolean(editForm.apiAccess);
      await api.patch(`/subscription/stripe/admin/plans/${editPlan.key}/entitlements`, payload);
      toast.success("Condições do plano atualizadas");
      setEditPlan(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const savePrice = async () => {
    if (!pricePlan) return;
    const reais = Number(String(priceForm.amountReais).replace(",", "."));
    if (!Number.isFinite(reais) || reais < 0) {
      toast.error("Informe um valor válido em reais");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/subscription/stripe/admin/plans/${pricePlan.key}/prices`, {
        currency: "brl",
        interval: priceForm.interval,
        unitAmountCents: Math.round(reais * 100)
      });
      toast.success("Preço atualizado na Stripe");
      setPricePlan(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Erro ao atualizar preço");
    } finally {
      setSaving(false);
    }
  };

  const createSubscription = async () => {
    if (!subDialog || !subForm.email.trim()) {
      toast.error("Informe o e-mail do cliente");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post("/subscription/stripe/admin/subscriptions", {
        email: subForm.email.trim(),
        customerName: subForm.customerName.trim() || undefined,
        productKey: subDialog.key,
        interval: subForm.interval || "monthly",
        currency: "brl",
        sendInvoice: subForm.sendInvoice
      });
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, "_blank", "noopener,noreferrer");
        toast.success("Checkout Stripe aberto para o cliente");
      } else {
        toast.success("Assinatura criada na Stripe (fatura enviada)");
      }
      setSubDialog(null);
      setSubForm({ email: "", customerName: "", sendInvoice: false, interval: "monthly" });
    } catch (e) {
      toast.error(e?.response?.data?.error || "Erro ao criar assinatura");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={classes.root}>
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" flex={1} py={5}>
          <CircularProgress size={24} thickness={4} />
        </Box>
      ) : error ? (
        <Typography className={classes.empty} color="error">
          {error}
        </Typography>
      ) : (
        <TableContainer className={classes.listBlockFull}>
          <Table stickyHeader size="small" className={classes.table}>
            <colgroup>
              <col style={{ width: "3%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "38%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "13%" }} />
            </colgroup>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" align="center">
                  <IconButton
                    size="small"
                    className={classes.headRefreshIcon}
                    onClick={load}
                    disabled={loading}
                    title="Atualizar"
                  >
                    <RefreshIcon style={{ fontSize: 14 }} />
                  </IconButton>
                </TableCell>
                <TableCell>Plano</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Limites</TableCell>
                <TableCell align="center">Mensal</TableCell>
                <TableCell align="center">Anual</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedProducts.map((plan) => {
                const isOpen = expanded === plan.key;
                const brlPrices = (plan.prices || []).filter((p) => p.currency === "brl");
                return (
                  <React.Fragment key={plan.key}>
                    <TableRow hover className={classes.tableRow}>
                      <TableCell padding="checkbox">
                        <IconButton
                          size="small"
                          className={classes.expandBtn}
                          onClick={() => setExpanded(isOpen ? null : plan.key)}
                        >
                          <ExpandMoreIcon
                            style={{
                              transform: isOpen ? "rotate(180deg)" : "none",
                              fontSize: 17,
                              transition: "transform 0.2s ease"
                            }}
                          />
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <div className={classes.planName}>
                          <span className={classes.cellClip}>{plan.name}</span>
                        </div>
                        <div className={classes.mono}>
                          <span className={classes.cellClip}>{plan.key}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <PlanTypeTag type={plan.type} soft />
                      </TableCell>
                      <TableCell className={classes.cellLimites}>
                        <EntitlementTags ent={plan.entitlements} soft wrap />
                      </TableCell>
                      <TableCell align="center">
                        <MonthlyPriceCell prices={plan.prices} classes={classes} />
                      </TableCell>
                      <TableCell align="center">
                        <AnnualPriceCell prices={plan.prices} classes={classes} />
                      </TableCell>
                      <TableCell align="right">
                        <Box display="inline-flex" gap={0.5}>
                          <IconButton
                            size="small"
                            className={classes.iconBtn}
                            title="Editar condições"
                            onClick={() => openEdit(plan)}
                          >
                            <EditOutlinedIcon style={{ fontSize: 15 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            className={classes.iconBtn}
                            title="Nova assinatura"
                            onClick={() => {
                              setSubDialog(plan);
                              setSubForm({
                                email: "",
                                customerName: "",
                                sendInvoice: false,
                                interval: "monthly"
                              });
                            }}
                          >
                            <PersonAddOutlinedIcon style={{ fontSize: 15 }} />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={7} style={{ padding: 0, border: 0 }}>
                        <Collapse in={isOpen} timeout={200}>
                          <div className={classes.detailBox}>
                            <Typography className={classes.sectionLabel}>
                              Preços na Stripe
                            </Typography>
                            <Table size="small" className={classes.table}>
                              <TableHead>
                                <TableRow>
                                  <TableCell>Intervalo</TableCell>
                                  <TableCell>Valor</TableCell>
                                  <TableCell>Price ID</TableCell>
                                  <TableCell align="right">Alterar</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {brlPrices.map((p) => (
                                  <TableRow key={`${p.interval}-${p.currency}`}>
                                    <TableCell>
                                      {p.interval === "annual" ? "Anual" : "Mensal"}
                                    </TableCell>
                                    <TableCell>{p.formattedAmount || "—"}</TableCell>
                                    <TableCell className={classes.mono}>
                                      {p.priceId || "Não configurado"}
                                    </TableCell>
                                    <TableCell align="right">
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        className={classes.actionBtn}
                                        onClick={() => {
                                          setPricePlan(plan);
                                          setPriceForm({
                                            interval: p.interval,
                                            amountReais:
                                              p.unitAmount != null ? String(p.unitAmount / 100) : ""
                                          });
                                        }}
                                      >
                                        Editar
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                            {plan.entitlements?.features?.length ? (
                              <Box mt={1.5}>
                                <Typography className={classes.sectionLabel}>
                                  Recursos incluídos
                                </Typography>
                                <ul className={classes.featureList}>
                                  {plan.entitlements.features.map((f) => (
                                    <li key={f}>{f}</li>
                                  ))}
                                </ul>
                              </Box>
                            ) : null}
                          </div>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
              {!sortedProducts.length && (
                <TableRow>
                  <TableCell colSpan={7} className={classes.empty}>
                    Nenhum plano Stripe configurado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={Boolean(editPlan)}
        onClose={() => setEditPlan(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ className: classes.dialogPaper }}
      >
        <DialogTitle className={classes.dialogTitle}>
          Editar condições — {editPlan?.name}
        </DialogTitle>
        <DialogContent>
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} pt={1}>
            {["maxUsers", "maxConnections", "maxLeads", "brainCreditsIncluded", "brainAddonCredits", "webhooks"].map((field) => (
              <TextField
                key={field}
                label={field}
                value={editForm[field] ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, [field]: e.target.value }))}
                helperText="Vazio = ilimitado ou N/A"
                size="small"
                variant="outlined"
                fullWidth
              />
            ))}
          </Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(editForm.apiAccess)}
                onChange={(e) => setEditForm((f) => ({ ...f, apiAccess: e.target.checked }))}
                color="primary"
              />
            }
            label="Acesso à API"
          />
        </DialogContent>
        <DialogActions style={{ padding: "10px 16px 16px" }}>
          <Button onClick={() => setEditPlan(null)} className={classes.actionBtn}>
            Cancelar
          </Button>
          <Button color="primary" variant="contained" className={classes.actionBtn} onClick={saveEntitlements} disabled={saving}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(pricePlan)}
        onClose={() => setPricePlan(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ className: classes.dialogPaper }}
      >
        <DialogTitle className={classes.dialogTitle}>Alterar preço — {pricePlan?.name}</DialogTitle>
        <DialogContent>
          <Select
            fullWidth
            variant="outlined"
            value={priceForm.interval}
            onChange={(e) => setPriceForm((f) => ({ ...f, interval: e.target.value }))}
            style={{ marginTop: 8, marginBottom: 12 }}
          >
            <MenuItem value="monthly">Mensal</MenuItem>
            <MenuItem value="annual">Anual</MenuItem>
          </Select>
          <TextField
            fullWidth
            variant="outlined"
            label="Valor (R$)"
            value={priceForm.amountReais}
            onChange={(e) => setPriceForm((f) => ({ ...f, amountReais: e.target.value }))}
            helperText="Cria novo price na Stripe e desativa o anterior"
            size="small"
          />
        </DialogContent>
        <DialogActions style={{ padding: "10px 16px 16px" }}>
          <Button onClick={() => setPricePlan(null)} className={classes.actionBtn}>
            Cancelar
          </Button>
          <Button color="primary" variant="contained" className={classes.actionBtn} onClick={savePrice} disabled={saving}>
            Atualizar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(subDialog)}
        onClose={() => setSubDialog(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ className: classes.dialogPaper }}
      >
        <DialogTitle className={classes.dialogTitle}>Nova assinatura — {subDialog?.name}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            variant="outlined"
            label="E-mail do cliente"
            value={subForm.email}
            onChange={(e) => setSubForm((f) => ({ ...f, email: e.target.value }))}
            margin="dense"
            size="small"
          />
          <TextField
            fullWidth
            variant="outlined"
            label="Nome (opcional)"
            value={subForm.customerName}
            onChange={(e) => setSubForm((f) => ({ ...f, customerName: e.target.value }))}
            margin="dense"
            size="small"
          />
          <Select
            fullWidth
            variant="outlined"
            value={subForm.interval}
            onChange={(e) => setSubForm((f) => ({ ...f, interval: e.target.value }))}
            style={{ marginTop: 8, marginBottom: 8 }}
          >
            <MenuItem value="monthly">Cobrança mensal</MenuItem>
            <MenuItem value="annual">Cobrança anual</MenuItem>
          </Select>
          <FormControlLabel
            control={
              <Checkbox
                checked={subForm.sendInvoice}
                onChange={(e) => setSubForm((f) => ({ ...f, sendInvoice: e.target.checked }))}
                color="primary"
              />
            }
            label="Enviar fatura por e-mail (sem checkout)"
          />
          <Typography variant="caption" color="textSecondary" display="block">
            Sem fatura: abre checkout Stripe para o cliente pagar com cartão.
          </Typography>
        </DialogContent>
        <DialogActions style={{ padding: "10px 16px 16px" }}>
          <Button onClick={() => setSubDialog(null)} className={classes.actionBtn}>
            Cancelar
          </Button>
          <Button color="primary" variant="contained" className={classes.actionBtn} onClick={createSubscription} disabled={saving}>
            Criar na Stripe
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
