/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Box, TextField, Typography } from "@material-ui/core";
import EventIcon from "@material-ui/icons/Event";
import { DEFAULT_END_TIME, DEFAULT_START_TIME } from "../../utils/deadlineDates";

const labelSx = (isDark) => ({
  fontSize: 11,
  fontWeight: 500,
  color: isDark ? "rgba(255,255,255,0.55)" : "#64748B",
  width: 42,
  flexShrink: 0,
});

/**
 * Prazo com data de início/fim e horários opcionais — usado nos modais de criar/editar.
 */
const DeadlineRangeFields = ({
  dateStart,
  dateEnd,
  timeStart,
  timeEnd,
  onChangeStart,
  onChangeEnd,
  onChangeTimeStart,
  onChangeTimeEnd,
  isDark,
  compact = false,
  showLabel = true,
  showTime = false,
}) => {
  const fieldStyle = {
    fontSize: 12,
    height: compact ? 30 : 32,
    padding: "0 8px",
    border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e5e7eb",
    borderRadius: 6,
    width: "100%",
  };

  const timeFieldStyle = {
    ...fieldStyle,
    padding: "0 4px",
    width: "100%",
  };

  const rowLabel = (text) => (
    <Typography component="span" style={labelSx(isDark)}>
      {text}
    </Typography>
  );

  if (showTime) {
    return (
      <Box width="100%" minWidth={0}>
        {showLabel && (
          <Box display="flex" alignItems="center" style={{ gap: 4, marginBottom: 8 }}>
            <EventIcon style={{ fontSize: 15, opacity: 0.5 }} />
            <Typography
              component="span"
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: isDark ? "rgba(255,255,255,0.55)" : "#64748B",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Prazo
            </Typography>
          </Box>
        )}
        <Box display="flex" flexDirection="column" style={{ gap: 8 }}>
          <Box display="flex" alignItems="center" style={{ gap: 8, minWidth: 0 }}>
            {rowLabel("Início")}
            <TextField
              type="date"
              value={dateStart || ""}
              onChange={(e) => onChangeStart(e.target.value)}
              InputProps={{ disableUnderline: true, style: fieldStyle }}
              inputProps={{ "aria-label": "Data de início" }}
              style={{ flex: 1, minWidth: 0 }}
            />
            <TextField
              type="time"
              value={timeStart || DEFAULT_START_TIME}
              onChange={(e) => onChangeTimeStart && onChangeTimeStart(e.target.value)}
              InputProps={{ disableUnderline: true, style: timeFieldStyle }}
              inputProps={{ "aria-label": "Horário de início", style: { fontSize: 12 } }}
              style={{ width: 96, flexShrink: 0 }}
            />
          </Box>
          <Box display="flex" alignItems="center" style={{ gap: 8, minWidth: 0 }}>
            {rowLabel("Fim")}
            <TextField
              type="date"
              value={dateEnd || ""}
              onChange={(e) => onChangeEnd(e.target.value)}
              InputProps={{ disableUnderline: true, style: fieldStyle }}
              inputProps={{ "aria-label": "Data de fim" }}
              style={{ flex: 1, minWidth: 0 }}
            />
            <TextField
              type="time"
              value={timeEnd || DEFAULT_END_TIME}
              onChange={(e) => onChangeTimeEnd && onChangeTimeEnd(e.target.value)}
              InputProps={{ disableUnderline: true, style: timeFieldStyle }}
              inputProps={{ "aria-label": "Horário de fim (prazo)", style: { fontSize: 12 } }}
              style={{ width: 96, flexShrink: 0 }}
            />
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      alignItems="center"
      flexWrap="wrap"
      style={{ gap: compact ? 6 : 8, minWidth: 0 }}
    >
      {showLabel && (
        <Box display="flex" alignItems="center" style={{ gap: 4, marginRight: 2 }}>
          <EventIcon style={{ fontSize: 15, opacity: 0.5 }} />
          <Typography
            component="span"
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: isDark ? "rgba(255,255,255,0.55)" : "#64748B",
              whiteSpace: "nowrap",
            }}
          >
            Prazo
          </Typography>
        </Box>
      )}
      <TextField
        type="date"
        value={dateStart || ""}
        onChange={(e) => onChangeStart(e.target.value)}
        placeholder="Início"
        InputProps={{ disableUnderline: true, style: fieldStyle }}
        inputProps={{ "aria-label": "Data de início" }}
        style={{ width: compact ? 130 : 140 }}
      />
      <Typography
        component="span"
        style={{ fontSize: 11, opacity: 0.45, color: isDark ? "#fff" : "#64748B" }}
      >
        até
      </Typography>
      <TextField
        type="date"
        value={dateEnd || ""}
        onChange={(e) => onChangeEnd(e.target.value)}
        placeholder="Fim"
        InputProps={{ disableUnderline: true, style: fieldStyle }}
        inputProps={{ "aria-label": "Data de fim" }}
        style={{ width: compact ? 130 : 140 }}
      />
    </Box>
  );
};

export default DeadlineRangeFields;
