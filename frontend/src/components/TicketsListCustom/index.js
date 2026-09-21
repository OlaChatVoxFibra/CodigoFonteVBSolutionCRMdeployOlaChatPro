/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useReducer, useContext, useMemo, useRef } from "react";

import { makeStyles } from "@material-ui/core/styles";
import List from "@material-ui/core/List";
import Paper from "@material-ui/core/Paper";

import TicketListItem from "../TicketListItemCustom";
import TicketsListSkeleton from "../TicketsListSkeleton";

import useTickets from "../../hooks/useTickets";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
    ticketsListWrapper: {
        position: "relative",
        display: "flex",
        height: "100%",
        flexDirection: "column",
        overflow: "hidden",
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        backgroundColor:
            theme.palette.type === "dark"
                ? theme.palette.background.default
                : "transparent",
    },

    ticketsList: {
        flex: 1,
        maxHeight: "100%",
        overflowY: "scroll",
        scrollbarWidth: "thin",
        scrollbarColor:
            theme.palette.type === "dark"
                ? "#6b7280 transparent"
                : "#9ca3af transparent",
        "&::-webkit-scrollbar": {
            width: "6px",
            height: "6px",
        },
        "&::-webkit-scrollbar-thumb": {
            backgroundColor:
                theme.palette.type === "dark" ? "rgba(255,255,255,0.4)" : "#9ca3af",
            borderRadius: 6,
            "&:hover": {
                backgroundColor:
                    theme.palette.type === "dark" ? "#9ca3af" : "#6b7280",
            },
        },
        "&::-webkit-scrollbar-track": {
            backgroundColor: "transparent",
        },
        borderTop:
            theme.palette.type === "dark"
                ? `1px solid ${theme.palette.divider}`
                : "1px solid #e7ebf3",
        backgroundColor: "transparent",
    },

    ticketsListHeader: {
        color:
            theme.palette.type === "dark"
                ? theme.palette.text.secondary
                : "rgb(67, 83, 105)",
        zIndex: 2,
        backgroundColor:
            theme.palette.type === "dark"
                ? theme.palette.dashboardCard || theme.palette.background.paper
                : "white",
        borderBottom: `1px solid ${theme.palette.divider}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    },

    ticketsCount: {
        fontWeight: "normal",
        color:
            theme.palette.type === "dark"
                ? theme.palette.text.secondary
                : "rgb(104, 121, 146)",
        marginLeft: "8px",
        fontSize: "14px",
    },

    noTicketsText: {
        textAlign: "center",
        color:
            theme.palette.type === "dark"
                ? theme.palette.text.secondary
                : "rgb(104, 121, 146)",
        fontSize: "14px",
        lineHeight: "1.4",
    },

    noTicketsTitle: {
        textAlign: "center",
        fontSize: "16px",
        fontWeight: "600",
        margin: "0px",
        color:
            theme.palette.type === "dark"
                ? theme.palette.text.primary
                : "inherit",
    },

    noTicketsDiv: {
        display: "flex",
        // height: "190px",
        margin: 40,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
    },
}));

const ticketSortAsc = (a, b) => {
    
    if (a.updatedAt < b.updatedAt) {
        return -1;
    }
    if (a.updatedAt > b.updatedAt) {
        return 1;
    }
    return 0;
}

const ticketSortDesc = (a, b) => {
   
    if (a.updatedAt > b.updatedAt) {
        return -1;
    }
    if (a.updatedAt < b.updatedAt) {
        return 1;
    }
    return 0;
};

/** Mesma regra da API/ListTicketsService e do filtro da aba Aguardando */
const PENDING_TAB_STATUSES = ["pending", "lgpd", "chatbot"];

const isPendingTabTicket = (ticket) => {
    if (!ticket) return false;
    return PENDING_TAB_STATUSES.includes(ticket.status);
};

const ticketStatusMatchesTab = (ticketStatus, tabStatus, ticket = null) => {
    if (tabStatus === "pending") {
        if (ticket) return isPendingTabTicket(ticket);
        return PENDING_TAB_STATUSES.includes(ticketStatus);
    }
    if (tabStatus === "open" && ticket) {
        return ticketStatus === "open" && !isPendingTabTicket(ticket);
    }
    return ticketStatus === tabStatus;
};

const applySortDir = (arr, sortDir) => {
    if (sortDir === 'ASC') arr.sort(ticketSortAsc);
    else if (sortDir === 'DESC') arr.sort(ticketSortDesc);
};

const reducer = (state, action) => {
    const sortDir = action.sortDir;
    
    if (action.type === "LOAD_TICKETS") {
        const newTickets = action.payload || [];

        if (action.replace) {
            const next = [...newTickets];
            applySortDir(next, sortDir);
            return next;
        }

        if (newTickets.length === 0) {
            return state;
        }

        const next = [...state];
        newTickets.forEach((ticket) => {
            const ticketIndex = next.findIndex((t) => t.id === ticket.id);
            if (ticketIndex !== -1) {
                next[ticketIndex] = ticket;
                if (ticket.unreadMessages > 0) {
                    next.unshift(next.splice(ticketIndex, 1)[0]);
                }
            } else {
                next.push(ticket);
            }
        });
        applySortDir(next, sortDir);
        return next;
    }

    if (action.type === "RESET_UNREAD") {
        const ticketId = action.payload;
        const ticketIndex = state.findIndex((t) => t.id === ticketId);
        if (ticketIndex === -1) return state;
        const next = [...state];
        next[ticketIndex] = { ...next[ticketIndex], unreadMessages: 0 };
        applySortDir(next, sortDir);
        return next;
    }

    if (action.type === "UPDATE_TICKET") {
        const ticket = action.payload;
        const next = [...state];
        const ticketIndex = next.findIndex((t) => t.id === ticket.id);
        if (ticketIndex !== -1) {
            next[ticketIndex] = ticket;
        } else {
            next.unshift(ticket);
        }
        applySortDir(next, sortDir);
        return next;
    }

    if (action.type === "UPDATE_TICKET_UNREAD_MESSAGES") {
        const ticket = action.payload;
        const next = [...state];
        const ticketIndex = next.findIndex((t) => t.id === ticket.id);
        if (ticketIndex !== -1) {
            next[ticketIndex] = ticket;
            next.unshift(next.splice(ticketIndex, 1)[0]);
        } else {
            const tab = action.status;
            const matches =
                tab === "pending"
                    ? isPendingTabTicket(ticket)
                    : tab === "open"
                        ? ticket.status === tab && !isPendingTabTicket(ticket)
                        : ticket.status === tab;
            if (matches) {
                next.unshift(ticket);
            } else {
                return state;
            }
        }
        applySortDir(next, sortDir);
        return next;
    }

    if (action.type === "UPDATE_TICKET_CONTACT") {
        const contact = action.payload;
        const ticketIndex = state.findIndex((t) => t.contactId === contact.id);
        if (ticketIndex === -1) return state;
        const next = [...state];
        next[ticketIndex] = { ...next[ticketIndex], contact };
        return next;
    }

    if (action.type === "DELETE_TICKET") {
        const ticketId = action.payload;
        const ticketIndex = state.findIndex((t) => t.id === ticketId);
        if (ticketIndex === -1) return state;
        const next = [...state];
        next.splice(ticketIndex, 1);
        applySortDir(next, sortDir);
        return next;
    }

    if (action.type === "RESET") {
        return state.length === 0 ? state : [];
    }

    return state;
};

const TicketsListCustom = React.memo((props) => {
    const {
        setTabOpen,
        status,
        searchParam,
        searchOnMessages,
        tags,
        users,
        showAll,
        selectedQueueIds,
        updateCount,
        style,
        whatsappIds,
        forceSearch,
        statusFilter,
        userFilter,
        sortTickets,
        onlyUnread,
        dateStart,
        dateEnd
    } = props;

    const classes = useStyles();
    const [pageNumber, setPageNumber] = useState(1);
    const [refreshNonce, setRefreshNonce] = useState(0);
    const [ticketsRaw, dispatch] = useReducer(reducer, []);
    const { user, socket } = useContext(AuthContext);

    const { profile, queues } = user;
    const showTicketWithoutQueue = (user.allTicket === 'enable' || user.allTicket === 'enabled');
    const companyId = user.companyId;
    const userId = user?.id;
    const userRef = useRef(user);
    userRef.current = user;
    const queueIdsStr = useMemo(() => JSON.stringify((queues || []).map(q => q.id)), [queues]);

    const ticketsList = useMemo(() => {
        if (!status || status === "search") return ticketsRaw;
        if (status === "pending") return ticketsRaw.filter(ticket => isPendingTabTicket(ticket));
        if (status === "open") return ticketsRaw.filter(ticket => ticket.status === "open" && !isPendingTabTicket(ticket));
        return ticketsRaw.filter(ticket => ticket.status === status);
    }, [ticketsRaw, status]);

    useEffect(() => {
        if (!socket || !companyId) {
            return;
        }
        dispatch({ type: "RESET" });
        setPageNumber(1);
    }, [status, searchParam, dispatch, showAll, tags, users, forceSearch, selectedQueueIds, whatsappIds, statusFilter, sortTickets, searchOnMessages, onlyUnread, dateStart, dateEnd]);

    const { tickets, hasMore, loading } = useTickets({
        pageNumber,
        searchParam,
        status,
        showAll,
        searchOnMessages: searchOnMessages ? "true" : "false",
        tags: JSON.stringify(tags),
        users: JSON.stringify(users),
        queueIds: JSON.stringify(selectedQueueIds),
        whatsappIds: JSON.stringify(whatsappIds),
        statusFilter: JSON.stringify(statusFilter),
        userFilter,
        sortTickets,
        withUnreadMessages: onlyUnread ? "true" : "false",
        updatedStart: dateStart || undefined,
        updatedEnd: dateEnd || undefined,
        forceSearch,
        refreshNonce
    });


    useEffect(() => {
        if (!companyId) return;

        dispatch({
            type: "LOAD_TICKETS",
            payload: tickets,
            status,
            sortDir: sortTickets,
            replace: pageNumber <= 1
        });
    }, [tickets, companyId, pageNumber, sortTickets]);

    useEffect(() => {
        const currentUser = userRef.current;
        const shouldUpdateTicket = ticket => {
            const sameUser =
                ticket?.userId != null &&
                Number(ticket.userId) === Number(currentUser?.id);
            if (status === "pending") {
                return true;
            }
            if (status === "open" && sameUser) {
                return true;
            }
            if (status === "closed" && ticket?.status === "closed") {
                return true;
            }
            if (status === "open" && (ticket?.isBot === true || ticket?.useIntegration === true)) {
                return true;
            }
            // API Oficial Meta: mantém na lista enquanto estiver open (mesmo sem fila / com IA).
            if (
                status === "open" &&
                String(ticket?.channel || "").toLowerCase() === "whatsapp_oficial" &&
                ticket?.status === "open"
            ) {
                return sameUser || !ticket?.userId || showAll;
            }
            const noQueueFilter = !selectedQueueIds || selectedQueueIds.length === 0;
            return (!ticket?.userId || sameUser || showAll) &&
                ((!ticket?.queueId && showTicketWithoutQueue) || noQueueFilter || selectedQueueIds.indexOf(ticket?.queueId) > -1)
        }
        // const shouldUpdateTicketUser = (ticket) =>
        //     selectedQueueIds.indexOf(ticket?.queueId) > -1 && (ticket?.userId === user?.id || !ticket?.userId);

        const notBelongsToUserQueues = (ticket) =>
            ticket.queueId && selectedQueueIds.indexOf(ticket.queueId) === -1;

        const isMyOpenTicket = (ticket) =>
            status === "open" &&
            ticket?.userId != null &&
            Number(ticket.userId) === Number(currentUser?.id);

        const keepOficialOpenTicket = (ticket) =>
            status === "open" &&
            ticket?.status === "open" &&
            String(ticket?.channel || "").toLowerCase() === "whatsapp_oficial" &&
            (
                showAll ||
                ticket?.userId == null ||
                Number(ticket.userId) === Number(currentUser?.id)
            );

        const onCompanyTicketTicketsList = (data) => {
            // console.log("onCompanyTicketTicketsList", data)
            if (data.action === "updateUnread") {
                dispatch({
                    type: "RESET_UNREAD",
                    payload: data.ticketId,
                    status: status,
                    sortDir: sortTickets
                });
            }
            // console.log(shouldUpdateTicket(data.ticket))
            if (data.action === "update") {
                if (ticketStatusMatchesTab(data.ticket.status, status) && shouldUpdateTicket(data.ticket)) {
                    dispatch({
                        type: "UPDATE_TICKET",
                        payload: data.ticket,
                        status: status,
                        sortDir: sortTickets
                    });
                } else if (!(isMyOpenTicket(data.ticket) || keepOficialOpenTicket(data.ticket))) {
                    dispatch({
                        type: "DELETE_TICKET",
                        payload: data.ticket?.id,
                        status: status,
                        sortDir: sortTickets
                    });
                }
            }
            if (data.action === "create" &&
                shouldUpdateTicket(data.ticket) && ticketStatusMatchesTab(data.ticket.status, status, data.ticket)) {
                dispatch({
                    type: "UPDATE_TICKET",
                    payload: data.ticket,
                    status: status,
                    sortDir: sortTickets
                });
            }

            // else if (data.action === "update" && shouldUpdateTicketUser(data.ticket) && data.ticket.status === status) {
            //     dispatch({
            //         type: "UPDATE_TICKET",
            //         payload: data.ticket,
            //     });
            // }
            // Aguardando: API já lista todos os pendentes; não remover só porque a fila selecionada na UI não bate
            // (senão sumiam tickets SEM FILA / IA em tempo real mesmo existindo no backend).
            if (
                data.action === "update" &&
                status !== "pending" &&
                notBelongsToUserQueues(data.ticket) &&
                !isMyOpenTicket(data.ticket) &&
                !(status === "open" && (data.ticket?.isBot === true || data.ticket?.useIntegration === true)) &&
                !keepOficialOpenTicket(data.ticket) &&
                !(status === "closed" && data.ticket?.status === "closed" && shouldUpdateTicket(data.ticket))
            ) {
                dispatch({
                    type: "DELETE_TICKET", payload: data.ticket?.id, status: status,
                    sortDir: sortTickets
                });
            }

            if (data.action === "delete") {
                dispatch({
                    type: "DELETE_TICKET", payload: data?.ticketId, status: status,
                    sortDir: sortTickets
                });

            }

            if (data.action === "bulkComplete" && data.type === "close") {
                dispatch({ type: "RESET" });
                setPageNumber(1);
            }
        };

        const onCompanyAppMessageTicketsList = (data) => {
            if (data.action === "create") {
                if (ticketStatusMatchesTab(data.ticket.status, status, data.ticket) && shouldUpdateTicket(data.ticket)) {
                    dispatch({
                        type: "UPDATE_TICKET_UNREAD_MESSAGES",
                        payload: data.ticket,
                        status: status,
                        sortDir: sortTickets
                    });
                } else if (!(isMyOpenTicket(data.ticket) || keepOficialOpenTicket(data.ticket))) {
                    dispatch({
                        type: "DELETE_TICKET",
                        payload: data.ticket?.id,
                        status: status,
                        sortDir: sortTickets
                    });
                }
            }
            // else if (data.action === "create" && shouldUpdateTicketUser(data.ticket) && data.ticket.status === status) {
            //     dispatch({
            //         type: "UPDATE_TICKET_UNREAD_MESSAGES",
            //         payload: data.ticket,
            //     });
            // }
        };

        const onCompanyContactTicketsList = (data) => {
            if (data.action === "update" && data.contact) {
                dispatch({
                    type: "UPDATE_TICKET_CONTACT",
                    payload: data.contact,
                    status: status,
                    sortDir: sortTickets
                });
            }
        };

        const onConnectTicketsList = () => {
            if (status) {
                socket.emit("joinTickets", status);
            } else {
                socket.emit("joinNotification");
            }
            dispatch({ type: "RESET" });
            setPageNumber(1);
            setRefreshNonce((n) => n + 1);
        }

        socket.on("connect", onConnectTicketsList)
        socket.on(`company-${companyId}-ticket`, onCompanyTicketTicketsList);
        socket.on(`company-${companyId}-appMessage`, onCompanyAppMessageTicketsList);
        socket.on(`company-${companyId}-contact`, onCompanyContactTicketsList);

        return () => {
            if (status) {
                socket.emit("joinTicketsLeave", status);
            } else {
                socket.emit("leaveNotification");
            }
            socket.off("connect", onConnectTicketsList);
            socket.off(`company-${companyId}-ticket`, onCompanyTicketTicketsList);
            socket.off(`company-${companyId}-appMessage`, onCompanyAppMessageTicketsList);
            socket.off(`company-${companyId}-contact`, onCompanyContactTicketsList);
        };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, showAll, userId, companyId, selectedQueueIds, tags, users, profile, queueIdsStr, sortTickets, showTicketWithoutQueue, socket]);

    const prevCountRef = useRef(0);
    const updateCountRef = useRef(updateCount);
    updateCountRef.current = updateCount;
    const ticketsLen = ticketsList.length;
    useEffect(() => {
        if (typeof updateCountRef.current === "function" && prevCountRef.current !== ticketsLen) {
            prevCountRef.current = ticketsLen;
            updateCountRef.current(ticketsLen);
        }
    }, [ticketsLen]);

    const loadMore = () => {
        setPageNumber((prevState) => prevState + 1);
    };

    const handleScroll = (e) => {
        if (!hasMore || loading) return;

        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

        if (scrollHeight - (scrollTop + 100) < clientHeight) {
            loadMore();
        }
    };

    return (
        <Paper className={classes.ticketsListWrapper} style={style}>
            <Paper
                square
                name="closed"
                elevation={0}
                className={classes.ticketsList}
                onScroll={handleScroll}
            >
                <List style={{ paddingTop: 0 }} >
                    {ticketsList.length === 0 && !loading ? (
                        <div className={classes.noTicketsDiv}>
                            <span className={classes.noTicketsTitle}>
                                {i18n.t("ticketsList.noTicketsTitle")}
                            </span>
                            <p className={classes.noTicketsText}>
                                {i18n.t("ticketsList.noTicketsMessage")}
                            </p>
                        </div>
                    ) : (
                        <>
                            {ticketsList.map((ticket) => (
                                <TicketListItem
                                    ticket={ticket}
                                    key={ticket.id}
                                    setTabOpen={setTabOpen}
                                />
                            ))}
                        </>
                    )}
                    {loading && <TicketsListSkeleton />}
                </List>
            </Paper>
        </Paper>
    );
});

TicketsListCustom.displayName = "TicketsListCustom";

export default TicketsListCustom;
