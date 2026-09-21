/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import Chip from "@material-ui/core/Chip";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles(theme => ({
	chips: {
		display: "flex",
		flexWrap: "wrap",
	},
	chip: {
		margin: 2,
	},
})); 

const QueueSelect = ({ selectedQueueIds, onChange, companyId }) => {
	const classes = useStyles();
	const [queues, setQueues] = useState([]);

	useEffect(() => {
		(async () => {
			try {
				const params = companyId ? { params: { companyId } } : undefined;
				const { data } = await api.get("/queue", params);
				setQueues(data);
			} catch (err) {
				toastError(err);
			}
		})();
	}, [companyId]);

	const handleChange = e => {
		onChange(e.target.value);
	};

	return (
		<div>
			<FormControl fullWidth margin="dense" variant="outlined">
				<InputLabel>{i18n.t("queueSelect.inputLabel")}</InputLabel>
				<Select
					multiple
					labelWidth={60}
					value={selectedQueueIds}
					onChange={handleChange}
					MenuProps={{
						anchorOrigin: {
							vertical: "bottom",
							horizontal: "left",
						},
						transformOrigin: {
							vertical: "top",
							horizontal: "left",
						},
						getContentAnchorEl: null,
					}}
					renderValue={selected => (
						<div className={classes.chips}>
							{selected?.length > 0 &&
								selected.map(id => {
									const queue = queues.find(q => q.id === id);
									return queue ? (
										<Chip
											key={id}
											style={{ backgroundColor: queue.color }}
											variant="outlined"
											label={queue.name}
											className={classes.chip}
										/>
									) : null;
								})}
						</div>
					)}
				>					
					{queues.map(queue => (
						<MenuItem key={queue.id} value={queue.id}>
							{queue.name}
						</MenuItem>
					))}
				</Select>
			</FormControl>
		</div>
	);
};

export default QueueSelect;
