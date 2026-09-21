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

export function QueueFilter({ onFiltered, compact, selectedIds, deferNotify }) {
    const [queues, setQueues] = useState([]);
    const [selecteds, setSelecteds] = useState([]);

    useEffect(() => {
        async function fetchData() {
            await loadQueues();
        }
        fetchData();
    }, []);

    useEffect(() => {
        if (Array.isArray(selectedIds) && queues.length > 0) {
            setSelecteds(queues.filter((q) => selectedIds.includes(q.id)));
        }
    }, [selectedIds, queues]);

    const loadQueues = async () => {
        try {
            const { data } = await api.get(`/queue`);
            setQueues(data);
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
                options={queues}
                value={selecteds}
                onChange={(e, v) => onChange(v)}
                getOptionLabel={(option) => option.name}
                getOptionSelected={(option, value) => option?.id === value?.id}
                renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                        <Chip
                            variant="outlined"
                            style={{
                                backgroundColor: option.color || "#eee",
                                textShadow: "1px 1px 1px #000",
                                color: "white",
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
                        placeholder="Filas / departamentos"
                    />
                )}
            />
        </Box>
    );
}
