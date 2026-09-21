/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";

import { makeStyles } from "@material-ui/core/styles";
import { Avatar, Card, CardHeader } from "@material-ui/core";
import Skeleton from "@material-ui/lab/Skeleton";

const useStyles = makeStyles(theme => ({
	ticketHeader: {
		display: "flex",
		background: theme.palette.tabHeaderBackground,
		flex: "none",
		borderBottom:
			theme.palette.type === "dark" ? "none" : "1px solid rgba(0, 0, 0, 0.12)",
		boxShadow: "none",
		height: "65px"
	},
}));

const TicketHeaderSkeleton = () => {
	const classes = useStyles();

	return (
		<Card square elevation={0} className={classes.ticketHeader}>
			<CardHeader
				titleTypographyProps={{ noWrap: true }}
				subheaderTypographyProps={{ noWrap: true }}
				avatar={
					<Skeleton animation="wave" variant="circle">
						<Avatar alt="contact_image" />
					</Skeleton>
				}
				title={<Skeleton animation="wave" width={80} />}
				subheader={<Skeleton animation="wave" width={140} />}
			/>
		</Card>
	);
};

export default TicketHeaderSkeleton;
