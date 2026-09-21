/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useContext, useMemo } from "react";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import {
  List as ListIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CalendarToday as CalendarIcon,
  Close as CloseIcon,
  Email as EmailIcon,
  Chat as ChatIcon,
  Phone as PhoneIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  ShoppingCart as ShoppingCartIcon,
} from "@material-ui/icons";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Grid,
  TextField,
  Popover,
  Button,
  Typography,
  Drawer,
  Box,
  Avatar,
  Collapse
} from "@material-ui/core";

import ActivitiesStyleLayout from "../../components/ActivitiesStyleLayout";
import BrainPreviewMini from "../../components/BrainPreviewMini";
import LeadCompanyModal from "../../components/LeadCompanyModal";
import ConnectionIcon from "../../components/ConnectionIcon";
import toastError from "../../errors/toastError";
import convertedLeadsService from "../../services/convertedLeadsService";
import Autocomplete from "@material-ui/lab/Autocomplete";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    height: "100%",
    overflow: "hidden",
  },
  container: {
    maxWidth: "100%",
    margin: 0,
    padding: theme.spacing(0.5),
    '& .MuiTable-root': {
      borderCollapse: 'separate',
      borderSpacing: '0 2px',
    },
    '& .MuiTableBody-root .MuiTableRow-root': {
      transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1), box-shadow 0.25s cubic-bezier(0.4,0,0.2,1), background-color 0.2s ease',
    },
    '& .MuiTableBody-root .MuiTableRow-root:hover': {
      backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(59,130,246,0.06)',
      transform: 'translateY(-2px)',
      boxShadow: theme.palette.type === 'dark'
        ? '0 8px 25px rgba(0,0,0,0.4)'
        : '0 8px 25px rgba(0,0,0,0.15)',
      zIndex: 2,
      position: 'relative',
    },
    '& .MuiTableCell-root': {
      borderBottom: theme.palette.type === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid #F0F2F5',
      padding: '10px 14px',
      fontSize: 13,
    },
    '& .MuiTableCell-head': {
      backgroundColor: theme.palette.type === 'dark'
        ? (theme.palette.dashboardCard || 'rgba(255,255,255,0.04)')
        : '#FAFBFC',
      fontWeight: 600,
      fontSize: '0.72rem',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      color: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.6)' : '#64748B',
      borderBottom: theme.palette.type === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
    },
  },
}));

function initials(name = "") {
  const parts = String(name).trim().split(" ");
  const i1 = parts[0]?.[0] || "";
  const i2 = parts.length > 1 ? parts[1][0] : "";
  return (i1 + i2).toUpperCase();
}

const getChannelFromLead = (lead) => {
  if (lead?.channel) return lead.channel;
  if (lead?.ticket?.channel) return lead.ticket.channel;
  if (lead?.contact?.channel) return lead.contact.channel;
  if (lead?.whatsapp?.channel) return lead.whatsapp.channel;
  const sector = String(lead?.sector || "").toLowerCase();
  if (sector.includes("whatsapp")) return "whatsapp";
  if (sector.includes("telegram")) return "telegram";
  if (sector.includes("instagram")) return "instagram";
  if (sector.includes("facebook")) return "facebook";
  if (sector.includes("email")) return "email";
  if (sector.includes("sms")) return "sms";
  const origin = String(lead?.origin || lead?.source || "").toLowerCase();
  if (origin.includes("whatsapp")) return "whatsapp";
  if (origin.includes("instagram")) return "instagram";
  if (origin.includes("facebook")) return "facebook";
  if (origin.includes("telegram")) return "telegram";
  if (origin.includes("email")) return "email";
  return "";
};

const ChannelBadge = ({ channel }) => {
  if (!channel) return null;
  if (channel === "email") {
    return <EmailIcon style={{ fontSize: 16, color: "#6B7280" }} />;
  }
  const known = ["whatsapp", "whatsapp_oficial", "instagram", "facebook", "telegram", "telegram_oficial", "sms"];
  if (known.includes(channel)) {
    return <ConnectionIcon connectionType={channel} width={16} height={16} />;
  }
  return <ChatIcon style={{ fontSize: 16, color: "#6B7280" }} />;
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return new Date(dateStr).toLocaleDateString();
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 30) return `há ${diffDays} dias`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return 'há 1 mês';
  if (diffMonths < 12) return `há ${diffMonths} meses`;
  const diffYears = Math.floor(diffDays / 365);
  if (diffYears === 1) return 'há 1 ano';
  return `há ${diffYears} anos`;
};

