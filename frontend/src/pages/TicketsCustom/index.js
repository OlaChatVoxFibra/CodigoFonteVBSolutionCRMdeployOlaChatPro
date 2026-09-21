/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useCallback, useContext, useEffect, useRef } from "react";
import { useParams, useHistory } from "react-router-dom";
import Box from "@material-ui/core/Box";
import Hidden from "@material-ui/core/Hidden";
import Typography from "@material-ui/core/Typography";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import TicketsManagerTabs from "../../components/TicketsManagerTabs";
import Ticket from "../../components/Ticket";

import { QueueSelectedProvider } from "../../context/QueuesSelected/QueuesSelectedContext";
import { TicketsContext } from "../../context/Tickets/TicketsContext";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import api from "../../services/api";
import { CircularProgress } from "@material-ui/core";
import { getBackendUrl } from "../../config";

const defaultTicketsManagerWidth = 580;
const minTicketsManagerWidth = 360;
const maxTicketsManagerWidth = 840;

/** Painel conversa (modo escuro): cinza visível — evita #11151d / #0f1115 quase pretos */
const DARK_CHAT_SURFACE = "#48484b";

const useStyles = makeStyles((theme) => {
	const darkChatBg =
		theme.mode === "dark"
			? theme.palette.dashboardCard ||
				theme.palette.background.paper ||
				DARK_CHAT_SURFACE
			: "#ffffff";

	return {
	chatContainer: {
		flex: 1,
		padding: "0",
		height: `calc(100% - 48px)`,
		overflowY: "hidden",
		overflowX: "hidden",
		background:
			theme.mode === "dark"
				? theme.palette.background.default || "#2d2d2d"
				: "#f3f4f6",
	},
	chatPapper: {
		display: "flex",
		height: "100%",
		width: "100%",
		overflow: "hidden",
		borderRadius: 0,
		border: theme.mode === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e5e7eb",
		background: theme.mode === "dark" ? darkChatBg : "#ffffff",
		boxShadow: theme.mode === "dark"
			? "0 10px 30px rgba(0,0,0,0.35)"
			: "0 10px 30px rgba(15,23,42,0.07)",
	},
	contactsWrapper: {
		display: "flex",
		height: "100%",
		flexDirection: "column",
		overflowY: "hidden",
		position: "relative",
		// Adicionar largura mínima como fallback
		minWidth: `${minTicketsManagerWidth}px`,
		borderRight: theme.mode === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid #edf0f4",
		background: theme.mode === "dark" ? "#151821" : "#fcfcfd"
	},
	messagesWrapper: {
		display: "flex",
		height: "100%",
		flexDirection: "column",
		flexGrow: 1,
		flex: 1,
		minWidth: 0,
		minHeight: 0,
		overflow: "hidden",
		background: theme.mode === "dark" ? darkChatBg : "#ffffff",
	},
	welcomeMsg: {
		backgroundColor: theme.mode === "dark" ? darkChatBg : "#f8fafc",
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
		flex: 1,
		width: "100%",
		minHeight: 0,
		height: "100%",
		textAlign: "center",
		border: "none",
		boxShadow: "none",
	},
	dragger: {
		width: "5px",
		cursor: "ew-resize",
		padding: "4px 0 0",
		borderTop: "none",
		position: "absolute",
		top: 0,
		right: 0,
		bottom: 0,
		zIndex: 100,
		backgroundColor: theme.mode === "dark" ? "rgba(255,255,255,0.04)" : "#eef2f7",
		userSelect: "none",
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

const TicketsCustom = () => {
	const { user } = useContext(AuthContext);
	const theme = useTheme();
	const welcomeLogoSrc =
		theme.appLogoTickets && String(theme.appLogoTickets).trim() !== ""
			? theme.appLogoTickets
			: theme.mode === "light"
				? theme.appLogoLight || theme.calculatedLogoLight()
				: theme.appLogoDark || theme.calculatedLogoDark();
	
	// ⚠️ CORREÇÃO PRINCIPAL: Inicializar com largura padrão adequada
	const [ticketsManagerWidth, setTicketsManagerWidth] = useState(
		user?.defaultTicketsManagerWidth || defaultTicketsManagerWidth
	);
	// Acompanhar largura da viewport para limitar responsivamente a lista
	const [viewportWidth, setViewportWidth] = useState(
		typeof window !== "undefined" ? window.innerWidth : 1366
	);
	
	const classes = useStyles({ ticketsManagerWidth });
	const { ticketId } = useParams();
	const ticketsManagerWidthRef = useRef(ticketsManagerWidth);

	useEffect(() => {
		const initialWidth = user?.defaultTicketsManagerWidth || defaultTicketsManagerWidth;
		const validWidth = Math.max(
			minTicketsManagerWidth,
			Math.min(maxTicketsManagerWidth, initialWidth)
		);
		
		setTicketsManagerWidth(validWidth);
		ticketsManagerWidthRef.current = validWidth;
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user?.defaultTicketsManagerWidth]);

	// Atualizar largura da viewport para clamp responsivo
	useEffect(() => {
		const onResize = () => setViewportWidth(window.innerWidth);
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);

	const handleMouseDown = (e) => {
		document.addEventListener("mouseup", handleMouseUp, true);
		document.addEventListener("mousemove", handleMouseMove, true);
	};

	const handleSaveContact = async (value) => {
		// Garantir largura mínima antes de salvar
		const validValue = Math.max(minTicketsManagerWidth, value);
		
		try {
			await api.put(`/users/toggleChangeWidht/${user.id}`, { 
				defaultTicketsManagerWidth: validValue 
			});
		} catch (error) {
			console.error("Erro ao salvar largura:", error);
		}
	};

	const handleMouseMove = useCallback((e) => {
		const newWidth = e.clientX - document.body.offsetLeft;
		
		if (newWidth >= minTicketsManagerWidth && newWidth <= maxTicketsManagerWidth) {
			ticketsManagerWidthRef.current = newWidth;
			setTicketsManagerWidth(newWidth);
		}
	}, []);

	const handleMouseUp = async () => {
		document.removeEventListener("mouseup", handleMouseUp, true);
		document.removeEventListener("mousemove", handleMouseMove, true);

		const newWidth = ticketsManagerWidthRef.current;

		if (newWidth !== ticketsManagerWidth) {
			await handleSaveContact(newWidth);
		}
	};

	// Limite responsivo: coluna esquerda mais próxima do layout referência
  const responsiveMax = Math.max(
		minTicketsManagerWidth,
    Math.min(maxTicketsManagerWidth, Math.floor(viewportWidth * 0.33))
	);
	// ⚠️ CORREÇÃO: Garantir que a largura nunca seja 0 ou inválida e não ultrapasse o limite responsivo
	const effectiveWidth = Math.min(
		responsiveMax,
		Math.max(minTicketsManagerWidth, ticketsManagerWidth)
	);

	return (
		<QueueSelectedProvider>
			<div className={classes.chatContainer}>
				<div className={classes.chatPapper}>
					<div
						className={classes.contactsWrapper}
						style={{ 
							width: `${effectiveWidth}px`,
							// Adicionar fallbacks importantes
							minWidth: `${minTicketsManagerWidth}px`,
							maxWidth: `${maxTicketsManagerWidth}px`,
							// Garantir visibilidade
							opacity: effectiveWidth > 0 ? 1 : 0,
							visibility: effectiveWidth > 0 ? 'visible' : 'hidden'
						}}
					>
						<TicketsManagerTabs />
						<div 
							onMouseDown={handleMouseDown} 
							className={classes.dragger} 
						/>
					</div>
					<div className={classes.messagesWrapper}>
						{ticketId ? (
							<Ticket />
						) : (
							<Hidden only={["sm", "xs"]}>
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
							</Hidden>
						)}
					</div>
				</div>
			</div>
		</QueueSelectedProvider>
	);
};

export default TicketsCustom;
