/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState } from "react";

import { makeStyles } from "@material-ui/core/styles";
import { CssBaseline, IconButton } from "@material-ui/core";
import Brightness4Icon from "@material-ui/icons/Brightness4";
import Brightness7Icon from "@material-ui/icons/Brightness7";

const useStyles = makeStyles((theme) => ({
    icons: {
        color: "#fff",
    },
    switch: {
        color: "#fff",
    },
    visible: {
        display: "none",
    },
    btnHeader: {
        color: "#fff",
    },
}));

const DarkMode = (props) => {
    const classes = useStyles();

    const [theme, setTheme] = useState("light");

    const themeToggle = () => {
        theme === "light" ? setTheme("dark") : setTheme("light");
    };

    const handleClick = () => {
        props.themeToggle();
        themeToggle();
    };

    return (
        <>
            {theme === "light" ? (
                <>
                    <CssBaseline />
                    <IconButton
                        className={classes.icons}
                        onClick={handleClick}
                        // ref={anchorEl}
                        aria-label="Dark Mode"
                        color="inherit"
                    >
                        <Brightness4Icon />
                    </IconButton>
                </>
            ) : (
                <>
                    <CssBaseline />
                    <IconButton
                        className={classes.icons}
                        onClick={handleClick}
                        // ref={anchorEl}
                        aria-label="Dark Mode"
                        color="inherit"
                    >
                        <Brightness7Icon />
                    </IconButton>
                </>
            )}
        </>
    );
};

export default DarkMode;
