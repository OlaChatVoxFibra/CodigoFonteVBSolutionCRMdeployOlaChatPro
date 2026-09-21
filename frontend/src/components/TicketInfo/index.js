/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState } from "react";
import {
    Avatar,
    Box,
    Dialog,
    DialogContent,
    Typography,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { getBackendUrl } from "../../config";
import PersonOutlineRounded from "@mui/icons-material/PersonOutlineRounded";
import AssignmentIndOutlined from "@mui/icons-material/AssignmentIndOutlined";
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import AccessTimeOutlined from "@mui/icons-material/AccessTimeOutlined";

const useStyles = makeStyles((theme) => ({
    root: {
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        padding: theme.spacing(0.25, 0),
        background: "transparent",
        border: "none",
        boxShadow: "none",
    },
    row: {
        display: "flex",
        alignItems: "center",
        gap: theme.spacing(1.25),
        cursor: "pointer",
        minHeight: 48,
    },
    avatar: {
        width: 40,
        height: 40,
    },
    title: {
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        fontWeight: 500,
        fontSize: "0.95rem",
        letterSpacing: "-0.02em",
        color: theme.palette.text.primary,
        lineHeight: 1.25,
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
    },
    metaRow: {
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: theme.spacing(1),
        marginTop: 2,
    },
    metaChip: {
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: "0.72rem",
        fontWeight: 500,
        color: theme.palette.type === "dark" ? "rgba(255,255,255,0.55)" : "#64748b",
        "& svg": { fontSize: 15, opacity: 0.85 },
    },
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
    metaChipWarn: {
        color: "#c2410c",
    },
    metaChipDanger: {
        color: "#b91c1c",
    },
    metaChipOk: {
        color: "#15803d",
    },
    clickableAvatar: {
        cursor: "pointer",
        "&:hover": {
            opacity: 0.88,
        },
    },
}));

const TicketInfo = ({ contact, ticket, onClick }) => {
    const classes = useStyles();
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const backendUrl = getBackendUrl();

    const renderMetaSessionChip = () => {
        const session = ticket?.metaWhatsAppSession;
        if (ticket?.channel !== "whatsapp_oficial" || !session) return null;

        if (!session.hasInbound) {
            return (
                <span className={`${classes.metaChip} ${classes.metaChipWarn}`}>
                    <AccessTimeOutlined />
                    Primeiro contato — use template
                </span>
            );
        }
        if (session.within24h) {
            const hrs = session.hoursRemaining;
            const urgent = hrs != null && hrs <= 4;
            return (
                <span
                    className={`${classes.metaChip} ${
                        urgent ? classes.metaChipWarn : classes.metaChipOk
                    }`}
                >
                    <AccessTimeOutlined />
                    Janela 24h · {hrs != null ? `${hrs}h` : "ativa"}
                </span>
            );
        }
        return (
            <span className={`${classes.metaChip} ${classes.metaChipDanger}`}>
                <AccessTimeOutlined />
                Fora da janela — template obrigatório
            </span>
        );
    };
    const resolveImageUrl = (url) => {
        if (!url || typeof url !== "string") return "";
        const u = url.trim();
        if (/^(data:|blob:|https?:\/\/)/i.test(u)) return u;
        if (u.startsWith("/")) return `${backendUrl}${u}`;
        return `${backendUrl}/public/${u}`;
    };

    const handleImageClick = (e) => {
        e.stopPropagation();
        if (contact?.urlPicture || contact?.profilePicUrl) {
            setImageModalOpen(true);
        }
    };

    const handleImageModalClose = () => {
        setImageModalOpen(false);
    };

    const displayName = contact?.name || "(sem contato)";
    const titleText =
        `${displayName.length > 42 ? `${displayName.slice(0, 42)}…` : displayName}` +
        (ticket?.id != null ? ` · #${ticket.id}` : "");

    const walletName =
        contact?.contactWallets && contact.contactWallets.length > 0
            ? contact.contactWallets[0].wallet?.name || "N/A"
            : null;

    return (
        <React.Fragment>
            <Box
                className={classes.root}
                onClick={onClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onClick?.(e);
                }}
            >
                <Box className={classes.row}>
                    <Avatar
                        src={resolveImageUrl(contact?.urlPicture || contact?.profilePicUrl)}
                        alt="contact_image"
                        className={`${classes.avatar} ${classes.clickableAvatar}`}
                        onClick={handleImageClick}
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `${backendUrl}/public/app/noimage.png`;
                        }}
                    />
                    <Box flex={1} minWidth={0}>
                        <Typography className={classes.title} noWrap title={titleText}>
                            {titleText}
                        </Typography>
                        <Box className={classes.metaRow}>
                            {ticket?.user && (
                                <span className={classes.metaChip}>
                                    <AssignmentIndOutlined />
                                    {ticket.user.name}
                                </span>
                            )}
                            {walletName && (
                                <span className={classes.metaChip}>
                                    <AccountBalanceWalletOutlined />
                                    {walletName}
                                </span>
                            )}
                            {!ticket?.user && !walletName && (
                                <span className={classes.metaChip}>
                                    <PersonOutlineRounded />
                                    Contato
                                </span>
                            )}
                            {renderMetaSessionChip()}
                        </Box>
                    </Box>
                </Box>
            </Box>

            <Dialog
                open={imageModalOpen}
                onClose={handleImageModalClose}
                className={classes.imageModal}
                maxWidth="md"
                fullWidth
            >
                <DialogContent className={classes.imageModalContent}>
                    <img
                        src={resolveImageUrl(contact?.urlPicture || contact?.profilePicUrl)}
                        alt={contact?.name || "Foto do contato"}
                        className={classes.expandedImage}
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `${backendUrl}/public/app/noimage.png`;
                        }}
                    />
                </DialogContent>
            </Dialog>
        </React.Fragment>
    );
};

export default TicketInfo;
