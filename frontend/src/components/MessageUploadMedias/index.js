/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
    Dialog,
    Typography,
    IconButton,
    Card,
    CardContent,
    Box,
    Divider,
    TextField
} from '@material-ui/core';
import { Cancel, NavigateBefore, NavigateNext, Send } from '@material-ui/icons';
import AudioModal from '../AudioModal';
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
    dialogPaper: {
        borderRadius: 10,
        overflow: 'hidden',
        width: '100%',
        maxWidth: 380,
        margin: theme.spacing(2),
    },
    card: {
        borderRadius: 10,
        boxShadow: 'none',
        backgroundColor: 'transparent',
    },
    mediaContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 200,
        maxHeight: '38vh',
        backgroundColor:
            theme.palette.type === 'dark'
                ? 'rgba(255,255,255,0.06)'
                : theme.palette.grey[100],
        position: 'relative',
        overflow: 'hidden',
    },
    mediaContent: {
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
    },
    fileName: {
        padding: theme.spacing(0.5, 1.5),
        backgroundColor: theme.palette.background.paper,
        textAlign: 'center',
        fontWeight: 500,
        fontSize: 11,
        color: theme.palette.text.secondary,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    captionInput: {
        padding: theme.spacing(1, 1.5, 0.5),
        '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: theme.palette.background.paper,
            fontSize: 13,
        },
        '& .MuiOutlinedInput-input': {
            padding: theme.spacing(1, 1.25),
        },
    },
    actions: {
        padding: theme.spacing(0.5, 1, 1),
        backgroundColor: theme.palette.background.paper,
        borderTop: `1px solid ${theme.palette.divider}`,
    },
    navigationButton: {
        padding: 6,
        color: theme.palette.text.secondary,
        '&:hover': {
            backgroundColor: theme.palette.action.hover,
        },
    },
    disabledButton: {
        padding: 6,
        color: theme.palette.action.disabled,
    },
    activeButton: {
        padding: 6,
        color: theme.palette.primary.main,
    },
    paginationText: {
        margin: theme.spacing(0, 0.5),
        color: theme.palette.text.secondary,
        fontSize: 12,
    },
}));

const MessageUploadMedias = ({ isOpen, files, onClose, onSend, onCancelSelection }) => {
    const classes = useStyles();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [captions, setCaptions] = useState(files.map(() => ''));
    const [componentMounted, setComponentMounted] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [firstTyping, setFirstTyping] = useState(false);

    useEffect(() => {
        setFirstTyping(true);
        setComponentMounted(true);
    }, []);

    const handleClose = () => {
        onClose();
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setFirstTyping(true);
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleNext = () => {
        if (currentIndex < files.length - 1) {
            setFirstTyping(true);
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handleTextFieldBlur = () => {
        setIsTyping(false);
    };

    const handleCaptionChange = (e) => {
        const value = e.target.value;
        setCaptions((prevCaptions) => {
            const updatedCaptions = [...prevCaptions];
            updatedCaptions[currentIndex] = value;
            return updatedCaptions;
        });
        if (firstTyping) {
            setIsTyping(true);
        }
    };

    const handleSend = () => {
        const selectedMedias = files.map((file, index) => ({
            file,
            caption: captions[index],
        }));
        onSend(selectedMedias);
        handleClose();
    };

    const renderFileContent = useMemo(() => {
        if (!componentMounted) {
            return null;
        }
        if (firstTyping) {
            const currentFile = files[currentIndex];
            
            if (currentFile.type.startsWith('image')) {
                return (
                    <>
                        <Box className={classes.mediaContainer}>
                            <img
                                alt={`Imagem ${currentIndex + 1}`}
                                src={URL.createObjectURL(currentFile)}
                                className={classes.mediaContent}
                            />
                        </Box>
                        <Typography variant="caption" className={classes.fileName} title={currentFile.name}>
                            {currentFile.name}
                        </Typography>
                    </>
                );
            } else if (currentFile.type.startsWith('video')) {
                return (
                    <>
                        <Box className={classes.mediaContainer}>
                            <video
                                src={URL.createObjectURL(currentFile)}
                                controls
                                volume={localStorage.getItem("volume")}
                                className={classes.mediaContent}
                            />
                        </Box>
                        <Typography variant="caption" className={classes.fileName} title={currentFile.name}>
                            {currentFile.name}
                        </Typography>
                    </>
                );
            } else if (currentFile.type.startsWith('audio')) {
                return (
                    <>
                        <Box className={classes.mediaContainer}>
                            <AudioModal url={URL.createObjectURL(currentFile)} />
                        </Box>
                        <Typography variant="caption" className={classes.fileName} title={currentFile.name}>
                            {currentFile.name}
                        </Typography>
                    </>
                );
            } else {
                // Tratamento para PDF e outros tipos de arquivo sem visualização específica
                return (
                    <>
                        <Box className={classes.mediaContainer}>
                            <CardContent>
                                <Typography variant="h6" color="textSecondary" align="center">
                                    Visualização não disponível
                                </Typography>
                                <Typography variant="body2" color="textSecondary" align="center">
                                    {currentFile.type}
                                </Typography>
                            </CardContent>
                        </Box>
                        <Typography variant="caption" className={classes.fileName} title={currentFile.name}>
                            {currentFile.name}
                        </Typography>
                    </>
                );
            }
        }
        return null;
    }, [currentIndex, firstTyping]);

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && event.shiftKey) {
            return;
        }
        switch (event.key) {
            case 'Escape':
                onCancelSelection();
                break;
            case 'Enter':
                handleSend();
                break;
            case 'ArrowRight':
                handleNext();
                break;
            case 'ArrowLeft':
                handlePrev();
                break;
            default:
                break;
        }
    };

    return (
        <Dialog
            open={isOpen}
            maxWidth={false}
            onClose={handleClose}
            classes={{ paper: classes.dialogPaper }}
        >
            <Card className={classes.card}>
                {renderFileContent}
                
                <Divider />
                
                <Box className={classes.captionInput}>
                    <TextField
                        fullWidth
                        size="small"
                        variant="outlined"
                        placeholder="Legenda (opcional)"
                        multiline
                        rows={1}
                        rowsMax={3}
                        value={captions[currentIndex]}
                        onChange={handleCaptionChange}
                        onBlur={handleTextFieldBlur}
                        autoFocus
                        onKeyDown={handleKeyDown}
                    />
                </Box>
                
                <Box className={classes.actions}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box display="flex" alignItems="center">
                            <IconButton 
                                onClick={handlePrev} 
                                disabled={currentIndex === 0}
                                className={currentIndex === 0 ? classes.disabledButton : classes.navigationButton}
                            >
                                <NavigateBefore />
                            </IconButton>
                            
                            <Typography variant="body2" className={classes.paginationText}>
                                {currentIndex + 1} / {files.length}
                            </Typography>
                            
                            <IconButton 
                                onClick={handleNext} 
                                disabled={currentIndex === files.length - 1}
                                className={currentIndex === files.length - 1 ? classes.disabledButton : classes.navigationButton}
                            >
                                <NavigateNext />
                            </IconButton>
                        </Box>
                        
                        <Box display="flex">
                            <IconButton onClick={onCancelSelection} className={classes.navigationButton}>
                                <Cancel />
                            </IconButton>
                            <IconButton onClick={handleSend} className={classes.activeButton}>
                                <Send />
                            </IconButton>
                        </Box>
                    </Box>
                </Box>
            </Card>
        </Dialog>
    );
};

export default MessageUploadMedias;