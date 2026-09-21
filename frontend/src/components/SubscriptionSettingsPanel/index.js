/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useContext, useMemo } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Paper,
  Grid,
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  Chip,
  Divider
} from "@material-ui/core";
import moment from "moment";
import { useDate } from "../../hooks/useDate";
import { AuthContext } from "../../context/Auth/AuthContext";
import useStripeSubscription from "../../hooks/useStripeSubscription";
import { mergeCrmPlansWithStripeCatalog, formatStripeMoney } from "../../utils/stripeCatalogMerge";

const useStyles = makeStyles((theme) => ({
  paper: {
    padding: theme.spacing(2.5),
    marginTop: theme.spacing(2),
    width: "100%",
    borderRadius: 12,
    border: `1px solid ${theme.palette.divider}`
  },
  sectionTitle: {
    fontWeight: 600,
    fontSize: 15,
    letterSpacing: "-0.02em"
  },
  meta: {
    color: theme.palette.text.secondary,
    fontSize: 12,
    marginTop: 4
  },
  row: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: theme.spacing(1)
  },
  planCard: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 10,
    padding: theme.spacing(1.5),
    minWidth: 160,
    flex: "1 1 160px"
  },
  invoiceRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    fontSize: 13,
    gap: 12
  }
}));

const SubscriptionSettingsPanel = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const { returnDays } = useDate();
  const { status, plans, loading, error, refresh, startCheckout, stripe } = useStripeSubscription();

  const visiblePlans = useMemo(() => mergeCrmPlansWithStripeCatalog(plans), [plans]);

  const stripeSub = stripe?.subscription;
  const pending = stripe?.pendingInvoices || [];
  const paid = stripe?.paidInvoices || [];

  return (
    <Paper className={classes.paper} variant="outlined">
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography className={classes.sectionTitle}>Assinatura Stripe</Typography>
        <Button size="small" onClick={refresh} disabled={loading}>
          Atualizar
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={3}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <>
          {error ? (
            <Typography color="error" variant="body2" gutterBottom>
              {error}
            </Typography>
          ) : null}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Vencimento local"
                value={
                  returnDays(user?.company?.dueDate) === 0
                    ? "Vence hoje"
                    : `${returnDays(user?.company?.dueDate)} dias`
                }
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                InputProps={{ readOnly: true }}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Plano Stripe"
                value={stripeSub?.planLabel || status?.plan?.name || "—"}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                InputProps={{ readOnly: true }}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Status assinatura"
                value={stripeSub?.status || (status?.subscription?.isActive ? "ativa (local)" : "—")}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                InputProps={{ readOnly: true }}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Próxima cobrança"
                value={
                  stripe?.upcomingInvoice?.amountDue != null
                    ? formatStripeMoney(
                        stripe.upcomingInvoice.amountDue,
                        stripe.upcomingInvoice.currency
                      )
                    : "—"
                }
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                InputProps={{ readOnly: true }}
                variant="outlined"
              />
            </Grid>
          </Grid>

          {pending.length > 0 ? (
            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom>
                Pendências
              </Typography>
              {pending.map(inv => (
                <Box key={inv.id} className={classes.invoiceRow}>
                  <span>
                    {inv.number || inv.id} · {formatStripeMoney(inv.amountDue, inv.currency)}
                  </span>
                  {inv.hostedInvoiceUrl ? (
                    <Button
                      size="small"
                      color="primary"
                      href={inv.hostedInvoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Pagar
                    </Button>
                  ) : null}
                </Box>
              ))}
            </Box>
          ) : null}

          {paid.length > 0 ? (
            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom>
                Pagamentos recentes
              </Typography>
              {paid.slice(0, 5).map(inv => (
                <Box key={inv.id} className={classes.invoiceRow}>
                  <span>
                    {moment.unix(inv.created).format("DD/MM/YYYY")} ·{" "}
                    {formatStripeMoney(inv.amountPaid, inv.currency)}
                  </span>
                  <Chip size="small" label="Pago" color="primary" variant="outlined" />
                </Box>
              ))}
            </Box>
          ) : null}

          <Divider style={{ margin: "20px 0" }} />

          <Typography variant="subtitle2" gutterBottom>
            Planos disponíveis (Stripe)
          </Typography>
          <Box className={classes.row}>
            {visiblePlans.map(plan => (
              <Box key={plan.id} className={classes.planCard}>
                <Typography style={{ fontWeight: 600, fontSize: 14 }}>{plan.name}</Typography>
                <Typography className={classes.meta}>
                  R$ {plan.prices.mensal}/mês · R$ {plan.prices.anual}/mês no anual
                </Typography>
                <Button
                  size="small"
                  color="primary"
                  variant="contained"
                  style={{ marginTop: 10, textTransform: "none" }}
                  onClick={() => startCheckout({ productKey: plan.stripeKey || plan.id, interval: "monthly" })}
                >
                  Assinar
                </Button>
              </Box>
            ))}
            {!visiblePlans.length ? (
              <Typography variant="body2" color="textSecondary">
                Nenhum plano Stripe configurado no ambiente.
              </Typography>
            ) : null}
          </Box>
        </>
      )}
    </Paper>
  );
};

export default SubscriptionSettingsPanel;
