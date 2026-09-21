/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Box, Chip, TextField } from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import React, { useEffect, useState } from "react";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";

export function WhatsappsFilter({ onFiltered, initialWhatsapps, compact, selectedIds, deferNotify }) {
  const [whatsapps, setWhatsapps] = useState([]);
  const [selecteds, setSelecteds] = useState([]);

  useEffect(() => {
    async function fetchData() {
      await loadWhatsapps();
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (Array.isArray(selectedIds) && whatsapps.length > 0) {
      setSelecteds(whatsapps.filter((w) => selectedIds.includes(w.id)));
      return;
    }
    if (
      deferNotify ||
      !Array.isArray(initialWhatsapps) ||
      whatsapps.length === 0
    ) {
      return;
    }
    setSelecteds(
      whatsapps.filter((w) =>
        initialWhatsapps.some(
          (iw) => iw?.id === w.id || iw?.name?.toLowerCase() === w.name?.toLowerCase()
        )
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, initialWhatsapps, whatsapps, deferNotify]);

  const loadWhatsapps = async () => {
    try {
      const { data } = await api.get(`/whatsapp`);
      const whatsappList = data.map((w) => ({ id: w.id, name: w.name, channel: w.channel }));
      setWhatsapps(whatsappList);
    } catch (err) {
      toastError(err);
    }
  };

  const onChange = async (value) => {
    setSelecteds(value);
    if (!deferNotify) onFiltered(value);
  };

  return (
    <Box style={{ padding: compact ? "2px 0" : "0px 10px 10px" }}>
      <Autocomplete
        multiple
        size="small"
        options={whatsapps}
        value={selecteds}
        onChange={(e, v, r) => onChange(v)}
        getOptionLabel={(option) => option.name}
        getOptionSelected={(option, value) => {
          return (
            option?.id === value?.id ||
            option?.name.toLowerCase() === value?.name.toLowerCase()
          );
        }}
        renderTags={(value, getWhatsappProps) =>
          value.map((option, index) => (
            <Chip
              variant="outlined"
              style={{
                backgroundColor: "#eeeeee",
                borderColor: "#bdbdbd",
                color: "#424242",
              }}
              label={option.name}
              {...getWhatsappProps({ index })}
              size="small"
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            placeholder="Conexão"
          />
        )}
      />
    </Box>
  );
}
