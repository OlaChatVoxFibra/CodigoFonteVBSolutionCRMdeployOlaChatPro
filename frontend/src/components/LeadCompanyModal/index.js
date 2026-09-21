/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  Paper,
  CircularProgress,
  Avatar
} from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import { useTheme } from "@material-ui/core/styles";
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
} from "@material-ui/icons";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { dateInputToStartISO, toDateInputValue } from "../../utils/deadlineDates";

const initials = (name) => {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
};

function FieldCardSection({ icon: Icon, title, accent, isDark, children }) {
  return (
    <Box style={{ marginBottom: 20 }}>
      <Box style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        {Icon && <Icon style={{ fontSize: 18, color: accent }} />}
        <Typography variant="subtitle2" style={{
          fontWeight: 600, fontSize: 13, color: accent,
          textTransform: "uppercase", letterSpacing: "0.5px",
        }}>
          {title}
        </Typography>
      </Box>
      <Paper elevation={0} style={{
        background: isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB",
        border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #E5E7EB",
        borderRadius: 12, padding: 16,
      }}>
        {children}
      </Paper>
    </Box>
  );
}

export default function LeadCompanyModal({ open, initialValues, onClose, onSave }) {
  const theme = useTheme();
  const isDark = theme.palette.type === "dark";
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    sector: "",
    document: "",
    website: "",
    contactId: null,
    responsibleId: null,
    date: ""
  });

  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().slice(0, 10);
      const merged = { ...(initialValues || {}) };
      const entryDate =
        toDateInputValue(merged.date) ||
        toDateInputValue(merged.dateStart) ||
        today;
      setForm({
        name: "",
        description: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        sector: "",
        document: "",
        website: "",
        contactId: null,
        responsibleId: null,
        date: entryDate,
        ...merged,
        date: entryDate
      });
      setSelectedContact(null);
      setSelectedUser(null);
    }
  }, [initialValues, open]);

  useEffect(() => {
    const load = async () => {
      try {
        const [contactsRes, usersRes] = await Promise.all([
          api.get("/contacts/list"),
          api.get("/users")
        ]);
        const contactList = contactsRes.data || [];
        const userList = usersRes.data?.users || usersRes.data || [];
        setContacts(contactList);
        setUsers(userList);
        if (initialValues?.contactId) {
          const c = contactList.find(x => x.id === initialValues.contactId);
          if (c) setSelectedContact(c);
        }
        if (initialValues?.responsibleId || initialValues?.userId) {
          const uid = initialValues.responsibleId || initialValues.userId;
          const u = userList.find(x => x.id === uid);
          if (u) setSelectedUser(u);
        }
      } catch (err) {
        toastError(err);
      }
    };
    if (open) load();
  }, [open, initialValues]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const entryDate = form.date || new Date().toISOString().slice(0, 10);
      const { dateStart, dateEnd, userId, ...rest } = form;
      await onSave({
        ...rest,
        date: dateInputToStartISO(entryDate),
        contactId: selectedContact ? selectedContact.id : form.contactId || null,
        responsibleId: selectedUser ? selectedUser.id : form.responsibleId || null,
      });
    } finally {
      setLoading(false);
    }
  };

  const isEdit = Boolean(initialValues?.id);
  const accent = isDark ? "#93C5FD" : "#2563EB";

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        style: {
          width: 700,
          maxWidth: "100%",
          padding: 0,
          borderRadius: 16,
          marginTop: 16,
          marginBottom: 16,
          height: "calc(100% - 32px)",
          marginRight: 16,
          overflow: "hidden",
          backgroundColor: isDark ? theme.palette.background.paper : "#fff",
        }
      }}
      ModalProps={{ keepMounted: true }}
    >
      {/* Header */}
      <Box style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px",
        borderBottom: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #E5E7EB",
        background: isDark ? "rgba(255,255,255,0.02)" : "#FAFBFC",
      }}>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        <Typography variant="subtitle1" style={{ fontWeight: 500, fontSize: 14, color: theme.palette.text.secondary }}>
          {isEdit ? "Editar Empresa" : "Nova Empresa"}
        </Typography>
        <div style={{ width: 30 }} />
      </Box>

      {/* Avatar / Name */}
      <Box style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <Avatar style={{
          width: 56, height: 56, fontSize: 22, fontWeight: 600,
          background: isDark ? "rgba(96,165,250,0.2)" : "#DBEAFE",
          color: accent,
          border: isDark ? "2px solid rgba(96,165,250,0.3)" : "2px solid #BFDBFE",
        }}>
          {initials(form.name)}
        </Avatar>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <TextField
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Nome da empresa"
            fullWidth
            InputProps={{
              disableUnderline: true,
              style: {
                fontSize: 20, fontWeight: 600, lineHeight: 1.3,
                color: theme.palette.text.primary,
                padding: 0,
              }
            }}
          />
          <TextField
            name="sector"
            value={form.sector}
            onChange={handleChange}
            placeholder="Setor (ex: Tecnologia, Marketing...)"
            fullWidth
            InputProps={{
              disableUnderline: true,
              style: {
                fontSize: 13,
                color: theme.palette.text.secondary,
                padding: 0, marginTop: 2,
              }
            }}
          />
        </Box>
      </Box>

      {/* Content */}
      <Box style={{ flex: 1, overflowY: "auto", padding: "12px 24px 24px" }}>

        <FieldCardSection icon={PersonIcon} title="Dados Pessoais" accent={accent} isDark={isDark}>
          <Box style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <TextField
              label="Telefone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              variant="outlined"
              fullWidth
              size="small"
            />
            <TextField
              label="Email"
              name="email"
              value={form.email}
              onChange={handleChange}
              variant="outlined"
              fullWidth
              size="small"
            />
            <TextField
              label="CNPJ/CPF"
              name="document"
              value={form.document}
              onChange={handleChange}
              variant="outlined"
              fullWidth
              size="small"
            />
            <Autocomplete
              options={users}
              getOptionLabel={(opt) => opt.name || opt.fullName || opt.email || ""}
              value={selectedUser}
              onChange={(_, v) => setSelectedUser(v)}
              renderInput={(params) => (
                <TextField {...params} label="Responsável" variant="outlined" size="small" />
              )}
            />
          </Box>
        </FieldCardSection>

        <FieldCardSection icon={LocationIcon} title="Endereço" accent={accent} isDark={isDark}>
          <Box style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <TextField
              label="Endereço"
              name="address"
              value={form.address}
              onChange={handleChange}
              variant="outlined"
              fullWidth
              size="small"
              style={{ gridColumn: "1 / -1" }}
            />
            <TextField
              label="Cidade"
              name="city"
              value={form.city}
              onChange={handleChange}
              variant="outlined"
              fullWidth
              size="small"
            />
            <TextField
              label="Estado"
              name="state"
              value={form.state}
              onChange={handleChange}
              variant="outlined"
              fullWidth
              size="small"
            />
          </Box>
        </FieldCardSection>

        <FieldCardSection icon={BusinessIcon} title="Informações Adicionais" accent={accent} isDark={isDark}>
          <Box style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <TextField
              label="Website"
              name="website"
              value={form.website}
              onChange={handleChange}
              variant="outlined"
              fullWidth
              size="small"
            />
            <TextField
              label="Data de entrada"
              name="date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.date || ""}
              onChange={handleChange}
              variant="outlined"
              fullWidth
              size="small"
            />
            <TextField
              label="Descrição"
              name="description"
              value={form.description}
              onChange={handleChange}
              variant="outlined"
              fullWidth
              multiline
              rows={3}
              size="small"
              style={{ gridColumn: "1 / -1" }}
            />
          </Box>
        </FieldCardSection>

        <FieldCardSection icon={PersonIcon} title="Contato Vinculado" accent={accent} isDark={isDark}>
          <Autocomplete
            options={contacts}
            getOptionLabel={(opt) => opt.name || ""}
            value={selectedContact}
            onChange={(_, v) => setSelectedContact(v)}
            renderInput={(params) => (
              <TextField {...params} label="Contato" variant="outlined" size="small" placeholder="Buscar contato..." />
            )}
          />
        </FieldCardSection>
      </Box>

      {/* Footer */}
      <Box style={{
        display: "flex", justifyContent: "flex-end", gap: 10,
        padding: "14px 24px",
        borderTop: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #E5E7EB",
        background: isDark ? "rgba(255,255,255,0.02)" : "#FAFBFC",
      }}>
        <Button
          onClick={onClose}
          disabled={loading}
          style={{
            textTransform: "none", borderRadius: 8, fontSize: 13,
            color: theme.palette.text.secondary,
          }}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading}
          style={{
            textTransform: "none", borderRadius: 8, fontSize: 13,
            background: isDark ? "#1e3a5f" : "#2563EB",
            color: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          }}
        >
          {loading ? <CircularProgress size={18} style={{ color: "#fff" }} /> : "Salvar"}
        </Button>
      </Box>
    </Drawer>
  );
}
