/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet";
import Container from "@material-ui/core/Container";
import CssBaseline from "@material-ui/core/CssBaseline";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import { makeStyles } from "@material-ui/core/styles";
import logoVB from "../../assets/olachat-logo-dark.png";
import { openApi } from "../../services/api";
import { toast } from "react-toastify";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100vw",
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundImage: [
      "radial-gradient(60% 60% at 65% 25%, rgba(255,255,255,0.03) 0%, transparent 70%)",
      "linear-gradient(180deg, #000000 0%, #081E3F 60%, #0B3E8C 100%)",
    ].join(", "),
    backgroundColor: "#081E3F"
  },
  paper: {
    backgroundColor: "rgba(128, 128, 128, 0.1)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "28px 24px",
    borderRadius: "16px",
    maxWidth: 420,
    width: "100%",
    color: "#ffffff",
    border: "1px solid rgba(255, 255, 255, 0.2)",
  },
  modalLogo: {
    width: 180,
    height: "auto",
    marginBottom: 8
  },
  textField: {
    "& .MuiOutlinedInput-root": {
      borderRadius: 12,
      backgroundColor: "rgba(255, 255, 255, 0.8)",
      "& fieldset": { borderColor: "rgba(59, 130, 246, 0.2)" },
      "&:hover fieldset": { borderColor: "rgba(59, 130, 246, 0.4)" },
      "&.Mui-focused fieldset": { borderColor: "#3b82f6", borderWidth: 2 }
    }
  },
  submit: {
    margin: "24px 0 0",
    background: "#131B2D",
    color: "white",
    borderRadius: 12,
    padding: "12px 0",
    fontSize: 16,
    fontWeight: 600,
    textTransform: "none",
    "&:hover": { background: "#0F1628" }
  }
}));

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

const ResetPassword = () => {
  const classes = useStyles();
  const history = useHistory();
  const query = useQuery();
  const token = query.get("token") || "";

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.password || form.password.length < 6) {
      toast.warn("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.warn("As senhas não coincidem.");
      return;
    }
    setSubmitting(true);
    try {
      await openApi.post("/auth/reset-password", {
        token,
        password: form.password,
        confirmPassword: form.confirmPassword
      });
      toast.success("Senha redefinida com sucesso. Faça login com a nova senha.");
      history.push("/login");
    } catch (err) {
      toastError(err || "Link inválido ou expirado. Solicite um novo e-mail.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Redefinir Senha - OlaChat Pro</title>
      </Helmet>
      <div className={classes.root}>
        <Container component="main" maxWidth={false} style={{ maxWidth: 420 }}>
          <CssBaseline />
          <div className={classes.paper}>
            <img src={logoVB} alt="VBsolution" className={classes.modalLogo} />
            <form onSubmit={onSubmit} style={{ width: "100%" }}>
              <TextField
                className={classes.textField}
                variant="outlined"
                margin="normal"
                required
                fullWidth
                name="password"
                type="password"
                label="Nova Senha"
                value={form.password}
                onChange={onChange}
              />
              <TextField
                className={classes.textField}
                variant="outlined"
                margin="normal"
                required
                fullWidth
                name="confirmPassword"
                type="password"
                label="Confirme sua Nova Senha"
                value={form.confirmPassword}
                onChange={onChange}
              />
              <Button
                type="submit"
                fullWidth
                disabled={submitting}
                variant="contained"
                color="primary"
                className={classes.submit}
              >
                Salvar
              </Button>
            </form>
          </div>
        </Container>
      </div>
    </>
  );
};

export default ResetPassword;

