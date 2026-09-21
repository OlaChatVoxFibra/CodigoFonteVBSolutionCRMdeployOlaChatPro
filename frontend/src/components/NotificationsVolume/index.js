/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useRef } from "react";

import Popover from "@material-ui/core/Popover";
import IconButton from "@material-ui/core/IconButton";
import List from "@material-ui/core/List";
import { makeStyles } from "@material-ui/core/styles";
import VolumeUpIcon from "@material-ui/icons/VolumeUp";
import VolumeDownIcon from "@material-ui/icons/VolumeDown";

import { Grid, Slider } from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
    tabContainer: {
        padding: theme.spacing(2),
        minWidth: 250,
    },
    popoverPaper: {
        width: "100%",
        maxWidth: 350,
        marginLeft: theme.spacing(2),
        marginRight: theme.spacing(1),
        [theme.breakpoints.down("sm")]: {
            maxWidth: 270,
        },
    },
    noShadow: {
        boxShadow: "none !important",
    },
    icons: {
        color: "#fff",
    },
    customBadge: {
        backgroundColor: "#f44336",
        color: "#fff",
    },
    volumeSlider: {
        color: theme.palette.primary.main,
        height: 6,
        '& .MuiSlider-track': {
            border: 'none',
            backgroundColor: theme.palette.primary.main,
            height: 6,
        },
        '& .MuiSlider-thumb': {
            height: 16,
            width: 16,
            backgroundColor: '#fff',
            border: '2px solid currentColor',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
                boxShadow: '0 3px 8px rgba(0,0,0,0.15)',
                height: 18,
                width: 18,
            },
            '&:before': {
                display: 'none',
            },
        },
        '& .MuiSlider-rail': {
            color: theme.palette.grey[300],
            opacity: 1,
            height: 6,
        },
    },
    volumeContainer: {
        alignItems: 'center',
        display: 'flex',
        gap: theme.spacing(2),
    },
    volumeIcon: {
        color: theme.palette.grey[600],
        fontSize: '1.25rem',
    },
    sliderContainer: {
        flex: 1,
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),
    },
}));

const NotificationsVolume = ({ volume, setVolume }) => {
    const classes = useStyles();

    const anchorEl = useRef();
    const [isOpen, setIsOpen] = useState(false);

    const handleClick = () => {
        setIsOpen((prevState) => !prevState);
    };

    const handleClickAway = () => {
        setIsOpen(false);
    };

    const handleVolumeChange = (event, value) => {
        setVolume(value);
        localStorage.setItem("volume", value);
    };

    return (
        <>
            <IconButton
                className={classes.icons}
                onClick={handleClick}
                ref={anchorEl}
                aria-label="Open Notifications"
                // color="inherit"
                // color="secondary"
            >
                <VolumeUpIcon color="inherit" />
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
                    <div className={classes.volumeContainer}>
                        <VolumeDownIcon className={classes.volumeIcon} />
                        <div className={classes.sliderContainer}>
                            <Slider
                                value={Number(volume)}
                                className={classes.volumeSlider}
                                aria-labelledby="volume-slider"
                                step={0.1}
                                min={0}
                                max={1}
                                onChange={handleVolumeChange}
                            />
                        </div>
                        <VolumeUpIcon className={classes.volumeIcon} />
                    </div>
                </List>
            </Popover>
        </>
    );
};

export default NotificationsVolume;