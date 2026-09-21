/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, {useState, useEffect, useContext, useRef} from "react";
import qs from 'query-string'

import * as Yup from "yup";
import {useHistory} from "react-router-dom";
import {Link as RouterLink} from "react-router-dom";
import {toast} from "react-toastify";
import {Formik, Form, Field} from "formik";

import Avatar from "@material-ui/core/Avatar";
import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import TextField from "@material-ui/core/TextField";
import Link from "@material-ui/core/Link";
import Grid from "@material-ui/core/Grid";
import Box from "@material-ui/core/Box";
import LockOutlinedIcon from "@material-ui/icons/LockOutlined";
import Typography from "@material-ui/core/Typography";
import {makeStyles, useTheme} from "@material-ui/core/styles";
import Container from "@material-ui/core/Container";
import usePlans from '../../hooks/usePlans';
import {i18n} from "../../translate/i18n";
import {FormControl} from "@material-ui/core";
import {InputLabel, MenuItem, Select} from "@material-ui/core";
import CircularProgress from "@material-ui/core/CircularProgress";
import {Helmet} from "react-helmet";

import {openApi} from "../../services/api";
import toastError from "../../errors/toastError";
import useSettings from "../../hooks/useSettings";
import ColorModeContext from "../../layout/themeContext";
import {getBackendUrl} from "../../config";
import clsx from "clsx";

const useStyles = makeStyles(theme => {
    const {mode} = theme;
    return ({
        root: {
            width: "100vw",
            height: "100vh",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0",
            boxSizing: "border-box",
            overflow: "auto",
            position: "relative",
            backgroundColor: theme.palette.background ? theme.palette.background.default : (theme.palette.type === "light" ? "#f5f5f5" : "#303030"),
            backgroundImage: "none",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center center",

            [theme.breakpoints.down("sm")]: {
                flexDirection: "column",
            },
        },
        containerSignup: {
            padding: "16px",
            width: "calc(100% - 32px)",
            zIndex: 10,
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            position: "absolute",
            maxWidth: "420px",
            margin: "0 auto",

            [theme.breakpoints.down("sm")]: {
                width: "calc(100% - 40px)",
                maxWidth: "90%",
            },

            [theme.breakpoints.down("xs")]: {
                width: "calc(100% - 32px)",
                maxWidth: "85%",
            },
        },
        paper: {
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: `
        0 20px 40px rgba(0, 0, 0, 0.1),
        0 1px 0 rgba(255, 255, 255, 0.2) inset,
        0 0 0 1px rgba(255, 255, 255, 0.1)
      `,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "30px 25px",
            borderRadius: "20px",
            maxWidth: "420px",
            width: "100%",
            margin: "0 auto",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            animation: "$slideInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
            position: "relative",
            boxSizing: "border-box",

            [theme.breakpoints.down("sm")]: {
                animation: "$slideInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                borderRadius: "16px",
                padding: "25px 20px",
                boxSizing: "border-box",
                width: "100%",
            },

            [theme.breakpoints.down("xs")]: {
                padding: "20px 15px",
                borderRadius: "14px",
                boxShadow: `0 15px 30px rgba(0, 0, 0, 0.12)`,
                boxSizing: "border-box",
                width: "100%",
            },
        },
        avatar: {
            margin: theme.spacing(1),
            backgroundColor: theme.palette.primary.main,
        },
        form: {
            width: "100%",
            marginTop: theme.spacing(3),
        },
        submit: {
            margin: theme.spacing(3, 0, 2),
            background: mode === "light"
                ? `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
                : `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            color: "white",
            borderRadius: "12px",
            padding: "12px 0",
            fontSize: "16px",
            fontWeight: 600,
            textTransform: "none",
            boxShadow: `0 4px 12px ${theme.palette.primary.main}40`,
            border: "none",
            transition: "all 0.3s ease",
            "&:hover": {
                background: mode === "light"
                    ? `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.dark})`
                    : `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.dark})`,
                transform: "translateY(-2px)",
                boxShadow: `0 6px 20px ${theme.palette.primary.main}66`,
            },
            "&:active": {
                transform: "translateY(0)",
            },
        },
        "@keyframes slideInUp": {
            from: {
                opacity: 0,
                transform: "translateY(30px)",
            },
            to: {
                opacity: 1,
                transform: "translateY(0)",
            },
        },
    })
});

