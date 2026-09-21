/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";

import { makeStyles } from "@material-ui/core/styles";
import Container from "@material-ui/core/Container";

const useStyles = makeStyles(theme => ({
	mainContainer: {
		flex: 1,
		padding: 0,
		margin: 0,
		maxWidth: "100%",
		width: "100%",
		height: "100%",
		minHeight: 0,
	},

	contentWrapper: {
		height: "100%",
		minHeight: 0,
		maxWidth: "100%",
		overflow: "hidden",
		display: "flex",
		flexDirection: "column",
	},

	contentWrapperAuto: {
		height: "auto",
		minHeight: "100%",
		overflow: "visible",
	},
}));

const MainContainer = ({ children, className, autoHeight = false }) => {
	const classes = useStyles();

	return (
		<Container maxWidth={false} disableGutters className={`${classes.mainContainer} ${className || ""}`}>
			<div className={autoHeight ? classes.contentWrapperAuto : classes.contentWrapper}>{children}</div>
		</Container>
	);
};

export default MainContainer;
