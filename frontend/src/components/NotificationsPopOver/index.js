/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useRef, useEffect, useContext, useCallback } from "react";
import { useTheme } from "@material-ui/core/styles";

import { useHistory } from "react-router-dom";
import { format, parseISO, isValid } from "date-fns";
// import { SocketContext } from "../../context/Socket/SocketContext";

import useSound from "use-sound";

import Popover from "@material-ui/core/Popover";
import IconButton from "@material-ui/core/IconButton";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import Avatar from "@material-ui/core/Avatar";
import Divider from "@material-ui/core/Divider";
import Typography from "@material-ui/core/Typography";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import Badge from "@material-ui/core/Badge";
import NotificationsRounded from "@mui/icons-material/NotificationsRounded";
import EventRounded from "@mui/icons-material/EventRounded";
import { toast } from "react-toastify";

import TicketListItem from "../TicketListItemCustom";
import useTickets from "../../hooks/useTickets";
import alertSound from "../../assets/sound.mp3";
import { AuthContext } from "../../context/Auth/AuthContext";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import Favicon from "react-favicon";
import defaultLogoFavicon from "../../assets/olachat-favicon.png";
import { TicketsContext } from "../../context/Tickets/TicketsContext";
import { topbarSvgIconStyle, topbarActionButtonStyle } from "../../constants/topbarIcons";

const useStyles = makeStyles(theme => ({
	tabContainer: {
		overflowY: "auto",
		maxHeight: 350,
		...theme.scrollbarStyles,
	},
	popoverPaper: {
		width: "100%",
		maxWidth: 320,
		marginLeft: theme.spacing(2),
		marginRight: theme.spacing(1),
		[theme.breakpoints.down("sm")]: {
			maxWidth: 280,
		},
	},
	scheduleListItem: {
		cursor: "pointer",
		"&:hover": {
			backgroundColor: theme.palette.action.hover,
		},
	},
	scheduleAvatar: {
		backgroundColor: theme.palette.error.main,
		color: theme.palette.error.contrastText,
		width: 36,
		height: 36,
	},
	noShadow: {
		boxShadow: "none !important",
	},
	floatingStack: {
		position: "fixed",
		top: 40,
		right: 12,
		zIndex: theme.zIndex.snackbar + 1,
		display: "flex",
		flexDirection: "column",
		alignItems: "stretch",
		gap: theme.spacing(0.75),
		width: "100%",
		maxWidth: 320,
		pointerEvents: "none",
		[theme.breakpoints.down("sm")]: {
			maxWidth: 280,
			right: 8,
		},
	},
	floatingCard: {
		pointerEvents: "auto",
		borderRadius: 12,
		overflow: "hidden",
		boxShadow: theme.palette.type === "dark"
			? "0 10px 28px rgba(0,0,0,0.45)"
			: "0 10px 28px rgba(15,23,42,0.14)",
		border: theme.palette.type === "dark"
			? "1px solid rgba(255,255,255,0.08)"
			: "1px solid rgba(0,0,0,0.06)",
		backgroundColor: theme.palette.background.paper,
	},
}));

const formatScheduleWhen = (sendAt) => {
	if (!sendAt) return "";
	const d = typeof sendAt === "string" ? parseISO(sendAt) : new Date(sendAt);
	if (!isValid(d)) return "";
	return format(d, "dd/MM/yyyy HH:mm");
};

