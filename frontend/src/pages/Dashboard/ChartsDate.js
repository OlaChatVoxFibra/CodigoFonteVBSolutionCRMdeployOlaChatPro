/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useState, useContext } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import brLocale from 'date-fns/locale/pt-BR';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { Button, Grid, TextField } from '@material-ui/core';
import Typography from "@material-ui/core/Typography";
import api from '../../services/api';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import './button.css';
import { i18n } from '../../translate/i18n';
import { AuthContext } from "../../context/Auth/AuthContext";
import {  useTheme } from '@material-ui/core';
import moment from "moment";
import { getPremiumBarChartOptions } from "../../lib/chartTheme";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ChartDataLabels
);

/**
 * @param {string} [periodStart] — YYYY-MM-DD
 * @param {string} [periodEnd]
 * @param {number|string|null} [filterUserId]
 */
export const ChartsDate = ({ periodStart, periodEnd, filterUserId, channel }) => {
    const theme = useTheme();
    const [initialDate, setInitialDate] = useState(new Date());
    const [finalDate, setFinalDate] = useState(new Date());
    const [ticketsData, setTicketsData] = useState({ data: [], count: 0 });
    const { user } = useContext(AuthContext);

    const companyId = user.companyId;

    useEffect(() => {
        if (periodStart && moment(periodStart, "YYYY-MM-DD", true).isValid()) {
            setInitialDate(moment(periodStart, "YYYY-MM-DD").toDate());
        }
        if (periodEnd && moment(periodEnd, "YYYY-MM-DD", true).isValid()) {
            setFinalDate(moment(periodEnd, "YYYY-MM-DD").toDate());
        }
    }, [periodStart, periodEnd, filterUserId, channel]);

    useEffect(() => {
        if (companyId) {
            handleGetTicketsInformation({ silent: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId, initialDate, finalDate, filterUserId, channel]);

    const isDark = theme.palette.type === "dark";
    const dataCharts = {

        labels: ticketsData && ticketsData?.data.length > 0 && ticketsData?.data.map((item) => (item.hasOwnProperty('horario') ? `Das ${item.horario}:00 as ${item.horario}:59` : item.data)),
        datasets: [
            {
                // label: 'Dataset 1',
                data: ticketsData?.data.length > 0 && ticketsData?.data.map((item, index) => {
                    return item.total
                }),
                backgroundColor: theme.palette.primary.main,
                borderRadius: 4,
                maxBarThickness: 24,
                backgroundColor: isDark
                  ? `${theme.palette.primary.main}cc`
                  : theme.palette.primary.main,
            },
        ],
    };
    const options = getPremiumBarChartOptions(theme, {
        datalabels: {
            formatter: (v) =>
                typeof v === "number" ? v.toLocaleString("pt-BR") : v,
        },
    });

    const handleGetTicketsInformation = async ({ silent } = {}) => {
        try {
            const ini = format(initialDate, 'yyyy-MM-dd');
            const fin = format(finalDate, 'yyyy-MM-dd');
            let url = `/dashboard/ticketsDay?initialDate=${ini}&finalDate=${fin}`;
            if (filterUserId != null && filterUserId !== "" && !Number.isNaN(Number(filterUserId))) {
                url += `&userId=${Number(filterUserId)}`;
            }
            if (channel && channel !== "all") {
                url += `&channel=${encodeURIComponent(channel)}`;
            }
            const { data } = await api.get(url);
            setTicketsData(data);
        } catch (error) {
            if (!silent) {
                toast.error('Erro ao buscar informações dos tickets');
            }
        }
    }

    return (
        <>
            <Typography component="h2" variant="subtitle1" color="textPrimary" gutterBottom style={{ fontWeight: 500 }}>
                {i18n.t("dashboard.users.totalAttendances")} ({ticketsData?.count})
            </Typography>

            <Grid container spacing={2} style={{ marginBottom: 10, alignItems: "center" }}>
                <Grid item xs={12} sm={4}>
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={brLocale}>
                        <DatePicker
                            value={initialDate}
                            onChange={(newValue) => { setInitialDate(newValue) }}
                            label={i18n.t("dashboard.date.initialDate")}
                            renderInput={(params) => <TextField fullWidth {...params} size="small" />}

                        />
                    </LocalizationProvider>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={brLocale}>
                        <DatePicker
                            value={finalDate}
                            onChange={(newValue) => { setFinalDate(newValue) }}
                            label={i18n.t("dashboard.date.finalDate")}
                            renderInput={(params) => <TextField fullWidth {...params} size="small" />}
                        />
                    </LocalizationProvider>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Button
                        style={{
                            textTransform: "none",
                            borderRadius: 8,
                            boxShadow: "none",
                            marginTop: 10,
                        }}
                        color="primary"
                        onClick={() => handleGetTicketsInformation({ silent: false })}
                        variant='contained'
                    >
                        Filtrar
                    </Button>
                </Grid>
            </Grid>
            <div style={{ height: 250 }}>
                <Bar options={options} data={dataCharts} />
            </div>
        </>
    );
}
