/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useRef, useContext } from "react";

import { useHistory, useParams } from "react-router-dom";
import { parseISO, format, isSameDay } from "date-fns";
import clsx from "clsx";
import emojiRegex from "emoji-regex";
import { v4 as uuidv4 } from "uuid";

import { makeStyles, withStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import Typography from "@material-ui/core/Typography";
import Avatar from "@material-ui/core/Avatar";
import Divider from "@material-ui/core/Divider";
import Badge from "@material-ui/core/Badge";
import IconButton from "@material-ui/core/IconButton";
import { i18n } from "../../translate/i18n";
import VisibilityIcon from "@material-ui/icons/Visibility";
import CheckIcon from "@material-ui/icons/CheckCircle";
import ReplayIcon from "@material-ui/icons/Replay";
import ClearOutlinedIcon from "@material-ui/icons/ClearOutlined";
import api from "../../services/api";
import { contactProfileNumber } from "../../utils/contactProfileNumber";
import { Dialog, DialogContent } from "@material-ui/core";

import MarkdownWrapper from "../MarkdownWrapper";
import { Tooltip } from "@material-ui/core";
import { AuthContext } from "../../context/Auth/AuthContext";
import toastError from "../../errors/toastError";

import facebookIcon from "../../assets/facebook.png";
import insatagramIcon from "../../assets/instagram.png";
import whatsappIcon from "../../assets/whatsapp.png";
import { TicketsContext } from "../../context/Tickets/TicketsContext";
import { buildAcceptTicketPayload } from "../../utils/acceptTicketPayload";
import { getBackendUrl } from "../../config";
import ConnectionIcon from "../ConnectionIcon";

const useStyles = makeStyles((theme) => ({
    ticket: {
        position: "relative",
    },

    pendingTicket: {
        cursor: "unset",
    },

    noTicketsDiv: {
        display: "flex",
        height: "100px",
        margin: 40,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
    },

    noTicketsText: {
        textAlign: "center",
        color: "rgb(104, 121, 146)",
        fontSize: "14px",
        lineHeight: "1.4",
    },

    noTicketsTitle: {
        textAlign: "center",
        fontSize: "16px",
        fontWeight: "600",
        margin: "0px",
    },

    contactNameWrapper: {
        display: "flex",
        justifyContent: "space-between",
    },

    lastMessageTime: {
        position: "absolute",
        marginRight: 5,
        right: 20,
        bottom: 30,
    },

    closedBadge: {
        alignSelf: "center",
        justifySelf: "flex-end",
        marginRight: 32,
        marginLeft: "auto",
    },

    contactLastMessage: {
        paddingRight: 20,
    },

    newMessagesCount: {
        alignSelf: "center",
        marginRight: 8,
        marginLeft: "auto",
    },

    bottomButton: {
        top: "12px",
    },

    badgeStyle: {
        color: "white",
        backgroundColor: green[500],
    },

    acceptButton: {
        position: "absolute",
        left: "50%",
    },

    ticketQueueColor: {
        flex: "none",
        width: "8px",
        height: "100%",
        position: "absolute",
        top: "0%",
        left: "0%",
    },

    userTag: {
        position: "absolute",
        marginRight: 110,
        right: 20,
        bottom: 30,
        backgroundColor: theme.palette.background.default,
        color: theme.palette.primary.main,
        border: "1px solid #CCC",
        padding: 1,
        paddingLeft: 5,
        paddingRight: 5,
        borderRadius: 10,
        fontSize: "0.9em",
    },
    divTags: {
        position: "absolute",
        marginRight: 0,
        left: 0,
        bottom: 0,
        flexWrap: "wrap",
        display: "flex",
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "center",
    },
    tags: {
        color: "#FFF",
        border: "1px solid #CCC",
        padding: 0,
        paddingLeft: 5,
        paddingRight: 5,
        borderRadius: 0,
        fontSize: "0.6em",
        textAlign: "center",
    },
    divUser: {
        position: "absolute",
        marginRight: 0,
        left: 0,
        top: 0,
        flexWrap: "wrap",
        display: "flex",
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "center",
    },
    user: {
        color: "#eee",
        border: "1px solid #CCC",
        padding: 0,
        paddingLeft: 5,
        paddingRight: 5,
        borderRadius: 0,
        fontSize: "0.6em",
        textAlign: "center",
    },

    tagsWrapper: {
        zIndex: 500,
    },

    badge: {
        backgroundColor: "#44b700",
        color: "#44b700",
        boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
        "&::after": {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            animation: "$ripple 1.2s infinite ease-in-out",
            border: "1px solid currentColor",
            content: '""',
        },
    },
    "@keyframes ripple": {
        "0%": {
            transform: "scale(.8)",
            opacity: 1,
        },
        "100%": {
            transform: "scale(2.4)",
            opacity: 0,
        },
    },

    // Estilos para o modal da imagem
    imageModal: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    imageModalContent: {
        outline: "none",
        maxWidth: "90vw",
        maxHeight: "90vh",
    },
    expandedImage: {
        width: "100%",
        height: "auto",
        maxWidth: "500px",
        borderRadius: theme.spacing(1),
    },
    clickableAvatar: {
        cursor: "pointer",
        "&:hover": {
            opacity: 0.8,
        },
    }
}));

const SmallAvatar = withStyles((theme) => ({
    root: {
        width: 22,
        height: 22,
        border: `2px solid ${theme.palette.background.paper}`,
    },
}))(Avatar);

const getAvatarChannel = (channel) => {
    if (channel === "facebook") {
        return facebookIcon;
    }

    if (channel === "whatsapp") {
        return whatsappIcon;
    }

    if (channel === "whatsappapi") {
        return whatsappIcon;
    }

    if (channel === "instagram") {
        return insatagramIcon;
    }

    if (channel === "sms") {
        return whatsappIcon;
    }

    if (
        channel === "telegram" ||
        channel === "telegram_oficial" ||
        channel === "linkedin"
    ) {
        return null;
    }
};

const renderChannelBadge = (channel) => {
    const ch = String(channel || "").toLowerCase();
    if (ch === "telegram" || ch === "telegram_oficial" || ch === "linkedin") {
        return (
            <SmallAvatar>
                <ConnectionIcon connectionType={ch} width={14} height={14} />
            </SmallAvatar>
        );
    }
    const src = getAvatarChannel(channel);
    if (!src) return null;
    return <SmallAvatar alt={channel} src={src} />;
};

const TicketListItem = ({ ticket }) => {
    const classes = useStyles();
    const history = useHistory();
    const [loading, setLoading] = useState(false);
    const { ticketId } = useParams();
    const isMounted = useRef(true);
    const { user } = useContext(AuthContext);
    const { setCurrentTicket, setTabOpen } = useContext(TicketsContext);
    const [imageModalOpen, setImageModalOpen] = useState(false); // Estado para o modal da imagem
    const backendUrl = getBackendUrl();
    const [avatarSrc, setAvatarSrc] = useState("");

    const resolveImageUrl = (url) => {
        if (!url || typeof url !== "string") return "";
        const u = url.trim();
        if (/^(data:|blob:|https?:\/\/)/i.test(u)) return u;
        if (u.startsWith("/")) return `${backendUrl}${u}`;
        return `${backendUrl}/public/${u}`;
    };

    useEffect(() => {
        const initial = resolveImageUrl(ticket?.contact?.urlPicture || ticket?.contact?.profilePicUrl);
        setAvatarSrc(initial);
        if ((!(ticket?.contact?.urlPicture || ticket?.contact?.profilePicUrl) || ticket?.contact?.urlPicture === "") && ticket?.contact?.number) {
            const num = contactProfileNumber(ticket.channel, ticket.contact.number);
            api.get(`/contacts/profile/${encodeURIComponent(num)}`, {
                params: {
                    channel: ticket.channel,
                    whatsappId: ticket.whatsappId
                }
            }).then(({ data }) => {
                if (data?.urlPicture || data?.profilePicUrl) {
                    const candidate = data?.urlPicture || data?.profilePicUrl;
                    setAvatarSrc(resolveImageUrl(candidate));
                }
            }).catch(() => {});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ticket?.contact?.urlPicture, ticket?.contact?.profilePicUrl, ticket?.contact?.number, ticket?.channel]);

    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Função para abrir modal da imagem
    const handleImageClick = (e) => {
        e.stopPropagation(); // Prevenir que o clique no avatar selecione o ticket
        if (ticket?.contact?.urlPicture) {
            setImageModalOpen(true);
        }
    };

    // Função para fechar modal da imagem
    const handleImageModalClose = () => {
        setImageModalOpen(false);
    };

    function getRatingIcon(rate) {
        let icon = "";
        if (rate === 1) {
            icon = "😡";
        } else if (rate === 2) {
            icon = "😠";
        } else if (rate === 3) {
            icon = "😐";
        } else if (rate === 4) {
            icon = "😃";
        } else if (rate === 5) {
            icon = "😍";
        }

        return icon;
    }


    const handleAcepptTicket = async (ticket) => {
        setLoading(true);
        try {
            await api.put(
                `/tickets/${ticket.id}`,
                buildAcceptTicketPayload(ticket, user?.id)
            );
        } catch (err) {
            setLoading(false);
            toastError(err);
        }
        if (isMounted.current) {
            setLoading(false);
        }
        history.push(`/tickets/${ticket.uuid}`);
    };

    const handleAcepptTicketBot = async (ticket) => {
        setLoading(true);
        try {
            await api.put(
                `/tickets/${ticket.id}`,
                buildAcceptTicketPayload(ticket, user?.id)
            );
        } catch (err) {
            setLoading(false);
            toastError(err);
        }
        if (isMounted.current) {
            setLoading(false);
        }
        history.push(`/tickets/${ticket.uuid}`);
    };

    const handleReopenTicket = async (ticket) => {
        setLoading(true);
        try {
            await api.put(`/tickets/${ticket.id}`, {
                status: "open",
                userId: user?.id,
            });
        } catch (err) {
            setLoading(false);
            toastError(err);
        }
        if (isMounted.current) {
            setLoading(false);
        }
        history.push(`/tickets/${ticket.uuid}`);
    };

    const handleViewTicket = async (ticket) => {
        setLoading(true);
        try {
            await api.put(`/tickets/${ticket.id}`, {
                status: "pending",
            });
        } catch (err) {
            setLoading(false);
            toastError(err);
        }
        if (isMounted.current) {
            setLoading(false);
        }
        history.push(`/tickets/${ticket.uuid}`);
    };

    const handleSelectTicket = (ticket) => {
        const code = uuidv4();
        const { id, uuid } = ticket;
        setTabOpen(ticket.status)
        setCurrentTicket({ id, uuid, code });
    };

    const handleClosedTicket = async (ticket) => {
        setLoading(true);
        try {
            await api.put(`/tickets/${ticket.id}`, {
                status: "closed",
            });
        } catch (err) {
            setLoading(false);
            toastError(err);
        }
        if (isMounted.current) {
            setLoading(false);
        }
    };

    const renderUserName = (name) => {
        let str = name.replace(emojiRegex(), "").trim();

        const firstName = str.split(" ")[0];

        return firstName;
    };

    return (
        <React.Fragment key={ticket.id}>
            <ListItem
                dense
                button
                onClick={(e) => {
                    handleSelectTicket(ticket)
                }}
                selected={ticketId && +ticketId === ticket.id}
                className={clsx(classes.ticket, {
                    [classes.pendingTicket]: ticket.status === "pending",
                })}
            >
                <Tooltip
                    arrow
                    placement="right"
                    title={ticket.queue?.name || "Sem departamento"}
                >
                    <span
                        style={{
                            backgroundColor: ticket.queue?.color || "#7C7C7C",
                        }}
                        className={classes.ticketQueueColor}
                    ></span>
                </Tooltip>
                <ListItemAvatar>
                    <Badge
                        overlap="circular"
                        anchorOrigin={{
                            vertical: "bottom",
                            horizontal: "right",
                        }}
                        badgeContent={renderChannelBadge(ticket?.channel)}
                    >
                        <Avatar
                            alt={ticket?.contact?.name}
                            src={avatarSrc || resolveImageUrl(ticket?.contact?.urlPicture || ticket?.contact?.profilePicUrl)}
                            className={classes.clickableAvatar}
                            onClick={handleImageClick}
                            onError={(e) => {
                                (async () => {
                                    e.target.onerror = null;
                                    try {
                                        if (ticket?.contact?.number) {
                                            const num = contactProfileNumber(
                                              ticket.channel,
                                              ticket.contact.number
                                            );
                                            const resp = await api.get(
                                              `/contacts/profile/${encodeURIComponent(num)}`,
                                              {
                                                params: {
                                                    channel: ticket.channel,
                                                    whatsappId: ticket.whatsappId
                                                }
                                            });
                                            const url = resp?.data?.urlPicture || resp?.data?.profilePicUrl;
                                            if (url) {
                                                const finalUrl = resolveImageUrl(url);
                                                setAvatarSrc(finalUrl);
                                                e.target.src = finalUrl;
                                                return;
                                            }
                                        }
                                    } catch (_) { }
                                    e.target.src = `${backendUrl}/public/app/noimage.png`;
                                })();
                            }}
                        />
                    </Badge>
                </ListItemAvatar>
                <ListItemText
                    disableTypography
                    primary={
                        <span className={classes.contactNameWrapper}>
                            <Typography
                                noWrap
                                component="span"
                                variant="body2"
                                color="textPrimary"
                            >
                                {ticket.contact.name}
                            </Typography>

                            {/* {ticket.lastMessage && ( */}
                            <Typography
                                className={classes.lastMessageTime}
                                component="span"
                                variant="body2"
                                color="textSecondary"
                            >
                                {isSameDay(
                                    parseISO(ticket.updatedAt),
                                    new Date()
                                ) ? (
                                    <>
                                        {format(
                                            parseISO(ticket.updatedAt),
                                            "HH:mm"
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {format(
                                            parseISO(ticket.updatedAt),
                                            "dd/MM/yyyy"
                                        )}
                                    </>
                                )}
                            </Typography>
                            {/* )} */}
                            {ticket.whatsappId && (
                                <div
                                    className={classes.userTag}
                                    title={i18n.t(
                                        "ticketsList.connectionTitle"
                                    )}
                                >
                                    {ticket.whatsapp?.name}
                                </div>
                            )}
                        </span>
                    }
                    secondary={
                        <span className={classes.contactNameWrapper}>
                            {ticket.status === "closed"
                                ? ticket?.userRating
                                    ? getRatingIcon(ticket?.userRating?.rate)
                                    : null
                                : null}
                            <Typography
                                className={classes.contactLastMessage}
                                noWrap
                                component="span"
                                variant="body2"
                                color="textSecondary"
                            >
                                {ticket.lastMessage ? (
                                    <MarkdownWrapper>
                                        {ticket.lastMessage}
                                    </MarkdownWrapper>
                                ) : (
                                    <br />
                                )}
                            </Typography>

                            <Badge
                                overlap="rectangular"
                                className={classes.newMessagesCount}
                                badgeContent={ticket.unreadMessages}
                                classes={{
                                    badge: classes.badgeStyle,
                                }}
                            />
                        </span>
                    }
                />
                {ticket.status === "pending" && (
                    <IconButton
                        className={classes.bottomButton}
                        color="primary"
                        loading={loading.toString()}
                        onClick={(e) =>
                            ticket.isBot
                                ? handleAcepptTicketBot(ticket)
                                : handleAcepptTicket(ticket)
                        }
                    >
                        <CheckIcon />
                    </IconButton>
                )}
                {/* {ticket.status === "pending" && (
                    <IconButton
                        className={classes.bottomButton}
                        color="primary"
                        onClick={(e) => handleViewTicket(ticket)}
                    >
                        <VisibilityIcon />
                    </IconButton>
                )} */}
                <div className={classes.divTags}>
                    {ticket.isGroup && (
                        <div className={classes.tagsWrapper}>
                            <div
                                key={ticket.id}
                                className={classes.tags}
                                // title={ticket.isGroup}
                                style={{
                                    backgroundColor: "#7C7C7C",
                                }}
                            >
                                Grupo
                            </div>
                        </div>
                    )}
                    {ticket.user?.id &&
                        user.profile.toUpperCase() === "ADMIN" && (
                            <div className={classes.tagsWrapper}>
                                <div
                                    key={ticket.user.id}
                                    className={classes.tags}
                                    title={renderUserName(ticket.user.name)}
                                    style={{
                                        backgroundColor:
                                            ticket.user.color === "" ||
                                                !ticket.user.color
                                                ? "#7C7C7C"
                                                : ticket.user.color,
                                    }}
                                >
                                    {renderUserName(ticket.user.name)}
                                </div>
                            </div>
                        )}
                    {ticket.tags?.length > 0 && (
                        <>
                            <div className={classes.tagsWrapper}>
                                <div
                                    key={ticket.tags[0].id}
                                    className={classes.tags}
                                    title={ticket.tags[0].name}
                                    style={{
                                        backgroundColor: ticket.tags[0].color,
                                    }}
                                >
                                    {ticket.tags[0].name}
                                </div>
                            </div>
                            {ticket.tags.length > 1 && (
                                <div
                                    key={ticket.tags[1].id}
                                    className={classes.tags}
                                    title={ticket.tags[1].name}
                                    style={{
                                        backgroundColor: ticket.tags[1].color,
                                    }}
                                >
                                    +{ticket.tags.length - 1}
                                </div>
                            )}
                        </>
                    )}
                    {/* {ticket?.contact?.contactWallets && ticket.contact.contactWallets.length > 0 && (
                        <div className={classes.tagsWrapper}>
                            <div
                                className={classes.tags}
                                title={`Carteira: ${ticket.contact.contactWallets[0].wallet?.name || 'N/A'}`}
                                style={{
                                    backgroundColor: "#FF6B35",
                                }}
                            >
                                📋 {ticket.contact.contactWallets[0].wallet?.name || 'N/A'}
                            </div>
                        </div>
                    )} */}
                </div>

                {(ticket.status === "pending" && (user.showDashboard === "enabled" || user.profile === "admin")) && (
                    <IconButton
                        className={classes.bottomButton}
                        color="primary"
                        onClick={(e) => handleClosedTicket(ticket)}
                    >
                        <ClearOutlinedIcon />
                    </IconButton>
                )}
                {ticket.status === "open" && (
                    <IconButton
                        className={classes.bottomButton}
                        color="primary"
                        onClick={(e) => handleViewTicket(ticket)}
                    >
                        <ReplayIcon />
                    </IconButton>
                )}
                {ticket.status === "open" && (
                    <IconButton
                        className={classes.bottomButton}
                        color="primary"
                        onClick={(e) => handleClosedTicket(ticket)}
                    >
                        <ClearOutlinedIcon />
                    </IconButton>
                )}
                {ticket.status === "closed" && (
                    <IconButton
                        className={classes.bottomButton}
                        color="primary"
                        onClick={(e) => handleReopenTicket(ticket)}
                    >
                        <ReplayIcon />
                    </IconButton>
                )}
                {ticket.status === "closed" && (
                    <IconButton
                        className={classes.bottomButton}
                        color="primary"
                    ></IconButton>
                )}
            </ListItem>
            <Divider variant="inset" component="li" />

            {/* Modal da Imagem */}
            <Dialog
                open={imageModalOpen}
                onClose={handleImageModalClose}
                className={classes.imageModal}
                maxWidth="md"
                fullWidth
            >
                <DialogContent className={classes.imageModalContent}>
                    <img 
                        src={ticket?.contact?.urlPicture} 
                        alt={ticket?.contact?.name || "Foto do contato"}
                        className={classes.expandedImage}
                    />
                </DialogContent>
            </Dialog>
        </React.Fragment>
    );
};

export default TicketListItem;