const UserSchema = Yup.object().shape({
    name: Yup.string()
        .min(2, "Too Short!")
        .max(50, "Too Long!")
        .required("Required"),
    companyName: Yup.string()
        .min(2, "Too Short!")
        .max(50, "Too Long!")
        .required("Required"),
    document: Yup.string()
        .test('document-format', 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos', function (value) {
            if (!value) return false;
            const numbers = value.replace(/\D/g, '');
            return numbers.length === 11 || numbers.length === 14;
        })
        .required("CPF ou CNPJ é obrigatório"),
    password: Yup.string().min(5, "Too Short!").max(50, "Too Long!"),
    email: Yup.string().email("Invalid email").required("Required"),
    phone: Yup.string().required("Required"),
});

const SignUp = () => {
    const classes = useStyles();
    const theme = useTheme();
    const history = useHistory();
    const colorMode = useContext(ColorModeContext);
    const {appLogoFavicon, appName, mode} = colorMode;
    const {getPlanList} = usePlans()
    const [plans, setPlans] = useState([])
    const [loading, setLoading] = useState(false);
    const [validatingCnpj, setValidatingCnpj] = useState(false);
    const [lastValidatedDocument, setLastValidatedDocument] = useState("");
    const {getPublicSetting} = useSettings();

    const [backgroundLight, setBackgroundLight] = useState("");
    const [backgroundDark, setBackgroundDark] = useState("");

    let companyId = null
    const params = qs.parse(window.location.search)
    if (params.companyId !== undefined) {
        companyId = params.companyId
    }

    const initialState = {name: "", email: "", password: "", phone: "", companyId, companyName: "", document: "", planId: ""};

    const [user] = useState(initialState);

    useEffect(() => {
        getPublicSetting("userCreation")
            .then((data) => {
                if (data === "disabled") {
                    toast.error(i18n.t("signup.toasts.disabled"));
                    history.push("/login");
                }
            })
            .catch((error) => {
                console.log("Error reading setting", error);
            });

        getPublicSetting("appLogoBackgroundLight", companyId)
            .then((bgLight) => {
                if (bgLight) {
                    const backendUrl = getBackendUrl();
                    const fullUrl = backendUrl + "/public/" + bgLight;
                    console.log("Background light URL:", fullUrl);
                    setBackgroundLight(fullUrl);
                } else {
                    setBackgroundLight("");
                }
            })
            .catch((err) => {
                console.error("Erro ao carregar imagem de fundo clara:", err);
                setBackgroundLight("");
            });

        getPublicSetting("appLogoBackgroundDark", companyId)
            .then((bgDark) => {
                if (bgDark) {
                    const backendUrl = getBackendUrl();
                    const fullUrl = backendUrl + "/public/" + bgDark;
                    console.log("Background dark URL:", fullUrl);
                    setBackgroundDark(fullUrl);
                } else {
                    setBackgroundDark("");
                }
            })
            .catch((err) => {
                console.error("Erro ao carregar imagem de fundo escura:", err);
                setBackgroundDark("");
            });
    }, [history, companyId]);

    useEffect(() => {
        setLoading(true);
        const fetchData = async () => {
            const planList = await getPlanList({listPublic: "false"});

            setPlans(planList);
            setLoading(false);
        }
        fetchData();
    }, []);

    const validateCpf = (cpf) => {
        const cleanCpf = cpf.replace(/\D/g, '');

        if (cleanCpf.length !== 11) return false;

        if (/^(\d)\1{10}$/.test(cleanCpf)) return false;

        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cleanCpf.charAt(i)) * (10 - i);
        }
        let remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cleanCpf.charAt(9))) return false;

        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cleanCpf.charAt(i)) * (11 - i);
        }
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cleanCpf.charAt(10))) return false;

        return true;
    };

    const formatCpf = (value) => {
        const numbers = value.replace(/\D/g, '');
        const limitedNumbers = numbers.slice(0, 11);

        if (limitedNumbers.length <= 3) return limitedNumbers;
        if (limitedNumbers.length <= 6) return `${limitedNumbers.slice(0, 3)}.${limitedNumbers.slice(3)}`;
        if (limitedNumbers.length <= 9) return `${limitedNumbers.slice(0, 3)}.${limitedNumbers.slice(3, 6)}.${limitedNumbers.slice(6)}`;
        return `${limitedNumbers.slice(0, 3)}.${limitedNumbers.slice(3, 6)}.${limitedNumbers.slice(6, 9)}-${limitedNumbers.slice(9)}`;
    };

    const formatCnpj = (value) => {
        const numbers = value.replace(/\D/g, '');
        const limitedNumbers = numbers.slice(0, 14);

        if (limitedNumbers.length <= 2) return limitedNumbers;
        if (limitedNumbers.length <= 5) return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2)}`;
        if (limitedNumbers.length <= 8) return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 5)}.${limitedNumbers.slice(5)}`;
        if (limitedNumbers.length <= 12) return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 5)}.${limitedNumbers.slice(5, 8)}/${limitedNumbers.slice(8)}`;
        return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 5)}.${limitedNumbers.slice(5, 8)}/${limitedNumbers.slice(8, 12)}-${limitedNumbers.slice(12)}`;
    };

    const detectDocumentType = (value) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 11) return 'cpf';
        return 'cnpj';
    };

    const formatDocument = (value) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 11) {
            return formatCpf(value);
        } else {
            return formatCnpj(value);
        }
    };

    const validateDocument = async (document, setFieldValue) => {
        const cleanDocument = document.replace(/\D/g, '');

        if (lastValidatedDocument === cleanDocument) {
            return true;
        }

        const documentType = detectDocumentType(document);

        if (documentType === 'cpf') {
            if (validateCpf(document)) {
                setLastValidatedDocument(cleanDocument);
                toast.success("CPF válido!");
                return true;
            } else {
                setLastValidatedDocument(cleanDocument);
                toast.error("CPF inválido!");
                return false;
            }
        } else {
            if (cleanDocument.length !== 14) return false;

            setValidatingCnpj(true);
            try {
                const response = await openApi.post("/auth/validate-cnpj", {cnpj: cleanDocument});
                const data = response.data;
                setValidatingCnpj(false);

                if (data.valid && data.data.nome) {
                    if (data.data.tipo === 'cnpj') {
                        setFieldValue('companyName', data.data.nome);
                        toast.success("CNPJ válido! Nome da empresa preenchido automaticamente.");
                    } else {
                        toast.success("CPF válido!");
                    }
                    setLastValidatedDocument(cleanDocument);
                    return true;
                } else {
                    setLastValidatedDocument(cleanDocument);
                    toast.error("Documento inválido ou não encontrado na Receita Federal");
                    return false;
                }
            } catch (error) {
                setValidatingCnpj(false);
                console.error("Erro ao validar documento:", error);
                toast.error("Erro ao validar documento. Tente novamente.");
                setLastValidatedDocument(cleanDocument);
                return false;
            }
        }
    };

    const handleSignUp = async values => {
        try {
            await openApi.post("/auth/signup", values);
            toast.success(i18n.t("signup.toasts.success"));
            history.push("/login");
        } catch (err) {
            toastError(err);
        }
    };

    let finalBackground;

    const hasValidLightBg = backgroundLight && backgroundLight.trim() !== '';
    const hasValidDarkBg = backgroundDark && backgroundDark.trim() !== '';

    if (mode === "light") {
        if (hasValidLightBg) {
            finalBackground = `url(${backgroundLight})`;
        } else {
            finalBackground = theme.palette.background ? theme.palette.background.default : "#f5f5f5";
        }
    } else {
        if (hasValidDarkBg) {
            finalBackground = `url(${backgroundDark})`;
        } else {
            finalBackground = theme.palette.background ? theme.palette.background.default : "#303030";
        }
    }

    return (
        <React.Fragment>
            <Helmet>
                <title>OlaChat Pro - Cadastre-se</title>
                <link rel="icon" href="/favicon.png" />
            </Helmet>

            <div
                className={classes.root}
                style={{
                    backgroundImage: typeof finalBackground === "string" && finalBackground.includes("url(")
                        ? finalBackground
                        : "none"
                }}
            >
                <Container
                    component="main"
                    maxWidth={false}
                    className={classes.containerSignup}
                    style={{
                        zIndex: 10,
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        boxSizing: "border-box",
                        margin: "0 auto"
                    }}
                >
                    <CssBaseline/>
                    <div className={classes.paper}>
                        <Avatar className={classes.avatar}>
                            <LockOutlinedIcon/>
                        </Avatar>
                        <Typography component="h1" variant="h5">
                            {i18n.t("signup.title")}
                        </Typography>
                        <Formik
                            initialValues={user}
                            enableReinitialize={true}
                            validationSchema={UserSchema}
                            onSubmit={(values, actions) => {
                                setTimeout(() => {
                                    handleSignUp(values);
                                    actions.setSubmitting(false);
                                }, 400);
                            }}
                        >
                            {({touched, errors, isSubmitting, setFieldValue}) => (
                                <Form className={classes.form}>
                                    <Grid container spacing={2}>

                                        <Grid item xs={12}>
                                            <Field
                                                as={TextField}
                                                variant="outlined"
                                                fullWidth
                                                id="document"
                                                label="CPF ou CNPJ"
                                                name="document"
                                                error={touched.document && Boolean(errors.document)}
                                                helperText={touched.document && errors.document || "Digite CPF (11 dígitos) ou CNPJ (14 dígitos)"}
                                                autoComplete="document"
                                                inputProps={{
                                                    maxLength: 18,
                                                    style: {textTransform: 'none'}
                                                }}
                                                InputProps={{
                                                    endAdornment: validatingCnpj && (
                                                        <CircularProgress size={20}/>
                                                    ),
                                                }}
                                                autoFocus
                                                onChange={(e) => {
                                                    let value = e.target.value;

                                                    const numbers = value.replace(/\D/g, '');

                                                    if (lastValidatedDocument && lastValidatedDocument !== numbers) {
                                                        setLastValidatedDocument("");
                                                    }

                                                    const formattedValue = formatDocument(value);
                                                    setFieldValue('document', formattedValue);

                                                    if (numbers.length === 11) {
                                                        validateDocument(formattedValue, setFieldValue);
                                                    } else if (numbers.length === 14) {
                                                        validateDocument(formattedValue, setFieldValue);
                                                    }
                                                }}
                                            />
                                        </Grid>

                                        <Grid item xs={12}>
                                            <Field
                                                as={TextField}
                                                variant="outlined"
                                                fullWidth
                                                id="companyName"
                                                label={i18n.t("signup.form.company")}
                                                error={touched.companyName && Boolean(errors.companyName)}
                                                helperText={touched.companyName && errors.companyName}
                                                name="companyName"
                                                autoComplete="companyName"
                                            />
                                        </Grid>

                                        <Grid item xs={12}>
                                            <Field
                                                as={TextField}
                                                autoComplete="name"
                                                name="name"
                                                error={touched.name && Boolean(errors.name)}
                                                helperText={touched.name && errors.name}
                                                variant="outlined"
                                                fullWidth
                                                id="name"
                                                label={i18n.t("signup.form.name")}
                                            />
                                        </Grid>

                                        <Grid item xs={12}>
                                            <Field
                                                as={TextField}
                                                variant="outlined"
                                                fullWidth
                                                id="email"
                                                label={i18n.t("signup.form.email")}
                                                name="email"
                                                error={touched.email && Boolean(errors.email)}
                                                helperText={touched.email && errors.email}
                                                autoComplete="email"
                                                inputProps={{style: {textTransform: 'lowercase'}}}
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Field
                                                as={TextField}
                                                variant="outlined"
                                                fullWidth
                                                name="password"
                                                error={touched.password && Boolean(errors.password)}
                                                helperText={touched.password && errors.password}
                                                label={i18n.t("signup.form.password")}
                                                type="password"
                                                id="password"
                                                autoComplete="current-password"
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Field
                                                as={TextField}
                                                variant="outlined"
                                                fullWidth
                                                id="phone"
                                                label={i18n.t("signup.form.phone")}
                                                name="phone"
                                                autoComplete="phone"
                                            />
                                        </Grid>

                                        <Grid item xs={12}>
                                            <InputLabel htmlFor="plan-selection">Plano</InputLabel>
                                            <Field
                                                as={Select}
                                                variant="outlined"
                                                fullWidth
                                                id="plan-selection"
                                                label="Plano"
                                                name="planId"
                                                required
                                            >
                                                {plans.map((plan, key) => (
                                                    <MenuItem key={key} value={plan.id}>
                                                        {plan.name} - Atendentes: {plan.users} - WhatsApp: {plan.connections} - Filas: {plan.queues} - R$ {plan.amount}
                                                    </MenuItem>
                                                ))}
                                            </Field>
                                        </Grid>

                                    </Grid>
                                    <Button
                                        type="submit"
                                        fullWidth
                                        variant="contained"
                                        color="primary"
                                        className={classes.submit}
                                        disabled={validatingCnpj}
                                    >
                                        {i18n.t("signup.buttons.submit")}
                                    </Button>
                                    <Grid container>
                                        <Grid item>
                                            <Link
                                                href="#"
                                                variant="body2"
                                                component={RouterLink}
                                                to="/login"
                                            >
                                                {i18n.t("signup.buttons.login")}
                                            </Link>
                                        </Grid>
                                    </Grid>
                                </Form>
                            )}
                        </Formik>
                    </div>
                    <Box mt={5}>{/* <Copyright /> */}</Box>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default SignUp;
