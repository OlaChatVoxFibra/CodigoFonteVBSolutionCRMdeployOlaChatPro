/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from "@material-ui/core";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import { VISUAL_IDENTITY_EMAIL_ALLOWLIST } from "../../constants/visualIdentity";

/**
 * admin@admin.com: habilita/desabilita por empresa a edição manual de identidade visual (cores/logo próprios).
 */
export default function ManualVisualIdentityAdminModal({ classes }) {
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [toggleValue, setToggleValue] = useState(false);
  const selectedCompany = companies.find(
    (x) => String(x.id) === String(selectedId)
  );
  const hasIndependentVisualIdentity = (company) => {
    if (!company) return false;
    const email = String(company.email || "").toLowerCase().trim();
    const byAllowList = VISUAL_IDENTITY_EMAIL_ALLOWLIST.includes(email);
    const byManualFlag = Boolean(company.allowOrgManualVisualIdentity);
    const byWhiteLabelDomain = Boolean(String(company.whiteLabelHostDomain || "").trim());
    const byWhiteLabelMeta =
      Boolean(company?.signupMetadata?.whiteLabel) ||
      String(company?.signupMetadata?.signupSource || "") === "whitelabel";
    return byAllowList || byManualFlag || byWhiteLabelDomain || byWhiteLabelMeta;
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    api
      .get("/companies/list")
      .then(({ data }) => {
        if (!cancelled) setCompanies(Array.isArray(data) ? data : []);
      })
      .catch((err) => toastError(err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!selectedId) {
      setToggleValue(false);
      return;
    }
    const c = companies.find((x) => String(x.id) === String(selectedId));
    setToggleValue(Boolean(c?.allowOrgManualVisualIdentity));
  }, [selectedId, companies]);

  const handleSave = async () => {
    if (!selectedId) {
      toast.error("Selecione uma conta organização.");
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/companies/${selectedId}/manual-visual-identity`, {
        allowOrgManualVisualIdentity: toggleValue,
      });
      setCompanies((prev) =>
        prev.map((c) =>
          String(c.id) === String(selectedId)
            ? { ...c, allowOrgManualVisualIdentity: toggleValue }
            : c
        )
      );
      toast.success(
        toggleValue
          ? "Identidade manual habilitada para a organização."
          : "Identidade manual desabilitada; a organização segue o tema da plataforma."
      );
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Box className={classes.fieldShell}>
        <Typography className={classes.sectionTitle} component="h3" style={{ marginBottom: 8 }}>
          Identidade visual por assinatura
        </Typography>
        <Typography className={classes.fieldLegendText} style={{ marginBottom: 12 }}>
          Permite que uma empresa da lista altere cores e logos apenas da própria organização (sem afetar outras).
          O tema padrão da plataforma continua definido na empresa principal.
        </Typography>
        <Button variant="outlined" color="primary" size="small" onClick={() => setOpen(true)}>
          Gerenciar por organização
        </Button>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Identidade visual manual por organização</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
            Selecione a assinatura e habilite ou desabilite a personalização de marca (cores, logos) só para ela.
          </Typography>
          {selectedCompany ? (
            <Box mb={1.5}>
              <Typography variant="caption" color="textSecondary">
                Organização selecionada: <strong>{selectedCompany.name || `Empresa #${selectedCompany.id}`}</strong>{" "}
                {hasIndependentVisualIdentity(selectedCompany)
                  ? "já possui Identidade Visual Independente (não afeta outras contas)."
                  : "seguindo o tema padrão da plataforma."}
              </Typography>
            </Box>
          ) : null}
          <TextField
            select
            fullWidth
            variant="outlined"
            size="small"
            label="Organização"
            value={selectedId}
            disabled={loading}
            onChange={(e) => setSelectedId(e.target.value)}
            style={{ marginBottom: 16 }}
          >
            <MenuItem value="">
              <em>Selecione…</em>
            </MenuItem>
            {companies.map((c) => (
              <MenuItem key={c.id} value={String(c.id)}>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  width="100%"
                  gridGap={8}
                >
                  <span>{c.name || `Empresa #${c.id}`} (id {c.id})</span>
                  {hasIndependentVisualIdentity(c) ? (
                    <Chip
                      size="small"
                      color="primary"
                      label="Já possui"
                      style={{ height: 22 }}
                    />
                  ) : null}
                </Box>
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={
              <Switch
                color="primary"
                checked={toggleValue}
                onChange={(e) => setToggleValue(e.target.checked)}
                disabled={!selectedId || loading}
              />
            }
            label="Permitir identidade visual manual nesta organização"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="default">
            Fechar
          </Button>
          <Button
            onClick={handleSave}
            color="primary"
            variant="contained"
            disabled={!selectedId || saving || loading}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