const CompanyDetailsDrawer = ({ open, onClose, lead, onEdit }) => {
  const theme = useTheme();
  const isDark = theme.palette.type === 'dark';
  const [activeTab, setActiveTab] = useState('info');
  const [activities, setActivities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [notes, setNotes] = useState('');
  const [loadingExtra, setLoadingExtra] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState('');
  const [expandedActivity, setExpandedActivity] = useState(null);
  const [expandedProject, setExpandedProject] = useState(null);

  const ACTIVE_TAB_COLOR = isDark ? '#9ca3af' : '#6B7280';

  useEffect(() => {
    if (!open || !lead?.id) return;
    let mounted = true;
    setLoadingExtra(true);
    setExpandedActivity(null);
    (async () => {
      try {
        const [actRes, projRes] = await Promise.allSettled([
          api.get('/activities', { params: { companyId: lead.id, pageNumber: 1 } }),
          api.get('/projects', { params: { companyId: lead.id } }),
        ]);
        if (mounted) {
          setActivities(actRes.status === 'fulfilled' ? (actRes.value?.data?.activities || []) : []);
          setProjects(projRes.status === 'fulfilled' ? (projRes.value?.data?.projects || projRes.value?.data || []) : []);
        }
      } catch {}
      if (mounted) setLoadingExtra(false);
    })();
    return () => { mounted = false; };
  }, [open, lead?.id]);

  useEffect(() => {
    if (!open || !lead) { setAvatarSrc(''); return; }
    const pic = lead?.contact?.urlPicture || lead?.contact?.profilePicUrl
      || lead?.ticket?.contact?.urlPicture || lead?.ticket?.contact?.profilePicUrl || '';
    setAvatarSrc(pic);
    if (!pic && (lead?.phone || lead?.contact?.number)) {
      const num = lead.phone || lead.contact?.number;
      api.get(`/contacts/profile/${encodeURIComponent(num)}`)
        .then(({ data }) => {
          const url = data?.urlPicture || data?.profilePicUrl;
          if (url) setAvatarSrc(url);
        })
        .catch(() => {});
    }
  }, [open, lead?.id, lead?.contact?.urlPicture, lead?.contact?.profilePicUrl, lead?.phone, lead?.contact?.number]);

  if (!lead) return null;

  const channel = getChannelFromLead(lead);

  const tabs = [
    { key: 'info', label: 'Informações' },
    { key: 'activities', label: 'Atividades' },
    { key: 'projects', label: 'Projetos' },
    { key: 'notes', label: 'Observações' },
  ];

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        style: {
          width: 700,
          maxWidth: '100%',
          padding: 0,
          borderRadius: 16,
          marginTop: 16,
          marginBottom: 16,
          height: 'calc(100% - 32px)',
          marginRight: 16,
          overflow: 'hidden',
          backgroundColor: isDark ? theme.palette.background.paper : '#fff',
        }
      }}
    >
      <Box style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px',
        borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E5E7EB',
        background: isDark ? 'rgba(255,255,255,0.02)' : '#FAFBFC',
      }}>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        <Typography variant="subtitle1" style={{ fontWeight: 500, fontSize: 14, color: theme.palette.text.secondary }}>
          Detalhes da Empresa
        </Typography>
        <IconButton size="small" onClick={() => onEdit && onEdit(lead)}><EditIcon color="primary" /></IconButton>
      </Box>

      <Box style={{
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Avatar
          src={avatarSrc || undefined}
          imgProps={{ onError: () => setAvatarSrc('') }}
          style={{
            width: 44, height: 44, fontSize: 18, fontWeight: 600,
            background: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6',
            color: isDark ? '#d1d5db' : '#4B5563',
            border: isDark ? '2px solid rgba(255,255,255,0.12)' : '2px solid #E5E7EB',
          }}
        >
          {initials(lead.name)}
        </Avatar>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" style={{
            fontWeight: 600, marginBottom: 2, fontSize: 16, lineHeight: 1.3,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {lead.name}
          </Typography>
          <Box style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {channel && <ChannelBadge channel={channel} />}
            <Typography variant="body2" style={{
              color: theme.palette.text.secondary, fontSize: 13,
            }}>
              {lead.sector || 'Sem setor definido'}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box style={{
        display: 'flex', gap: 0,
        padding: '0 20px',
        borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E5E7EB',
      }}>
        {tabs.map(t => (
          <Button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setExpandedActivity(null); }}
            style={{
              textTransform: 'none',
              borderRadius: 0,
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: activeTab === t.key ? 600 : 400,
              color: activeTab === t.key
                ? (isDark ? '#93C5FD' : '#1e3a8a')
                : theme.palette.text.secondary,
              background: 'transparent',
              minWidth: 'auto',
              transition: 'all 0.15s ease',
              borderBottom: activeTab === t.key ? '2px solid #1e3a8a' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}
          </Button>
        ))}
      </Box>

      <Box style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
        {activeTab === 'info' && (
          <>
            <Box style={{ marginBottom: 24 }}>
              <Box style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <PersonIcon style={{ fontSize: 15, color: isDark ? '#9ca3af' : '#6B7280' }} />
                <Typography variant="subtitle2" style={{
                  fontWeight: 600, fontSize: 11, color: isDark ? '#9ca3af' : '#6B7280',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                  Dados Pessoais
                </Typography>
              </Box>
              <Paper elevation={0} style={{
                background: isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB',
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E5E7EB',
                borderRadius: 12, padding: 16,
              }}>
                <Box style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[
                    { label: 'Nome', value: lead.name },
                    { label: 'Telefone', value: lead.phone || lead.contact?.number || '—' },
                    { label: 'Setor', value: lead.sector },
                    { label: 'Responsável', value: lead.responsible?.name || (lead.userId ? `ID: ${lead.userId}` : '—') },
                    { label: 'Email', value: lead.email },
                    { label: 'Cadastrado', value: timeAgo(lead.createdAt), extra: lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '' },
                  ].filter(f => f.value).map((field, idx) => (
                    <Box key={idx}>
                      <Typography variant="caption" style={{
                        color: theme.palette.text.secondary, fontSize: 11,
                        textTransform: 'uppercase', letterSpacing: '0.3px',
                      }}>
                        {field.label}
                      </Typography>
                      <Typography variant="body2" style={{ fontWeight: 500, marginTop: 2 }}>
                        {field.value}
                        {field.extra && (
                          <span style={{ fontSize: 11, color: theme.palette.text.secondary, marginLeft: 6 }}>
                            ({field.extra})
                          </span>
                        )}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Box>

            <Box style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Contato', value: lead.contact?.name },
                { label: 'CNPJ/CPF', value: lead.document || lead.cnpj },
                { label: 'Endereço', value: lead.address },
                { label: 'Cidade', value: lead.city },
                { label: 'Estado', value: lead.state },
                { label: 'Website', value: lead.website },
                { label: 'Data', value: lead.date ? new Date(lead.date).toLocaleDateString() : null },
                { label: 'Valor', value: lead.value ? `R$ ${Number(lead.value).toFixed(2)}` : null },
                { label: 'Status', value: lead.status },
              ].filter(f => f.value).map((field, idx) => (
                <Box key={idx}>
                  <Typography variant="caption" style={{
                    color: theme.palette.text.secondary, fontSize: 11,
                    textTransform: 'uppercase', letterSpacing: '0.3px',
                  }}>
                    {field.label}
                  </Typography>
                  <Typography variant="body2" style={{ fontWeight: 500, marginTop: 2 }}>{field.value}</Typography>
                </Box>
              ))}
            </Box>

            <Box style={{ marginBottom: 24 }}>
              <Box style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <ShoppingCartIcon style={{ fontSize: 15, color: isDark ? '#9ca3af' : '#6B7280' }} />
                <Typography variant="subtitle2" style={{
                  fontWeight: 600, fontSize: 11, color: isDark ? '#9ca3af' : '#6B7280',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                  Produtos e Serviços
                </Typography>
              </Box>
              {lead.products && lead.products.length > 0 ? (
                <Box style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {lead.products.map((prod, i) => (
                    <Paper key={i} elevation={0} style={{
                      padding: '10px 14px', borderRadius: 10,
                      background: isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB',
                      border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E5E7EB',
                    }}>
                      <Typography variant="body2" style={{ fontWeight: 500 }}>
                        {typeof prod === 'string' ? prod : prod.name || prod.title || 'Produto'}
                      </Typography>
                      {prod.description && (
                        <Typography variant="caption" color="textSecondary">{prod.description}</Typography>
                      )}
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Paper elevation={0} style={{
                  padding: '20px 14px', borderRadius: 10, textAlign: 'center',
                  background: isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB',
                  border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E5E7EB',
                }}>
                  <ShoppingCartIcon style={{ fontSize: 28, color: theme.palette.text.disabled, marginBottom: 4 }} />
                  <Typography variant="body2" style={{ color: theme.palette.text.secondary }}>
                    Nenhum produto registrado
                  </Typography>
                </Paper>
              )}
            </Box>

            {lead.description && (
              <Box mb={2}>
                <Typography variant="caption" style={{ color: theme.palette.text.secondary, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Descrição
                </Typography>
                <Paper elevation={0} style={{
                  background: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB',
                  border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E5E7EB',
                  padding: 12, borderRadius: 10, marginTop: 6
                }}>
                  <Typography variant="body2">{lead.description}</Typography>
                </Paper>
              </Box>
            )}

            {lead.tags && lead.tags.length > 0 && (
              <Box mb={2}>
                <Typography variant="caption" style={{ color: theme.palette.text.secondary, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Tags
                </Typography>
                <Box style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {lead.tags.map((tag, i) => (
                    <span key={i} style={{
                      padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500,
                      background: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6',
                      color: isDark ? '#d1d5db' : '#374151'
                    }}>
                      {typeof tag === 'string' ? tag : tag.name || tag.label}
                    </span>
                  ))}
                </Box>
              </Box>
            )}
          </>
        )}

        {activeTab === 'activities' && (
          <Box>
            {activities.length > 0 ? activities.map((act, i) => (
              <Paper key={i} elevation={0} style={{
                borderRadius: 10, marginBottom: 10, overflow: 'hidden',
                border: expandedActivity === i
                  ? (isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.12)')
                  : (isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E5E7EB'),
                background: isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB',
                cursor: 'pointer',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                boxShadow: expandedActivity === i
                  ? (isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.08)')
                  : 'none',
              }}>
                <Box
                  onClick={() => setExpandedActivity(expandedActivity === i ? null : i)}
                  style={{
                    padding: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography variant="subtitle2">{act.title}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {({task:'Tarefa',call:'Ligação',email:'E-mail',meeting:'Reunião'})[act.type] || act.type} • {act.date ? new Date(act.date).toLocaleDateString() : ''} • {
                        ({pending:'Pendente',in_progress:'Em Progresso',done:'Concluído',completed:'Concluído',backlog:'Backlog',active:'Ativo',paused:'Pausado',cancelled:'Cancelado'})[act.status] || act.status
                      }
                    </Typography>
                  </Box>
                  {expandedActivity === i
                    ? <ExpandLessIcon style={{ fontSize: 20, color: theme.palette.text.secondary }} />
                    : <ExpandMoreIcon style={{ fontSize: 20, color: theme.palette.text.secondary }} />
                  }
                </Box>
                <Collapse in={expandedActivity === i}>
                  <Box style={{
                    padding: '0 14px 14px',
                    borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #F0F2F5',
                  }}>
                    <Box style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 12 }}>
                      {act.title && (
                        <Box>
                          <Typography variant="caption" style={{ color: theme.palette.text.secondary, fontSize: 11, textTransform: 'uppercase' }}>Título</Typography>
                          <Typography variant="body2" style={{ fontWeight: 500, marginTop: 2 }}>{act.title}</Typography>
                        </Box>
                      )}
                      {act.type && (
                        <Box>
                          <Typography variant="caption" style={{ color: theme.palette.text.secondary, fontSize: 11, textTransform: 'uppercase' }}>Tipo</Typography>
                          <Typography variant="body2" style={{ fontWeight: 500, marginTop: 2 }}>{act.type}</Typography>
                        </Box>
                      )}
                      {act.date && (
                        <Box>
                          <Typography variant="caption" style={{ color: theme.palette.text.secondary, fontSize: 11, textTransform: 'uppercase' }}>Data</Typography>
                          <Typography variant="body2" style={{ fontWeight: 500, marginTop: 2 }}>{new Date(act.date).toLocaleDateString()}</Typography>
                        </Box>
                      )}
                      {act.status && (
                        <Box>
                          <Typography variant="caption" style={{ color: theme.palette.text.secondary, fontSize: 11, textTransform: 'uppercase' }}>Status</Typography>
                          <Typography variant="body2" style={{ fontWeight: 500, marginTop: 2 }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 6, fontSize: 12,
                              background: act.status === 'completed' || act.status === 'concluída'
                                ? (isDark ? 'rgba(34,197,94,0.15)' : '#DCFCE7')
                                : (isDark ? 'rgba(234,179,8,0.15)' : '#FEF9C3'),
                              color: act.status === 'completed' || act.status === 'concluída'
                                ? (isDark ? '#86EFAC' : '#166534')
                                : (isDark ? '#FDE68A' : '#854D0E'),
                            }}>
                              {({pending:'Pendente',in_progress:'Em Progresso',done:'Concluído',completed:'Concluído',backlog:'Backlog',active:'Ativo',paused:'Pausado',cancelled:'Cancelado'})[act.status] || act.status}
                            </span>
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    {act.description && (
                      <Box style={{ marginTop: 12 }}>
                        <Typography variant="caption" style={{ color: theme.palette.text.secondary, fontSize: 11, textTransform: 'uppercase' }}>Descrição</Typography>
                        <Typography variant="body2" style={{ marginTop: 4, lineHeight: 1.5 }}>{act.description}</Typography>
                      </Box>
                    )}
                  </Box>
                </Collapse>
              </Paper>
            )) : (
              <Box style={{
                textAlign: 'center', padding: '32px 0',
                color: theme.palette.text.secondary
              }}>
                <Typography variant="body2">Nenhuma atividade vinculada</Typography>
              </Box>
            )}
          </Box>
        )}

        {activeTab === 'projects' && (
          <Box>
            {Array.isArray(projects) && projects.length > 0 ? projects.map((proj, i) => {
              const statusMap = {pending:'Pendente',in_progress:'Em Progresso',done:'Concluído',completed:'Concluído',backlog:'Backlog',active:'Ativo',paused:'Pausado',cancelled:'Cancelado'};
              const statusLabel = statusMap[proj.status] || proj.status || '';
              return (
                <Paper key={i} elevation={0} style={{
                  borderRadius: 10, marginBottom: 10, overflow: 'hidden',
                  border: expandedProject === i
                  ? (isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.12)')
                  : (isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E5E7EB'),
                background: isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB',
                cursor: 'pointer',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                boxShadow: expandedProject === i
                    ? (isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.08)')
                    : 'none',
                }}>
                  <Box
                    onClick={() => setExpandedProject(expandedProject === i ? null : i)}
                    style={{
                      padding: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2">{proj.name || proj.title}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {statusLabel}
                        {proj.createdAt ? ` • ${new Date(proj.createdAt).toLocaleDateString()}` : ''}
                      </Typography>
                    </Box>
                    {expandedProject === i
                      ? <ExpandLessIcon style={{ fontSize: 20, color: theme.palette.text.secondary }} />
                      : <ExpandMoreIcon style={{ fontSize: 20, color: theme.palette.text.secondary }} />
                    }
                  </Box>
                  <Collapse in={expandedProject === i}>
                    <Box style={{
                      padding: '0 14px 14px',
                      borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #F0F2F5',
                    }}>
                      <Box style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 12 }}>
                        {(proj.name || proj.title) && (
                          <Box>
                            <Typography variant="caption" style={{ color: theme.palette.text.secondary, fontSize: 11, textTransform: 'uppercase' }}>Nome</Typography>
                            <Typography variant="body2" style={{ fontWeight: 500, marginTop: 2 }}>{proj.name || proj.title}</Typography>
                          </Box>
                        )}
                        {proj.status && (
                          <Box>
                            <Typography variant="caption" style={{ color: theme.palette.text.secondary, fontSize: 11, textTransform: 'uppercase' }}>Status</Typography>
                            <Typography variant="body2" style={{ fontWeight: 500, marginTop: 2 }}>
                              <span style={{
                                padding: '2px 8px', borderRadius: 6, fontSize: 12,
                                background: (proj.status === 'completed' || proj.status === 'done')
                                  ? (isDark ? 'rgba(34,197,94,0.15)' : '#DCFCE7')
                                  : proj.status === 'active'
                                    ? (isDark ? 'rgba(156,163,175,0.15)' : '#F3F4F6')
                                    : (isDark ? 'rgba(234,179,8,0.15)' : '#FEF9C3'),
                                color: (proj.status === 'completed' || proj.status === 'done')
                                  ? (isDark ? '#86EFAC' : '#166534')
                                  : proj.status === 'active'
                                    ? (isDark ? '#d1d5db' : '#374151')
                                    : (isDark ? '#FDE68A' : '#854D0E'),
                              }}>
                                {statusLabel}
                              </span>
                            </Typography>
                          </Box>
                        )}
                        {proj.responsible && (
                          <Box>
                            <Typography variant="caption" style={{ color: theme.palette.text.secondary, fontSize: 11, textTransform: 'uppercase' }}>Responsável</Typography>
                            <Typography variant="body2" style={{ fontWeight: 500, marginTop: 2 }}>{proj.responsible?.name || '—'}</Typography>
                          </Box>
                        )}
                        {proj.createdAt && (
                          <Box>
                            <Typography variant="caption" style={{ color: theme.palette.text.secondary, fontSize: 11, textTransform: 'uppercase' }}>Criado em</Typography>
                            <Typography variant="body2" style={{ fontWeight: 500, marginTop: 2 }}>{new Date(proj.createdAt).toLocaleDateString()}</Typography>
                          </Box>
                        )}
                      </Box>
                      {proj.description && (
                        <Box style={{ marginTop: 12 }}>
                          <Typography variant="caption" style={{ color: theme.palette.text.secondary, fontSize: 11, textTransform: 'uppercase' }}>Descrição</Typography>
                          <Typography variant="body2" style={{ marginTop: 4, lineHeight: 1.5 }}>{proj.description}</Typography>
                        </Box>
                      )}
                    </Box>
                  </Collapse>
                </Paper>
              );
            }) : (
              <Box style={{
                textAlign: 'center', padding: '32px 0',
                color: theme.palette.text.secondary
              }}>
                <Typography variant="body2">Nenhum projeto vinculado</Typography>
              </Box>
            )}
          </Box>
        )}

        {activeTab === 'notes' && (
          <Box>
            <TextField
              multiline
              minRows={4}
              fullWidth
              variant="outlined"
              placeholder="Adicionar observações sobre a empresa..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              size="small"
            />
            <Typography variant="caption" color="textSecondary" style={{ marginTop: 8, display: 'block' }}>
              As observações são salvas localmente por enquanto.
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

const LeadsList = ({ leads, onEdit, onDelete, onView }) => {
  const theme = useTheme();
  const isDark = theme.palette.type === 'dark';
  return (
    <TableContainer
      component={Paper}
      elevation={0}
      style={{
        overflow: "hidden",
        backgroundColor: isDark ? (theme.palette.dashboardCard || '#252526') : '#fff',
        borderRadius: 12,
        border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid #E2E8F0',
        boxShadow: isDark
          ? '0 4px 16px rgba(0,0,0,0.35)'
          : '0 1px 3px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.06)',
        margin: 0,
      }}
    >
      <Table stickyHeader aria-label="converted leads table">
        <TableHead>
          <TableRow>
            <TableCell>Nome</TableCell>
            <TableCell>CRM</TableCell>
            <TableCell>Setor</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Telefone</TableCell>
            <TableCell>Contato</TableCell>
            <TableCell>Responsável</TableCell>
            <TableCell>Data</TableCell>
            <TableCell align="right">Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {leads.length > 0 ? (
            leads.map((lead) => {
              const channel = getChannelFromLead(lead);
              return (
                <TableRow
                  key={lead.id}
                  style={{
                    cursor: 'pointer',
                  }}
                  onClick={() => onView && onView(lead)}
                >
                  <TableCell component="th" scope="row">
                    <span style={{ fontWeight: 500, color: isDark ? '#f4f4f5' : '#1E293B' }}>
                      {lead.name}
                    </span>
                  </TableCell>
                  <TableCell>
                    
                  </TableCell>
                  <TableCell>
                    {lead.sector ? (
                      <Box style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                          background: isDark ? 'rgba(99,102,241,0.15)' : '#EEF2FF',
                          color: isDark ? '#A5B4FC' : '#4F46E5',
                        }}>
                          {lead.sector}
                        </span>
                        {channel && <ChannelBadge channel={channel} />}
                      </Box>
                    ) : (
                      <span style={{ color: theme.palette.text.disabled }}>—</span>
                    )}
                  </TableCell>
                  <TableCell style={{ color: isDark ? '#d1d5db' : '#475569' }}>
                    {lead.email || <span style={{ color: theme.palette.text.disabled }}>—</span>}
                  </TableCell>
                  <TableCell style={{ color: isDark ? '#d1d5db' : '#475569' }}>
                    {lead.phone || lead.contact?.number || <span style={{ color: theme.palette.text.disabled }}>—</span>}
                  </TableCell>
                  <TableCell style={{ color: isDark ? '#d1d5db' : '#475569' }}>
                    {lead.contact?.name || <span style={{ color: theme.palette.text.disabled }}>—</span>}
                  </TableCell>
                  <TableCell style={{ color: isDark ? '#d1d5db' : '#475569' }}>
                    {lead.responsible?.name || <span style={{ color: theme.palette.text.disabled }}>—</span>}
                  </TableCell>
                  <TableCell style={{ color: isDark ? '#9ca3af' : '#64748B', fontSize: 12 }}>
                    {lead.date ? new Date(lead.date).toLocaleDateString() : <span style={{ color: theme.palette.text.disabled }}>—</span>}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(lead); }}
                      style={{ padding: 6 }}
                    >
                      <EditIcon style={{ fontSize: 18, color: isDark ? '#fff' : '#1E3A5F' }} />
                    </IconButton>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(lead); }}
                      style={{ padding: 6 }}
                    >
                      <DeleteIcon style={{ fontSize: 18, color: isDark ? '#fff' : '#1E3A5F' }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={9} align="center" style={{
                padding: '32px 0',
                color: theme.palette.text.secondary,
              }}>
                Nenhum lead convertido encontrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const LeadsConvertidos = () => {
  const classes = useStyles();
  const theme = useTheme();
  const isDark = theme.palette.type === 'dark';
  const [viewMode, setViewMode] = useState("list");
  const [searchParam, setSearchParam] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [sector, setSector] = useState("");
  const [responsible, setResponsible] = useState(null);
  const [contact, setContact] = useState(null);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailLead, setDetailLead] = useState(null);
  const [contactsList, setContactsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const { user, socket } = useContext(AuthContext);
  const [anchorSector, setAnchorSector] = useState(null);
  const [anchorResp, setAnchorResp] = useState(null);
  const [anchorContact, setAnchorContact] = useState(null);
  const [anchorPeriodo, setAnchorPeriodo] = useState(null);
  useEffect(() => {
    async function fetchFilters() {
      try {
        const { data: contactsData } = await api.get("/contacts/list");
        setContactsList(contactsData || []);
        const { data: usersResp } = await api.get("/users", { params: { searchParam: "" } });
        setUsersList(usersResp?.users || []);
      } catch (err) {
        // ignore
      }
    }
    fetchFilters();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = {
          searchParam,
          pageNumber,
          sector: sector || undefined,
          responsibleId: responsible?.id || undefined,
          contactId: contact?.id || undefined,
          dateStart: dateStart || undefined,
          dateEnd: dateEnd || undefined
        };
        const data = await convertedLeadsService.list(params);
        setLeads(data.leads || []);
        setHasMore(data.hasMore);
        setTotal(data.count || 0);
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [searchParam, pageNumber, sector, responsible, contact, dateStart, dateEnd]);

  useEffect(() => {
    if (!socket || !user || !user.companyId) return;
    const onLeadEvent = (data) => {
      if (data?.action === "create" || data?.action === "update") {
        setLeads((prev) => {
          const idx = prev.findIndex((x) => String(x.id) === String(data.lead.id));
          if (idx >= 0) {
            const clone = [...prev];
            clone[idx] = data.lead;
            return clone;
          }
          return [data.lead, ...prev];
        });
      }
      if (data?.action === "delete") {
        setLeads((prev) => prev.filter((x) => String(x.id) !== String(data.id)));
      }
    };
    socket.on(`company-${user.companyId}-converted-lead`, onLeadEvent);
    return () => {
      socket.off(`company-${user.companyId}-converted-lead`, onLeadEvent);
    };
  }, [socket, user?.companyId]);

  const viewModes = [
    { value: "list", label: "Lista", icon: <ListIcon /> },
  ];

  const handleSearch = (value) => setSearchParam(value);

  const handleOpenCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (lead) => {
    setEditing(lead);
    setModalOpen(true);
  };

  const handleDelete = async (lead) => {
    try {
      await convertedLeadsService.remove(lead.id);
      setLeads((prev) => prev.filter((x) => x.id !== lead.id));
    } catch (err) {
      toastError(err);
    }
  };

  const actionsRight = null;

  const rightFilters = ({ classes }) => (
    <>
      <div
        className={classes.filterItem}
        onClick={(e) => setAnchorSector(e.currentTarget)}
      >
        <Typography className={classes.filterLabel}>
          {sector ? `Setor: ${sector}` : "Setor"}
        </Typography>
        <ExpandMoreIcon className={classes.chevronIcon} />
      </div>
      <div
        className={classes.filterItem}
        onClick={(e) => setAnchorResp(e.currentTarget)}
      >
        <Typography className={classes.filterLabel}>
          {responsible ? `Responsável: ${responsible.name}` : "Responsável"}
        </Typography>
        <ExpandMoreIcon className={classes.chevronIcon} />
      </div>
      <div
        className={classes.filterItem}
        onClick={(e) => setAnchorContact(e.currentTarget)}
      >
        <Typography className={classes.filterLabel}>
          {contact ? `Contato: ${contact.name}` : "Contato"}
        </Typography>
        <ExpandMoreIcon className={classes.chevronIcon} />
      </div>
      <div
        className={classes.filterItem}
        onClick={(e) => setAnchorPeriodo(e.currentTarget)}
      >
        <CalendarIcon className={classes.calendarIcon} />
        <Typography className={classes.filterLabel}>
          {dateStart && dateEnd ? `${dateStart.slice(8,10)}/${dateStart.slice(5,7)} – ${dateEnd.slice(8,10)}/${dateEnd.slice(5,7)}` : "Período"}
        </Typography>
        <ExpandMoreIcon className={classes.chevronIcon} />
      </div>
    </>
  );

  return (
    <>
      <ActivitiesStyleLayout
        title="Leads Convertidos"
        description="Gerencie seus leads convertidos"
        onCreateClick={handleOpenCreate}
        searchPlaceholder="Buscar empresas..."
        searchValue={searchParam}
        onSearchChange={handleSearch}
        rightFilters={rightFilters}
        stats={[]}
        navActions={actionsRight}
        viewModes={viewModes}
        currentViewMode={viewMode}
        onViewModeChange={setViewMode}
      >
        <div className={classes.container}>
          {loading ? (
            <div style={{ padding: 20, textAlign: "center" }}>Carregando...</div>
          ) : (
            viewMode === "list" && (
              <LeadsList leads={leads} onEdit={handleEdit} onDelete={handleDelete} onView={setDetailLead} />
            )
          )}
        </div>
      </ActivitiesStyleLayout>

      <Popover
        open={Boolean(anchorSector)}
        anchorEl={anchorSector}
        onClose={() => setAnchorSector(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <div style={{ padding: 12, width: 260 }}>
          <TextField
            label="Setor"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            variant="outlined"
            size="small"
            fullWidth
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <Button size="small" onClick={() => { setSector(""); setAnchorSector(null); }}>Limpar</Button>
            <Button size="small" color="primary" variant="contained" onClick={() => setAnchorSector(null)}>Aplicar</Button>
          </div>
        </div>
      </Popover>

      <Popover
        open={Boolean(anchorResp)}
        anchorEl={anchorResp}
        onClose={() => setAnchorResp(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <div style={{ padding: 12, width: 280 }}>
          <Autocomplete
            options={usersList}
            getOptionLabel={(opt) => opt?.name || ""}
            value={responsible}
            onChange={(_, v) => setResponsible(v)}
            renderInput={(params) => (
              <TextField {...params} label="Responsável" variant="outlined" size="small" />
            )}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <Button size="small" onClick={() => { setResponsible(null); setAnchorResp(null); }}>Limpar</Button>
            <Button size="small" color="primary" variant="contained" onClick={() => setAnchorResp(null)}>Aplicar</Button>
          </div>
        </div>
      </Popover>

      <Popover
        open={Boolean(anchorContact)}
        anchorEl={anchorContact}
        onClose={() => setAnchorContact(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <div style={{ padding: 12, width: 280 }}>
          <Autocomplete
            options={contactsList}
            getOptionLabel={(opt) => opt?.name || ""}
            value={contact}
            onChange={(_, v) => setContact(v)}
            renderInput={(params) => (
              <TextField {...params} label="Contato" variant="outlined" size="small" />
            )}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <Button size="small" onClick={() => { setContact(null); setAnchorContact(null); }}>Limpar</Button>
            <Button size="small" color="primary" variant="contained" onClick={() => setAnchorContact(null)}>Aplicar</Button>
          </div>
        </div>
      </Popover>

      <Popover
        open={Boolean(anchorPeriodo)}
        anchorEl={anchorPeriodo}
        onClose={() => setAnchorPeriodo(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{ style: { borderRadius: 6, boxShadow: '0 4px 24px rgba(0,0,0,0.12)', border: 'none', minWidth: 240 } }}
      >
        <div style={{ padding: 12 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
            {[
              { label: "Hoje", days: 0 },
              { label: "7 dias", days: 7 },
              { label: "30 dias", days: 30 },
              { label: "90 dias", days: 90 },
            ].map((p) => {
              const end = new Date();
              const start = new Date();
              start.setDate(end.getDate() - p.days);
              const sv = start.toISOString().slice(0,10);
              const ev = end.toISOString().slice(0,10);
              const active = dateStart === sv && dateEnd === ev;
              return (
                <div key={p.label} onClick={() => { setDateStart(sv); setDateEnd(ev); setAnchorPeriodo(null); }}
                  style={{
                    padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500,
                    cursor: 'pointer', transition: 'all 0.15s',
                    backgroundColor: active ? '#3b82f6' : (isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6'),
                    color: active ? '#fff' : (isDark ? '#e5e7eb' : '#374151'),
                  }}
                >{p.label}</div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)}
              style={{ flex: 1, padding: '5px 6px', fontSize: 11, borderRadius: 4, border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#d1d5db'}`, background: isDark ? 'rgba(255,255,255,0.06)' : '#fff', color: isDark ? '#e5e7eb' : '#111', outline: 'none' }}
            />
            <span style={{ fontSize: 10, color: isDark ? '#9ca3af' : '#6b7280' }}>–</span>
            <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)}
              style={{ flex: 1, padding: '5px 6px', fontSize: 11, borderRadius: 4, border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#d1d5db'}`, background: isDark ? 'rgba(255,255,255,0.06)' : '#fff', color: isDark ? '#e5e7eb' : '#111', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, gap: 6 }}>
            <div onClick={() => { setDateStart(""); setDateEnd(""); setAnchorPeriodo(null); }}
              style={{ padding: '4px 10px', fontSize: 11, fontWeight: 500, cursor: 'pointer', borderRadius: 4, color: isDark ? '#9ca3af' : '#6b7280' }}
            >Limpar</div>
            <div onClick={() => setAnchorPeriodo(null)}
              style={{ padding: '4px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer', borderRadius: 4, backgroundColor: '#3b82f6', color: '#fff' }}
            >Aplicar</div>
          </div>
        </div>
      </Popover>

      <LeadCompanyModal
        open={modalOpen}
        initialValues={editing}
        onClose={() => setModalOpen(false)}
        onSave={async (payload) => {
          try {
            if (editing?.id) {
              const record = await convertedLeadsService.update(editing.id, payload);
              setLeads((prev) =>
                prev.map((x) => (String(x.id) === String(record.id) ? record : x))
              );
            } else {
              const record = await convertedLeadsService.create(payload);
              setLeads((prev) => {
                const filtered = prev.filter((x) => String(x.id) !== String(record.id));
                return [record, ...filtered];
              });
            }
            setModalOpen(false);
          } catch (err) {
            toastError(err);
          }
        }}
      />

      <CompanyDetailsDrawer
        open={Boolean(detailLead)}
        onClose={() => setDetailLead(null)}
        lead={detailLead}
        onEdit={(lead) => { setDetailLead(null); handleEdit(lead); }}
      />
    </>
  );
};

export default LeadsConvertidos;
