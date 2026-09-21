/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useState } from "react";
import {
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Grid,
  CircularProgress,
  Box,
} from "@material-ui/core";
import { toast } from "react-toastify";
import smtpService from "../../../services/smtpService";
import ConnectionSetupFluid from "../ConnectionSetupFluid";
import ConnectionSetupSection, {
  ConnectionSetupFormShell,
} from "../ConnectionSetupSection";

const EMPTY = {
  smtpHost: "",
  smtpPort: 587,
  smtpUsername: "",
  smtpPassword: "",
  smtpEncryption: "tls",
  isDefault: true,
};

export default function EmailSmtpSetupForm({
  smtpId,
  isEdit,
  onCancel,
  onSaved,
  hidePageHeader = false,
}) {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(Boolean(smtpId));
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [smtpPasswordDirty, setSmtpPasswordDirty] = useState(false);

  useEffect(() => {
    if (!smtpId) {
      setForm(EMPTY);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await smtpService.list();
        const row = (res?.items || []).find((r) => String(r.id) === String(smtpId));
        if (cancelled) return;
        if (row) {
          setForm({
            smtpHost: row.smtpHost || "",
            smtpPort: row.smtpPort || 587,
            smtpUsername: row.smtpUsername || "",
            smtpPassword: "",
            smtpEncryption: row.smtpEncryption || "tls",
            isDefault: row.isDefault !== false,
          });
        }
      } catch {
        if (!cancelled) toast.error("Não foi possível carregar o SMTP.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [smtpId]);

  const onChange = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.smtpPassword) delete payload.smtpPassword;
      if (smtpId) {
        await smtpService.update(smtpId, payload);
      } else {
        await smtpService.create(payload);
      }
      toast.success("SMTP salvo.");
      onSaved?.();
    } catch (err) {
      const data = err?.response?.data;
      const apiErr =
        (typeof data === "object" && data && (data.error || data.message)) ||
        (typeof data === "string" && data) ||
        err?.message ||
        "Falha ao salvar";
      toast.error(String(apiErr));
    }
    setSaving(false);
  };

  const test = async () => {
    setTesting(true);
    try {
      const payload = {
        id: smtpId || undefined,
        smtpHost: form.smtpHost,
        smtpPort: form.smtpPort,
        smtpUsername: form.smtpUsername,
        smtpEncryption: form.smtpEncryption,
      };
      if (smtpPasswordDirty && form.smtpPassword) {
        payload.smtpPassword = form.smtpPassword;
      }
      const data = await smtpService.verifyConnection(payload);
      toast.success(data?.message || "Conexão SMTP verificada.");
      if (data?.gmail465Fallback && data?.suggestedPort) {
        setForm((prev) => ({
          ...prev,
          smtpPort: data.suggestedPort,
          smtpEncryption: data.suggestedEncryption || "ssl",
        }));
      }
    } catch (e) {
      const apiErr = e?.response?.data?.error;
      toast.error(apiErr ? `Verificação falhou: ${apiErr}` : "Falha na verificação SMTP.");
    }
    setTesting(false);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <ConnectionSetupFluid
      fluid
      hidePageHeader={hidePageHeader}
      title={isEdit ? "Editar SMTP" : "Nova conexão — E-mail"}
      subtitle="Servidor SMTP (Gmail, Outlook ou outro) — igual às configurações de e-mail."
      footer={
        <>
          <Button onClick={onCancel} color="default">
            Voltar
          </Button>
          <Button
            onClick={save}
            color="primary"
            variant="contained"
            disableElevation
            disabled={saving}
          >
            Salvar
          </Button>
        </>
      }
    >
      <ConnectionSetupFormShell>
        <ConnectionSetupSection title="Servidor">
          <Grid container spacing={1}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Servidor SMTP"
                value={form.smtpHost}
                onChange={(e) => onChange("smtpHost", e.target.value)}
                fullWidth
                variant="outlined"
                size="small"
                margin="dense"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                label="Porta"
                value={form.smtpPort}
                onChange={(e) => onChange("smtpPort", Number(e.target.value))}
                type="number"
                fullWidth
                variant="outlined"
                size="small"
                margin="dense"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <FormControl fullWidth variant="outlined" size="small" margin="dense">
                <InputLabel id="enc-label">Segurança</InputLabel>
                <Select
                  labelId="enc-label"
                  value={form.smtpEncryption}
                  onChange={(e) => onChange("smtpEncryption", e.target.value)}
                  label="Segurança"
                >
                  <MenuItem value="ssl">SSL</MenuItem>
                  <MenuItem value="tls">TLS</MenuItem>
                  <MenuItem value="none">Nenhuma</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </ConnectionSetupSection>

        <ConnectionSetupSection title="Credenciais">
          <TextField
            label="E-mail / usuário"
            value={form.smtpUsername}
            onChange={(e) => onChange("smtpUsername", e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
            margin="dense"
          />
          <TextField
            label="Senha / token"
            value={form.smtpPassword}
            type="password"
            fullWidth
            variant="outlined"
            size="small"
            margin="dense"
            autoComplete="new-password"
            onChange={(e) => {
              setSmtpPasswordDirty(true);
              onChange("smtpPassword", e.target.value);
            }}
            helperText={
              isEdit
                ? "Deixe vazio para manter a senha atual. Gmail: use senha de app."
                : "Gmail: use senha de app."
            }
          />
        </ConnectionSetupSection>

        <Box display="flex" flexWrap="wrap" gap={1} mt={0.5}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setForm((p) => ({
                ...p,
                smtpHost: "smtp.gmail.com",
                smtpPort: 465,
                smtpEncryption: "ssl",
              }));
              toast.info("Gmail 465 + SSL");
            }}
          >
            Gmail 465
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setForm((p) => ({
                ...p,
                smtpHost: "smtp.gmail.com",
                smtpPort: 587,
                smtpEncryption: "tls",
              }));
              toast.info("Gmail 587 + TLS");
            }}
          >
            Gmail 587
          </Button>
        </Box>
      </ConnectionSetupFormShell>
    </ConnectionSetupFluid>
  );
}
