/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useCallback } from "react";
import { Box, Grid, Avatar, Chip } from "@material-ui/core";
import AttachMoneyIcon from "@material-ui/icons/AttachMoney";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import ScheduleIcon from "@material-ui/icons/Schedule";
import LeadStageNotionTag from "./LeadStageNotionTag";

const KPI_ACCENTS = {
  value: "#2563EB",
  products: "#10B981",
  time: "#F59E0B"
};

function SummaryKpiCard({ classes, label, value, hint, icon: Icon, accent }) {
  return (
    <div className={classes.summaryKpiCard}>
      <span className={classes.summaryKpiLabel}>{label}</span>
      <div className={classes.summaryKpiCardMid}>
        <div className={classes.summaryKpiValue}>{value}</div>
        <div
          className={classes.summaryKpiIconTile}
          style={{ background: `${accent}18` }}
        >
          <Icon style={{ fontSize: 13, color: accent }} />
        </div>
      </div>
      <span className={classes.summaryKpiHint}>{hint || "\u00A0"}</span>
    </div>
  );
}

export default function LeadDetailSummary(props) {
  const {
    classes,
    form,
    users,
    cartLines,
    formatMoney,
    cartTotal,
    pipelineTimeLabel,
    productService,
    stageOptions,
    setForm,
    viewOnly
  } = props;

  const saleValue = cartLines.length > 0 ? cartTotal : Number(form.value) || 0;
  const productCount = cartLines.length || (productService ? 1 : 0);
  const responsibleUser = Array.isArray(users)
    ? users.find((u) => String(u.id) === String(form.responsibleId))
    : null;

  const productNames = [
    ...cartLines.map((l) => `${l.qty > 1 ? `${l.qty}× ` : ""}${l.name}`),
    ...(productService && !cartLines.some((l) => l.name === productService) ? [productService] : [])
  ];

  const handleSelectStage = useCallback((value) => {
    if (setForm) setForm((prev) => {
      if (prev.status === value) return prev;
      return { ...prev, status: value };
    });
  }, [setForm]);

  return (
    <div className={classes.detailSummaryRoot}>
      <div className={classes.summaryStageRow}>
        <LeadStageNotionTag
          status={form.status}
          stageOptions={stageOptions}
          viewOnly={viewOnly}
          onSelectStage={handleSelectStage}
        />
      </div>

      <Grid container spacing={2} className={classes.summaryBlocksRow}>
        <Grid item xs={4} className={classes.summaryKpiGridItem}>
          <SummaryKpiCard
            classes={classes}
            label="Valor negociado"
            value={formatMoney(saleValue)}
            hint=" "
            accent={KPI_ACCENTS.value}
            icon={AttachMoneyIcon}
          />
        </Grid>
        <Grid item xs={4} className={classes.summaryKpiGridItem}>
          <SummaryKpiCard
            classes={classes}
            label="Total de produtos"
            value={productCount}
            hint={productCount === 1 ? "item no negócio" : "itens no negócio"}
            accent={KPI_ACCENTS.products}
            icon={ShoppingCartOutlinedIcon}
          />
        </Grid>
        <Grid item xs={4} className={classes.summaryKpiGridItem}>
          <SummaryKpiCard
            classes={classes}
            label="Tempo na pipeline"
            value={pipelineTimeLabel}
            hint="desde o cadastro"
            accent={KPI_ACCENTS.time}
            icon={ScheduleIcon}
          />
        </Grid>
      </Grid>

      <div className={classes.summaryResponsibleSection}>
        <span className={classes.summaryResponsibleLabel}>Responsável</span>
        <Box display="flex" alignItems="center" className={classes.summaryResponsible}>
          <Avatar className={classes.detailAvatarSm}>
            {(responsibleUser?.name || "—").charAt(0).toUpperCase()}
          </Avatar>
          <span className={classes.summaryResponsibleName}>
            {responsibleUser?.name || "Sem responsável"}
          </span>
        </Box>
      </div>

      <div className={classes.summaryProductsFlat}>
        <span className={classes.inputLabel} style={{ marginBottom: 6, display: "block" }}>
          Produtos do negócio
        </span>
        <Box className={classes.summaryProductChips}>
          {productNames.length > 0 ? (
            productNames.map((name, i) => (
              <Chip key={`${name}-${i}`} size="small" label={name} className={classes.productChip} />
            ))
          ) : (
            <span className={classes.summaryEmptyProducts}>Nenhum produto vinculado</span>
          )}
        </Box>
      </div>
    </div>
  );
}
