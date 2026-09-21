/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { useParams } from "react-router-dom";
import Grid from "@material-ui/core/Grid";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import { makeStyles, useTheme } from "@material-ui/core/styles";

import TicketsManagerTabs from "../../components/TicketsManagerTabs";
import Ticket from "../../components/Ticket";

import { i18n } from "../../translate/i18n";
import logo from "../../assets/olachat-logo-light.png";
import logoDark from "../../assets/olachat-logo-dark.png";

/** Cinza painel tickets (escuro): explícito para não cair em preto se token custom faltar no tema) */
const DARK_TICKETS_PANEL = "#48484b";

const useStyles = makeStyles(theme => {
	const darkTicketsPanel =
		theme.palette.type === "dark"
			? theme.palette.dashboardCard ||
				theme.palette.background.paper ||
				DARK_TICKETS_PANEL
			: "transparent";

	return {
	chatContainer: {
		flex: 1,
		display: "flex",
		flexDirection: "column",
		minHeight: 0,
		fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
		padding: theme.padding,
		height: `calc(100% - 48px)`,
		overflowY: "hidden",
		overflowX: "hidden",
		backgroundColor: darkTicketsPanel,
		'@media (max-width: 1366px)': {
			padding: theme.spacing(1),
		},
	},

	chatPapper: {
		display: "flex",
		flex: 1,
		minHeight: 0,
		width: "100%",
		backgroundColor: darkTicketsPanel,
	},

	contactsWrapper: {
		display: "flex",
		height: "100%",
		flexDirection: "column",
		overflowY: "hidden",
		minWidth: 0
	},
	/** Coluna da lista: tablet limitado; desktop bem estreito */
	ticketPreviewColumn: {
		[theme.breakpoints.between("sm", "md")]: {
			flexGrow: "0 !important",
			maxWidth: "280px !important",
			flexBasis: "280px !important",
			minWidth: "220px",
		},
		[theme.breakpoints.up("md")]: {
			flexGrow: "0 !important",
			maxWidth: "108px !important",
			flexBasis: "108px !important",
			minWidth: "100px",
		},
	},
	chatAreaColumn: {
		[theme.breakpoints.up("md")]: {
			flexGrow: "1 !important",
			maxWidth: "none !important",
			flexBasis: "0 !important",
		},
	},
	messagessWrapper: {
		display: "flex",
		height: "100%",
		flexDirection: "column",
		minWidth: 0,
		minHeight: 0,
		flex: 1,
		backgroundColor: darkTicketsPanel,
	},
	welcomeMsg: {
		backgroundColor:
			theme.palette.type === "dark" ? darkTicketsPanel : theme.palette.tabHeaderBackground,
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
		flex: 1,
		width: "100%",
		minHeight: 0,
		textAlign: "center",
		border: "none",
		boxShadow: "none",
		outline: "none",
	},
  logo: {
    display: "block",
    margin: "0 auto 16px",
    maxWidth: "min(400px, 92vw)",
    maxHeight: "min(160px, 24vh)",
    width: "auto",
    height: "auto",
    objectFit: "contain",
    objectPosition: "center",
    boxSizing: "border-box",
  },
};
});

const Chat = () => {
	const classes = useStyles();
	const theme = useTheme();
	const { ticketId } = useParams();
	const welcomeLogoSrc =
		theme.appLogoTickets && String(theme.appLogoTickets).trim() !== ""
			? theme.appLogoTickets
			: theme.mode === "light"
				? theme.appLogoLight || logo
				: theme.appLogoDark || logoDark;

	return (
		<div className={classes.chatContainer}>
			<div className={classes.chatPapper}>
				<Grid container spacing={0} style={{ flex: 1, minHeight: 0, width: "100%", margin: 0 }}>
					<Grid item xs={12} sm={4} md={2} className={`${classes.contactsWrapper} ${classes.ticketPreviewColumn}`}>
						<TicketsManagerTabs />
					</Grid>
					<Grid item xs={12} sm={8} md={10} className={`${classes.messagessWrapper} ${classes.chatAreaColumn}`}>
						{ticketId ? (
							<>
								<Ticket />
							</>
						) : (
							<Box className={classes.welcomeMsg} component="div">
								<Box
									display="flex"
									flexDirection="column"
									alignItems="center"
									justifyContent="center"
									width="100%"
									maxWidth="100%"
									px={2}
								>
									<img
										className={classes.logo}
										src={welcomeLogoSrc}
										alt=""
										loading="lazy"
										decoding="async"
									/>
									<Typography component="div" variant="body2">
										{i18n.t("chat.noTicketMessage")}
									</Typography>
								</Box>
							</Box>
						)}
					</Grid>
				</Grid>
			</div>
		</div>
	);
};

export default Chat;
