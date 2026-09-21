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
  Divider,
  Paper,
  Typography
} from "@material-ui/core";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import api from "../../services/api";
import { BRAIN_PRICING_PLANS } from "../../config/pricingCatalog";
import { mergeAllStripeCatalog } from "../../utils/stripeCatalogMerge";

const font = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const surface = isDark ? "rgba(255,255,255,0.04)" : "#ffffff";

  return {
    root: { width: "100%", fontFamily: font, marginTop: theme.spacing(2) },
    paper: {
      borderRadius: 12,
      border: `1px solid ${border}`,
      background: surface,
      padding: theme.spacing(2, 2.5),
      marginBottom: theme.spacing(2)
    },
    headerRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: theme.spacing(1.5),
      flexWrap: "wrap"
    },
    sectionTitle: {
      fontFamily: font,
      fontWeight: 600,
      fontSize: 15,
      letterSpacing: "-0.02em"
    },
    sectionMeta: {
      fontFamily: font,
      fontSize: 12,
      color: theme.palette.text.secondary,
      marginBottom: theme.spacing(2)
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
      gap: theme.spacing(1.5)
    },
    planCard: {
      borderRadius: 12,
      border: `1px solid ${border}`,
      background: isDark ? "rgba(255,255,255,0.02)" : "#fafafa",
      padding: theme.spacing(1.75),
      display: "flex",
      flexDirection: "column",
      gap: 8,
      minHeight: 0
    },
    planName: {
      fontFamily: font,
      fontWeight: 600,
      fontSize: 14,
      letterSpacing: "-0.01em"
    },
    planDesc: {
      fontFamily: font,
      fontSize: 12,
      color: theme.palette.text.secondary,
      lineHeight: 1.45
    },
    priceRow: {
      fontFamily: font,
      fontSize: 13,
      fontWeight: 600,
      color: theme.palette.text.primary
    },
    priceMeta: {
      fontFamily: font,
      fontSize: 11,
      color: theme.palette.text.secondary
    },
    featureList: {
      margin: 0,
      paddingLeft: 16,
      fontFamily: font,
      fontSize: 11,
      color: theme.palette.text.secondary,
      lineHeight: 1.5,
      maxHeight: 140,
      overflowY: "auto"
    },
    typeChip: {
      height: 22,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: "0.04em"
    }
  };
});

function PlanCard({ plan, typeLabel, classes }) {
  return (
    <div className={classes.planCard}>
      <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
        <Typography className={classes.planName}>{plan.name}</Typography>
        <Chip size="small" label={typeLabel} className={classes.typeChip} />
      </Box>
      {plan.badge ? (
        <Chip size="small" label={plan.badge} color="primary" variant="outlined" style={{ alignSelf: "flex-start", height: 22, fontSize: 10 }} />
      ) : null}
      <Typography className={classes.planDesc}>{plan.description}</Typography>
      <div>
        <div className={classes.priceRow}>
          {plan.stripePrices?.mensal?.formattedAmount ||
            `R$ ${Number(plan.prices?.mensal || 0).toLocaleString("pt-BR")}`}
          <span className={classes.priceMeta}> / mês</span>
        </div>
        <div className={classes.priceMeta}>
          Anual:{" "}
          {plan.stripePrices?.anual?.formattedAmount ||
            `R$ ${Number(plan.prices?.anual || 0).toLocaleString("pt-BR")}`}
          /mês · total R$ {Number(plan.annualTotal || 0).toLocaleString("pt-BR")}
        </div>
      </div>
      {plan.credits ? (
        <Typography className={classes.priceMeta}>
          +{plan.credits.toLocaleString("pt-BR")} créditos Brain/mês
        </Typography>
      ) : null}
      <ul className={classes.featureList}>
        {(plan.features || []).slice(0, 6).map((f) => (
          <li key={f}>{f}</li>
        ))}
        {(plan.features || []).length > 6 ? (
          <li>+{(plan.features || []).length - 6} recursos…</li>
        ) : null}
      </ul>
    </div>
  );
}

export default function StripePlansCatalogSettings() {
  const classes = useStyles();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/subscription/stripe/plans?type=all");
      setProducts(Array.isArray(data?.products) ? data.products : []);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Erro ao carregar planos Stripe");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const catalog = useMemo(
    () => mergeAllStripeCatalog(products, { brainPlans: BRAIN_PRICING_PLANS }),
    [products]
  );

  return (
    <div className={classes.root}>
      <Paper className={classes.paper} elevation={0}>
        <div className={classes.headerRow}>
          <div>
            <Typography className={classes.sectionTitle}>Catálogo Stripe — VB Solution</Typography>
            <Typography className={classes.sectionMeta}>
              Planos CRM e Brain.AI sincronizados com a Stripe — preços, limites e recursos.
            </Typography>
          </div>
          <Button size="small" variant="outlined" onClick={load} disabled={loading}>
            Atualizar
          </Button>
        </div>

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        ) : (
          <>
            <Typography className={classes.sectionTitle} style={{ marginBottom: 8 }}>
              CRM VB Solution
            </Typography>
            <Typography className={classes.sectionMeta}>
              {catalog.crm.length} plano(s) ativo(s) na Stripe
            </Typography>
            <div className={classes.grid}>
              {catalog.crm.map((plan) => (
                <PlanCard key={plan.id} plan={plan} typeLabel="CRM" classes={classes} />
              ))}
              {!catalog.crm.length ? (
                <Typography variant="body2" color="textSecondary">
                  Nenhum plano CRM configurado na Stripe.
                </Typography>
              ) : null}
            </div>

            <Divider style={{ margin: theme.spacing(2.5, 0) }} />

            <Typography className={classes.sectionTitle} style={{ marginBottom: 8 }}>
              Brain.AI (add-on)
            </Typography>
            <Typography className={classes.sectionMeta}>
              {catalog.brain.length} pacote(s) de créditos na Stripe
            </Typography>
            <div className={classes.grid}>
              {catalog.brain.map((plan) => (
                <PlanCard key={plan.id} plan={plan} typeLabel="Brain.AI" classes={classes} />
              ))}
              {!catalog.brain.length ? (
                <Typography variant="body2" color="textSecondary">
                  Nenhum plano Brain configurado na Stripe.
                </Typography>
              ) : null}
            </div>
          </>
        )}
      </Paper>
    </div>
  );
}
