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

export function TagsFilter({ onFiltered, compact, selectedIds, deferNotify }) {
  const [tags, setTags] = useState([]);
  const [selecteds, setSelecteds] = useState([]);

  useEffect(() => {
    async function fetchData() {
      await loadTags();
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (!Array.isArray(selectedIds) || tags.length === 0) return;
    setSelecteds(tags.filter((t) => selectedIds.includes(t.id)));
  }, [selectedIds, tags]);

  const loadTags = async () => {
    try {
      const { data } = await api.get(`/tags/list`);
      setTags(data);
    } catch (err) {
      toastError(err);
    }
  };

  const onChange = async (value) => {
    setSelecteds(value);
    if (!deferNotify) onFiltered(value);
  };

  return (
    <Box style={{ padding: compact ? "2px 0" : 10 }}>
      <Autocomplete
        multiple
        size="small"
        options={tags}
        value={selecteds}
        onChange={(e, v, r) => onChange(v)}
        getOptionLabel={(option) => option.name}
        getOptionSelected={(option, value) => option?.id === value?.id}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              variant="outlined"
              style={
                option.color
                  ? {
                      backgroundColor: option.color,
                      textShadow: "1px 1px 1px #000",
                      color: "white",
                      borderColor: option.color,
                    }
                  : {
                      backgroundColor: "#eeeeee",
                      borderColor: "#bdbdbd",
                      color: "#424242",
                    }
              }
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
            placeholder="Tags"
          />
        )}
      />
    </Box>
  );
}
