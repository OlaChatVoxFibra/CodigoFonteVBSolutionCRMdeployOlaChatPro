/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Box, Chip, TextField } from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import React, { useEffect, useState } from "react";

const STATUS_OPTIONS = [
  { status: "open", name: "Atendendo" },
  { status: "closed", name: "Finalizados" },
  { status: "pending", name: "Aguardando" },
  { status: "group", name: "Grupos" },
];

export function StatusFilter({ onFiltered, compact, selectedStatuses, deferNotify }) {
  const [selecteds, setSelecteds] = useState([]);

  useEffect(() => {
    if (!Array.isArray(selectedStatuses)) return;
    setSelecteds(STATUS_OPTIONS.filter((s) => selectedStatuses.includes(s.status)));
  }, [selectedStatuses]);

  const onChange = async (value) => {
    setSelecteds(value);
    if (!deferNotify) onFiltered(value);
  };

  return (
    <Box style={{ padding: compact ? "2px 0" : "0px 10px 10px" }}>
      <Autocomplete
        multiple
        size="small"
        options={STATUS_OPTIONS}
        value={selecteds}
        onChange={(e, v, r) => onChange(v)}
        getOptionLabel={(option) => option.name}
        getOptionSelected={(option, value) => option?.status === value?.status}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              variant="outlined"
              style={{
                backgroundColor: option.color || "#eeeeee",
                borderColor: "#bdbdbd",
                color: option.color ? "#fff" : "#424242",
                textShadow: option.color ? "1px 1px 1px #000" : "none",
              }}
              label={option.name}
              {...getTagProps({ index })}
              size="small"
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            placeholder="Status"
          />
        )}
      />
    </Box>
  );
}
