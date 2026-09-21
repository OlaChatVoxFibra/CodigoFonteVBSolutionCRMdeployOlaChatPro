/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Grid, TextField } from "@material-ui/core";
import React from "react";
import { i18n } from "../../translate/i18n";

export function CreatedAtFilter({ dateStart, dateEnd }) {
    const onChangeStart = async (value) => {
        dateStart(value);
    };

    const onChangeEnd = async (value) => {
        dateEnd(value);
    };

    return (
        <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={6}>
                <TextField
                    fullWidth
                    name="dateStart"
                    label={i18n.t("contacts.filters.createdAt")}
                    InputLabelProps={{
                        shrink: true,
                    }}
                    type="date"
                    variant="outlined"
                    size="small"
                    defaultValue=""
                    onChange={(e) => onChangeStart(e.target.value)}
                />
            </Grid>
            <Grid item xs={12} sm={6} md={6}>
                <TextField
                    fullWidth
                    name="dateEnd"
                    label={i18n.t("contacts.filters.to")}
                    variant="outlined"
                    size="small"
                    InputLabelProps={{
                        shrink: true,
                    }}
                    type="date"
                    defaultValue=""
                    onChange={(e) => onChangeEnd(e.target.value)}
                />
            </Grid>
        </Grid>
    );
}
