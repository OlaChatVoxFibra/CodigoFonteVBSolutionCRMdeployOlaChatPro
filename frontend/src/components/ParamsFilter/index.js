/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { TextField } from "@material-ui/core";
import React, { useState } from "react";
import { i18n } from "../../translate/i18n";

export function ParamsFilter({ onFiltered }) {
    const [selected, setSelected] = useState("");

    const onChange = async (value) => {
        setSelected(value);
        onFiltered(value);
    };

    return (
        <TextField
            label={i18n.t("tickets.filters.keyWord")}
            size="small"
            fullWidth
            variant="outlined"
            value={selected}
            onChange={(e) => onChange(e.target.value)}
        />
    );
}
