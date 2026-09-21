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

export function UsersFilter({ onFiltered, initialUsers, compact, selectedIds, deferNotify }) {
  const [users, setUsers] = useState([]);
  const [selecteds, setSelecteds] = useState([]);

  useEffect(() => {
    async function fetchData() {
      await loadUsers();
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (Array.isArray(selectedIds) && users.length > 0) {
      setSelecteds(users.filter((u) => selectedIds.includes(u.id)));
      return;
    }
    if (
      deferNotify ||
      !Array.isArray(initialUsers) ||
      users.length === 0
    ) {
      return;
    }
    setSelecteds(
      users.filter((u) =>
        initialUsers.some(
          (iu) => iu?.id === u.id || iu?.name?.toLowerCase() === u.name?.toLowerCase()
        )
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, initialUsers, users, deferNotify]);

  const loadUsers = async () => {
    try {
      const { data } = await api.get(`/users/list`);
      const userList = data.map((u) => ({ id: u.id, name: u.name }));
      setUsers(userList);
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
        options={users}
        value={selecteds}
        onChange={(e, v, r) => onChange(v)}
        getOptionLabel={(option) => option.name}
        getOptionSelected={(option, value) => {
          return (
            option?.id === value?.id ||
            option?.name.toLowerCase() === value?.name.toLowerCase()
          );
        }}
        renderTags={(value, getUserProps) =>
          value.map((option, index) => (
            <Chip
              variant="outlined"
              style={{
                backgroundColor: "#eeeeee",
                borderColor: "#bdbdbd",
                color: "#424242",
              }}
              label={option.name}
              {...getUserProps({ index })}
              size="small"
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            placeholder={i18n.t("tickets.search.filterUsers")}
          />
        )}
      />
    </Box>
  );
}
