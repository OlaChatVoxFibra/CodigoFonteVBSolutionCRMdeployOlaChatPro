/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    InputAdornment,
    Typography,
    Box,
    Chip,
    Divider
} from "@material-ui/core";
import {
    Search as SearchIcon,
    Close as CloseIcon,
    AttachFile as AttachFileIcon
} from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import TableRowSkeleton from "../TableRowSkeleton";

const useStyles = makeStyles((theme) => ({
    dialog: {
        '& .MuiDialog-paper': {
            minHeight: '500px',
            maxHeight: '80vh',
            width: '100%',
            maxWidth: '600px',
            backgroundColor: theme.mode === "dark" ? theme.palette.background.paper : undefined,
            color: theme.mode === "dark" ? "#fff" : undefined
        }
    },
    searchField: {
        marginBottom: theme.spacing(2)
    },
    listContainer: {
        maxHeight: '400px',
        overflow: 'auto',
        '&::-webkit-scrollbar': {
            width: '8px',
        },
        '&::-webkit-scrollbar-track': {
            background: theme.mode === "dark" ? "rgba(255,255,255,0.04)" : '#f1f1f1',
        },
        '&::-webkit-scrollbar-thumb': {
            background: theme.mode === "dark" ? "rgba(255,255,255,0.4)" : '#888',
            borderRadius: '4px',
        },
    },
    listItem: {
        cursor: 'pointer',
        borderRadius: theme.spacing(1),
        marginBottom: theme.spacing(0.5),
        color: theme.mode === "dark" ? "#fff" : theme.palette.text.primary,
        '&:hover': {
            backgroundColor: theme.palette.action.hover,
        },
        '& .MuiTypography-root': {
            color: theme.mode === "dark" ? "#fff" : undefined,
        },
        '& .MuiChip-outlined': {
            color: theme.mode === "dark" ? "#fff" : undefined,
            borderColor: theme.mode === "dark" ? "rgba(255,255,255,0.45)" : undefined,
        },
        '& .MuiSvgIcon-root': {
            color: theme.mode === "dark" ? "#fff" : undefined,
        }
    },
    messagePreview: {
        display: '-webkit-box',
        '-webkit-line-clamp': 2,
        '-webkit-box-orient': 'vertical',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontSize: '0.875rem',
        color: theme.mode === "dark" ? "rgba(255,255,255,0.86)" : theme.palette.text.secondary,
        marginTop: theme.spacing(0.5)
    },
    shortcode: {
        fontWeight: 'bold',
        color: theme.mode === "dark" ? "#fff" : theme.palette.primary.main
    },
    mediaChip: {
        marginLeft: theme.spacing(1),
        height: '20px',
        fontSize: '0.75rem'
    },
    emptyState: {
        textAlign: 'center',
        padding: theme.spacing(4),
        color: theme.mode === "dark" ? "#fff" : theme.palette.text.secondary
    },
    loadingContainer: {
        padding: theme.spacing(2)
    }
}));

const QuickMessageModal = ({ open, onClose, onSelect, companyId, userId }) => {
    const classes = useStyles();
    const [quickMessages, setQuickMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchParam, setSearchParam] = useState("");
    const [filteredMessages, setFilteredMessages] = useState([]);

    // Buscar respostas rápidas
    useEffect(() => {
        if (open && companyId) {
            fetchQuickMessages();
        }
    }, [open, companyId, userId]);

    // Filtrar mensagens baseado na busca
    useEffect(() => {
        if (searchParam.trim() === "") {
            setFilteredMessages(quickMessages);
        } else {
            const filtered = quickMessages.filter(message =>
                message.shortcode.toLowerCase().includes(searchParam.toLowerCase()) ||
                message.message.toLowerCase().includes(searchParam.toLowerCase())
            );
            setFilteredMessages(filtered);
        }
    }, [searchParam, quickMessages]);

    const fetchQuickMessages = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/quick-messages/list", {
                params: {
                    companyId,
                    userId,
                    isOficial: "false",
                    status: "active"
                }
            });
            setQuickMessages(data || []);
        } catch (err) {
            console.error("Erro ao buscar respostas rápidas:", err);
            toastError(err);
            setQuickMessages([]);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSearchParam("");
        setQuickMessages([]);
        setFilteredMessages([]);
        onClose();
    };

    const handleSelectMessage = (message) => {
        onSelect(message);
        handleClose();
    };

    const handleSearchChange = (event) => {
        setSearchParam(event.target.value);
    };

    const renderMessageItem = (message) => {
        const hasMedia = message.mediaPath || message.mediaName;
        
        return (
            <ListItem
                key={message.id}
                className={classes.listItem}
                onClick={() => handleSelectMessage(message)}
            >
                <ListItemText
                    primary={
                        <Box display="flex" alignItems="center">
                            <Typography className={classes.shortcode}>
                                #{message.shortcode}
                            </Typography>
                            {hasMedia && (
                                <Chip
                                    icon={<AttachFileIcon />}
                                    label={i18n.t("quickMessages.hasMedia")}
                                    size="small"
                                    variant="outlined"
                                    className={classes.mediaChip}
                                />
                            )}
                            {message.geral && (
                                <Chip
                                    label={i18n.t("quickMessages.global")}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                    className={classes.mediaChip}
                                />
                            )}
                        </Box>
                    }
                    secondary={
                        message.message && (
                            <Typography className={classes.messagePreview}>
                                {message.message}
                            </Typography>
                        )
                    }
                />
            </ListItem>
        );
    };

    const renderContent = () => {
        if (loading) {
            return (
                <Box className={classes.loadingContainer}>
                    <TableRowSkeleton columns={1} />
                </Box>
            );
        }

        if (filteredMessages.length === 0) {
            return (
                <Box className={classes.emptyState}>
                    <Typography variant="body1">
                        {searchParam
                            ? i18n.t("quickMessages.noResultsFound")
                            : i18n.t("quickMessages.noQuickMessages")
                        }
                    </Typography>
                </Box>
            );
        }

        return (
            <List className={classes.listContainer}>
                {filteredMessages.map((message, index) => (
                    <React.Fragment key={message.id}>
                        {renderMessageItem(message)}
                        {index < filteredMessages.length - 1 && <Divider />}
                    </React.Fragment>
                ))}
            </List>
        );
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            className={classes.dialog}
            fullWidth
            maxWidth="sm"
        >
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                        {i18n.t("quickMessages.selectMessage")}
                    </Typography>
                    <IconButton onClick={handleClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent dividers>
                <TextField
                    fullWidth
                    placeholder={i18n.t("quickMessages.searchPlaceholder")}
                    value={searchParam}
                    onChange={handleSearchChange}
                    className={classes.searchField}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                />

                {renderContent()}
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose} color="secondary">
                    {i18n.t("quickMessages.buttons.cancel")}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default QuickMessageModal;