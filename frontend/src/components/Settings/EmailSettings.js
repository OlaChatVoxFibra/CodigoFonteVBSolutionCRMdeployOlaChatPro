/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useState } from "react";
import { Grid, FormControl, TextField, InputLabel, Select, MenuItem, Button, FormHelperText, Paper, Typography } from "@material-ui/core";
import { toast } from "react-toastify";
import smtpService from "../../services/smtpService";

export default function EmailSettings() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [form, setForm] = useState({
    smtpHost: "",
    smtpPort: 587,
    smtpUsername: "",
    smtpPassword: "",
    smtpEncryption: "tls",
    isDefault: true
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  /** Evita enviar senha “fantasma” do autofill do navegador no Testar — só manda se o usuário editou o campo. */
  const [smtpPasswordDirty, setSmtpPasswordDirty] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await smtpService.list();
      const rows = res?.items || [];
      setItems(rows);
      const def = rows.find(r => r.isDefault) || rows[0];
      if (def) {
        setCurrentId(def.id);
        setForm({
          smtpHost: def.smtpHost || "",
          smtpPort: def.smtpPort || 587,
          smtpUsername: def.smtpUsername || "",
          smtpPassword: "",
          smtpEncryption: def.smtpEncryption || "tls",
          isDefault: true
        });
        setSmtpPasswordDirty(false);
      } else {
        setSmtpPasswordDirty(false);
      }
    } catch (e) {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const onChange = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const save = async () => {
    setSaving(true);
    try {
      // Não enviar senha vazia para não apagar a senha existente
      const payload = { ...form };
      if (!payload.smtpPassword) {
        delete payload.smtpPassword;
      }
      if (currentId) {
        await smtpService.update(currentId, payload);
      } else {
        const created = await smtpService.create(payload);
        setCurrentId(created?.id || null);
      }
      toast.success("SMTP salvo. Use Testar conexão para validar.");
      await load();
    } catch (err) {
      const data = err?.response?.data;
      const apiErr =
        (typeof data === "object" && data && (data.error || data.message)) ||
        (typeof data === "string" && data) ||
        null;
      const msg = apiErr ? String(apiErr) : "";
      if (msg) {
        toast.error(`Falha ao salvar: ${msg}`);
      } else if (err?.code === "ECONNABORTED") {
        toast.error("Falha ao salvar: tempo esgotado ao contatar a API. Tente de novo.");
      } else if (err?.message === "Network Error" || !err?.response) {
        toast.error(
          "Falha ao salvar: sem resposta da API. Confira se o backend está rodando e se " +
            "REACT_APP_BACKEND_URL no .env aponta para a porta correta (ex.: http://localhost:3000 com npm run dev)."
        );
      } else {
        toast.error(`Falha ao salvar: ${err?.message || "tente novamente"}`);
      }
    }
    setSaving(false);
  };

  const test = async () => {
    setTesting(true);
    try {
      const payload = {
        id: currentId || undefined,
        smtpHost: form.smtpHost,
        smtpPort: form.smtpPort,
        smtpUsername: form.smtpUsername,
        smtpEncryption: form.smtpEncryption
      };
      if (smtpPasswordDirty && form.smtpPassword) {
        payload.smtpPassword = form.smtpPassword;
      }
      const data = await smtpService.verifyConnection(payload);
      toast.success(data?.message || "Conexão SMTP verificada com sucesso.");
      if (data?.gmail465Fallback && data?.suggestedPort) {
        setForm(prev => ({
          ...prev,
          smtpPort: data.suggestedPort,
          smtpEncryption: data.suggestedEncryption || "ssl"
        }));
      }
    } catch (e) {
      const apiErr = e?.response?.data?.error;
      toast.error(apiErr ? `Verificação falhou: ${apiErr}` : "Falha na verificação SMTP.");
    }
    setTesting(false);
  };

  const remove = async (id) => {
    try {
      await smtpService.remove(id);
      toast.success("Removido");
      setCurrentId(null);
      setSmtpPasswordDirty(false);
      setForm({
        smtpHost: "",
        smtpPort: 587,
        smtpUsername: "",
        smtpPassword: "",
        smtpEncryption: "tls",
        isDefault: true
      });
      await load();
    } catch (e) {
      toast.error("Erro ao remover");
    }
  };

  return (
    <Paper variant="outlined" style={{ padding: 16 }}>
      <Typography variant="h6" gutterBottom>Configurações de Email (SMTP)</Typography>
      <Typography variant="subtitle1" gutterBottom>Servidor SMTP (Gmail ou outro)</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <TextField
              label="Servidor SMTP"
              value={form.smtpHost}
              onChange={(e) => onChange("smtpHost", e.target.value)}
              margin="dense"
              variant="outlined"
            />
          </FormControl>
        </Grid>
        <Grid item xs={12} md={2}>
          <FormControl fullWidth>
            <TextField
              label="Porta"
              value={form.smtpPort}
              onChange={(e) => onChange("smtpPort", Number(e.target.value))}
              type="number"
              margin="dense"
              variant="outlined"
            />
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <TextField
              label="Email/Usuário"
              value={form.smtpUsername}
              onChange={(e) => onChange("smtpUsername", e.target.value)}
              margin="dense"
              variant="outlined"
            />
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <TextField
              label="Senha/Token"
              value={form.smtpPassword}
              type="password"
              margin="dense"
              variant="outlined"
              autoComplete="new-password"
              inputProps={{
                readOnly: true,
                onFocus: (e) => {
                  e.target.removeAttribute("readonly");
                }
              }}
              onChange={(e) => {
                setSmtpPasswordDirty(true);
                onChange("smtpPassword", e.target.value);
              }}
            />
            <FormHelperText>
              Não exibimos a senha atual por segurança. Gmail: use senha de app. Se a conexão na 587 falhar no
              servidor, tente porta 465 com segurança SSL.
            </FormHelperText>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel id="encryption-label">Segurança</InputLabel>
            <Select
              labelId="encryption-label"
              value={form.smtpEncryption}
              onChange={(e) => onChange("smtpEncryption", e.target.value)}
              variant="outlined"
              margin="dense"
              label="Segurança"
            >
              <MenuItem value="ssl">SSL</MenuItem>
              <MenuItem value="tls">TLS</MenuItem>
              <MenuItem value="none">Nenhuma</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={9} />
        <Grid item xs={12} md={12} style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <Button disabled={saving || loading} color="primary" variant="contained" onClick={save}>
            Salvar
          </Button>
          <Button disabled={testing || loading} variant="outlined" onClick={test}>
            Testar Conexão
          </Button>
          <Button
            type="button"
            disabled={loading}
            variant="outlined"
            size="small"
            onClick={() => {
              setForm(prev => ({
                ...prev,
                smtpHost: "smtp.gmail.com",
                smtpPort: 465,
                smtpEncryption: "ssl"
              }));
              toast.info("Preenchido: Gmail em 465 + SSL (recomendado se 587 não conectar no servidor).");
            }}
          >
            Gmail 465 (SSL)
          </Button>
          <Button
            type="button"
            disabled={loading}
            variant="outlined"
            size="small"
            onClick={() => {
              setForm(prev => ({
                ...prev,
                smtpHost: "smtp.gmail.com",
                smtpPort: 587,
                smtpEncryption: "tls"
              }));
              toast.info("Preenchido: Gmail em 587 + TLS.");
            }}
          >
            Gmail 587 (TLS)
          </Button>
          {currentId && (
            <Button disabled={loading} variant="outlined" color="secondary" onClick={() => remove(currentId)}>
              Remover
            </Button>
          )}
        </Grid>
      </Grid>
    </Paper>
  );
}