const scheduleContactLabel = (schedule) => {
	const body = String(schedule?.body || "");
	const m = body.match(/Reserva\s*[—–-]\s*([^(]+)/i);
	if (m?.[1]) return m[1].trim();
	return body.split("\n")[0]?.slice(0, 60) || i18n.t("notifications.scheduleAgentTitle");
};

const FLOATING_TOAST_MS = 12000;
const MAX_FLOATING_TOASTS = 3;

const NotificationsPopOver = ({ volume = 1, hideTriggerButton = false, buttonClassName } = {}) => {
	const classes = useStyles();
	const theme = useTheme();

	const history = useHistory();
	const { user, socket } = useContext(AuthContext);
	const { profile, queues } = user;

	const ticketIdUrl = +history.location.pathname.split("/")[2];
	const ticketIdRef = useRef(ticketIdUrl);
	const anchorEl = useRef();
	const [isOpen, setIsOpen] = useState(false);
	const [notifications, setNotifications] = useState([]);
	const [scheduleAlerts, setScheduleAlerts] = useState([]);
	const [floatingToasts, setFloatingToasts] = useState([]);
	const floatingTimersRef = useRef({});
	const { get: getSetting } = useCompanySettings();
	const getSettingRef = useRef(getSetting);
	getSettingRef.current = getSetting;
	const { setTabOpen } = useContext(TicketsContext);

	const [showTicketWithoutQueue, setShowTicketWithoutQueue] = useState(false);
	const [showNotificationPending, setShowNotificationPending] = useState(false);
	const [showGroupNotification, setShowGroupNotification] = useState(false);

	const [, setDesktopNotifications] = useState([]);

	const { tickets } = useTickets({
		withUnreadMessages: "true"
	});

	const [play] = useSound(alertSound, { volume: typeof volume === "number" ? volume : 1 });
	const soundAlertRef = useRef();

	const historyRef = useRef(history);

	const badgeCount = notifications.length + scheduleAlerts.length;

	const dismissFloatingToast = useCallback((toastId) => {
		if (floatingTimersRef.current[toastId]) {
			clearTimeout(floatingTimersRef.current[toastId]);
			delete floatingTimersRef.current[toastId];
		}
		setFloatingToasts((prev) => prev.filter((item) => item.id !== toastId));
	}, []);

	const pushFloatingToast = useCallback((ticket) => {
		if (!ticket?.id) return;
		const toastId = `${ticket.id}-${Date.now()}`;

		setFloatingToasts((prev) => {
			const withoutSameTicket = prev.filter((item) => item.ticket.id !== ticket.id);
			return [{ id: toastId, ticket }, ...withoutSameTicket].slice(0, MAX_FLOATING_TOASTS);
		});

		if (floatingTimersRef.current[toastId]) {
			clearTimeout(floatingTimersRef.current[toastId]);
		}
		floatingTimersRef.current[toastId] = setTimeout(() => {
			dismissFloatingToast(toastId);
		}, FLOATING_TOAST_MS);
	}, [dismissFloatingToast]);

	useEffect(() => {
		return () => {
			Object.values(floatingTimersRef.current).forEach(clearTimeout);
			floatingTimersRef.current = {};
		};
	}, []);

	const dismissScheduleAlert = useCallback((scheduleId) => {
		setScheduleAlerts(prev => prev.filter(s => s.id !== scheduleId));
	}, []);

	const handleScheduleAlertClick = useCallback((schedule) => {
		dismissScheduleAlert(schedule.id);
		setIsOpen(false);
		historyRef.current.push("/schedules");
	}, [dismissScheduleAlert]);

	const pushScheduleAlert = useCallback((schedule) => {
		if (!schedule?.id) return;
		const whenLabel = formatScheduleWhen(schedule.sendAt);
		const contactLabel = scheduleContactLabel(schedule);
		const onSchedulesPage = historyRef.current.location.pathname === "/schedules";

		setScheduleAlerts(prev => {
			if (prev.some(s => s.id === schedule.id)) return prev;
			return [{ ...schedule, receivedAt: Date.now() }, ...prev];
		});

		toast.info(
			<div>
				<strong>{i18n.t("notifications.scheduleAgentToast")}</strong>
				<div style={{ fontSize: 13, marginTop: 4, opacity: 0.9 }}>
					{contactLabel}
					{whenLabel ? ` · ${whenLabel}` : ""}
				</div>
			</div>
		);

		if (!onSchedulesPage && soundAlertRef.current) {
			soundAlertRef.current();
		}

		if ("Notification" in window && Notification.permission === "granted") {
			const notification = new Notification(i18n.t("notifications.scheduleAgentToast"), {
				body: whenLabel
					? `${contactLabel} — ${whenLabel}`
					: contactLabel,
				tag: `schedule-${schedule.id}`,
				renotify: true,
			});
			notification.onclick = (e) => {
				e.preventDefault();
				window.focus();
				dismissScheduleAlert(schedule.id);
				historyRef.current.push("/schedules");
			};
		}
	}, [dismissScheduleAlert]);

	useEffect(() => {
		let cancelled = false;
		const fetchSettings = async () => {
			try {
				const setting = await getSettingRef.current(
					{
						"column": "showNotificationPending"
					}
				);
				if (cancelled) return;

				if (setting.showNotificationPending === true) {
					setShowNotificationPending(true);
				}

				if (user.allTicket === "enable") {
					setShowTicketWithoutQueue(true);
				}
				if (user.allowGroup === true) {
					setShowGroupNotification(true);
				}
			} catch (err) {
				if (!cancelled) toastError(err);
			}
		}

		fetchSettings();
		return () => { cancelled = true; };
	}, [user.allTicket, user.allowGroup]);

	useEffect(() => {
		soundAlertRef.current = play;

		if (!("Notification" in window)) {
			console.log("This browser doesn't support notifications");
		} else {
			Notification.requestPermission();
		}
	}, [play]);

	useEffect(() => {
		if (tickets && tickets.length > 0) {
			setNotifications((prev) => (prev === tickets ? prev : tickets));
		} else if (tickets && tickets.length === 0) {
			setNotifications((prev) => (prev.length === 0 ? prev : []));
		}
	}, [tickets]);

	useEffect(() => {
		ticketIdRef.current = ticketIdUrl;
	}, [ticketIdUrl]);

	useEffect(() => {
		const companyId = user.companyId;
		if (user.id && socket && typeof socket.on === "function") {
			const onConnectNotificationsPopover = () => {
				socket.emit("joinNotification");
			}

			const onCompanyTicketNotificationsPopover = (data) => {
				if (data.action === "updateUnread" || data.action === "delete") {
					setNotifications(prevState => {
						const ticketIndex = prevState.findIndex(t => t.id === data.ticketId);
						if (ticketIndex !== -1) {
							return prevState.filter(t => t.id !== data.ticketId);
						}
						return prevState;
					});

					setDesktopNotifications(prevState => {
						const notfiticationIndex = prevState.findIndex(
							n => n.tag === String(data.ticketId)
						);
						if (notfiticationIndex !== -1) {
							prevState[notfiticationIndex].close();
							return prevState.filter((_, i) => i !== notfiticationIndex);
						}
						return prevState;
					});
				}
			};

			const onCompanyAppMessageNotificationsPopover = (data) => {
				if (
					data.action === "create" && !data.message.fromMe &&
					!data.message.read &&
					(data.ticket?.userId === user?.id || !data.ticket?.userId) &&
					(user?.queues?.some(queue => (queue.id === data.ticket.queueId)) ||
						!data.ticket.queueId && showTicketWithoutQueue === true) &&
					(!["pending", "lgpd", "nps", "group"].includes(data.ticket?.status) ||
						(data.ticket?.status === "pending" && showNotificationPending === true) ||
						(data.ticket?.status === "group" && data.ticket?.whatsapp?.groupAsTicket === "enabled" && showGroupNotification === true))
				) {
					const shouldBlurMessages = data.ticket.status === "pending" && user.allowSeeMessagesInPendingTickets === "disabled";

					const ticketToAdd = shouldBlurMessages
						? {
							...data.ticket,
							lastMessage: i18n.t("notifications.messageHidden")
						}
						: data.ticket;

					setNotifications(prevState => {
						const ticketIndex = prevState.findIndex(t => t.id === ticketToAdd.id);
						if (ticketIndex !== -1) {
							const next = [...prevState];
							next[ticketIndex] = ticketToAdd;
							return next;
						}
						return [ticketToAdd, ...prevState];
					});

					const shouldNotNotificate =
						(data.message.ticketId === ticketIdRef.current &&
							document.visibilityState === "visible") ||
						(data.ticket.userId && data.ticket.userId !== user?.id) ||
						(data.ticket.isGroup && data.ticket?.whatsapp?.groupAsTicket === "disabled" && showGroupNotification === false);

					if (shouldNotNotificate === true) return;

					const messageBody = shouldBlurMessages
						? i18n.t("notifications.messageHidden")
						: data.message.body;

					handleNotifications({
						...data,
						message: {
							...data.message,
							body: messageBody
						}
					});
				}
			};

			const onCompanyScheduleAgentNotification = (data) => {
				if (data.action === "create" && data.fromAgent === true && data.schedule) {
					pushScheduleAlert(data.schedule);
				}
			};

			socket.on("connect", onConnectNotificationsPopover);
			socket.on(`company-${companyId}-ticket`, onCompanyTicketNotificationsPopover);
			socket.on(`company-${companyId}-appMessage`, onCompanyAppMessageNotificationsPopover);
			socket.on(`company${companyId}-schedule`, onCompanyScheduleAgentNotification);

			return () => {
				if (typeof socket.off === "function") {
					socket.off("connect", onConnectNotificationsPopover);
					socket.off(`company-${companyId}-ticket`, onCompanyTicketNotificationsPopover);
					socket.off(`company-${companyId}-appMessage`, onCompanyAppMessageNotificationsPopover);
					socket.off(`company${companyId}-schedule`, onCompanyScheduleAgentNotification);
				}
			};
		}
		return undefined;
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user?.id, user?.companyId, showTicketWithoutQueue, socket, showNotificationPending, showGroupNotification, pushScheduleAlert]);

	const handleNotifications = data => {
		const { message, contact, ticket } = data;

		pushFloatingToast({
			...ticket,
			lastMessage: message?.body ?? ticket?.lastMessage,
			contact: contact || ticket?.contact,
		});

		const options = {
			body: `${message.body} - ${format(new Date(), "HH:mm")}`,
			icon: contact.urlPicture || contact.profilePicUrl,
			tag: ticket.id,
			renotify: true,
		};
		const notification = new Notification(
			`${i18n.t("tickets.notification.message")} ${contact.name}`,
			options
		);

		notification.onclick = e => {
			e.preventDefault();
			window.focus();
			setTabOpen(ticket.status)
			historyRef.current.push(`/tickets/${ticket.uuid}`);
		};

		setDesktopNotifications(prevState => {
			const notfiticationIndex = prevState.findIndex(
				n => n.tag === notification.tag
			);
			if (notfiticationIndex !== -1) {
				const next = [...prevState];
				next[notfiticationIndex] = notification;
				return next;
			}
			return [notification, ...prevState];
		});
		soundAlertRef.current();
	};

	const handleClick = () => {
		setIsOpen(prevState => !prevState);
	};

	const handleClickAway = () => {
		setIsOpen(false);
	};

	const NotificationTicket = ({ children }) => {
		return <div onClick={handleClickAway}>{children}</div>;
	};

	const browserNotification = () => {
		const numbers = "⓿➊➋➌➍➎➏➐➑➒➓⓫⓬⓭⓮⓯⓰⓱⓲⓳⓴";
		if (badgeCount > 0) {
			if (badgeCount < 21) {
				document.title = numbers.substring(badgeCount, badgeCount + 1) + " - " + (String(theme.appName || "OlaChat Pro"));
			} else {
				document.title = "(" + badgeCount + ") " + (String(theme.appName || "OlaChat Pro"));
			}
		} else {
			document.title = String(theme.appName || "OlaChat Pro");
		}
		return (
			<>
				<Favicon
					animated={true}
					url={(theme?.appLogoFavicon) ? theme.appLogoFavicon : defaultLogoFavicon}
					alertCount={badgeCount}
					iconSize={195}
				/>
			</>
		);
	};

	const hasAnyNotification = badgeCount > 0;

	return (
		<>
			{browserNotification()}

			{floatingToasts.length > 0 ? (
				<div className={classes.floatingStack}>
					{floatingToasts.map(({ id, ticket }) => (
						<Paper
							key={id}
							elevation={0}
							className={classes.floatingCard}
						>
							<TicketListItem ticket={ticket} setTabOpen={setTabOpen} compact />
						</Paper>
					))}
				</div>
			) : null}

			{!hideTriggerButton ? (
				<>
					<IconButton
						onClick={handleClick}
						ref={anchorEl}
						aria-label="Open Notifications"
						color="inherit"
						className={buttonClassName}
						style={topbarActionButtonStyle}
					>
						<Badge overlap="rectangular" badgeContent={badgeCount} color="error">
							<NotificationsRounded style={topbarSvgIconStyle("#fff")} />
						</Badge>
					</IconButton>
					<Popover
						disableScrollLock
						open={isOpen}
						anchorEl={anchorEl.current}
						anchorOrigin={{
							vertical: "bottom",
							horizontal: "right",
						}}
						transformOrigin={{
							vertical: "top",
							horizontal: "right",
						}}
						classes={{ paper: classes.popoverPaper }}
						onClose={handleClickAway}
					>
						<List dense className={classes.tabContainer}>
							{scheduleAlerts.map((schedule) => {
								const whenLabel = formatScheduleWhen(schedule.sendAt);
								return (
									<ListItem
										key={`schedule-${schedule.id}`}
										className={classes.scheduleListItem}
										onClick={() => handleScheduleAlertClick(schedule)}
									>
										<ListItemAvatar>
											<Avatar className={classes.scheduleAvatar}>
												<EventRounded style={{ fontSize: 18 }} />
											</Avatar>
										</ListItemAvatar>
										<ListItemText
											primary={
												<Typography variant="body2" style={{ fontWeight: 600 }}>
													{i18n.t("notifications.scheduleAgentTitle")}
												</Typography>
											}
											secondary={
												<>
													<Typography component="span" variant="body2" color="textPrimary">
														{scheduleContactLabel(schedule)}
													</Typography>
													{whenLabel && (
														<Typography component="span" variant="caption" display="block" color="textSecondary">
															{i18n.t("notifications.scheduleAgentWhen", { date: whenLabel })}
														</Typography>
													)}
												</>
											}
										/>
									</ListItem>
								);
							})}
							{scheduleAlerts.length > 0 && notifications.length > 0 && <Divider />}
							{!hasAnyNotification ? (
								<ListItem>
									<ListItemText>{i18n.t("notifications.noTickets")}</ListItemText>
								</ListItem>
							) : (
								notifications.map(ticket => (
									<NotificationTicket key={ticket.id}>
										<TicketListItem ticket={ticket} setTabOpen={setTabOpen} compact />
									</NotificationTicket>
								))
							)}
						</List>
					</Popover>
				</>
			) : null}
		</>
	);
};

export default NotificationsPopOver;
