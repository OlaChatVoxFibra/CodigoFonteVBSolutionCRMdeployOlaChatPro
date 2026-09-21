/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";

import Backdrop from "@material-ui/core/Backdrop";
import CircularProgress from "@material-ui/core/CircularProgress";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(theme => ({
	backdrop: {
		zIndex: theme.zIndex.drawer + 1,
		color: "#fff",
	},
}));

const BackdropLoading = () => {
	const classes = useStyles();
	return (
		<Backdrop className={classes.backdrop} open={true} style={{ backgroundColor: "rgba(15, 23, 42, 0.55)" }}>
			<CircularProgress color="inherit" />
		</Backdrop>
	);
};

export default BackdropLoading;
