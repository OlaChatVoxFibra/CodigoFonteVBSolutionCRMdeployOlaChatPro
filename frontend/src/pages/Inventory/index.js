/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { useTranslation } from "react-i18next";
import {
  List as ListIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from "@material-ui/icons";
import ReportProblemOutlinedIcon from "@material-ui/icons/ReportProblemOutlined";
import AttachMoneyOutlinedIcon from "@material-ui/icons/AttachMoneyOutlined";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import { ViewWeek as KanbanIcon } from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import ActivitiesStyleLayout from "../../components/ActivitiesStyleLayout";
import { Button, CircularProgress, Drawer, Box, IconButton } from "@material-ui/core";
import {
  Close as CloseIcon,
  DescriptionOutlined as DescIcon,
  LocalOfferOutlined as SkuIcon,
  CategoryOutlined as CategoryIcon,
  StorefrontOutlined as BrandIcon,
  PhotoCameraOutlined as PhotoIcon,
  ExpandMore as ExpandMoreIcon,
  CalendarToday as CalendarIcon,
} from "@material-ui/icons";
import CloudUploadIcon from "@material-ui/icons/CloudUpload";
import FlagOutlinedIcon from "@material-ui/icons/FlagOutlined";
import api from "../../services/api";
import { toast } from "react-toastify";
import useInventory from "../../hooks/useInventory";

import { Grid, Paper, Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, InputLabel, FormControl, Fab, Avatar, ButtonGroup, Popover } from "@material-ui/core";
import { useTheme } from "@material-ui/core/styles";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import inventoryService from "../../services/inventoryService";
import KanbanBoard from "../../components/KanbanBoard";

const columnsDef = [
  { id: "in_stock", title: "Em Estoque", color: "#10B981" },
  { id: "low_stock", title: "Estoque Baixo", color: "#F59E0B" },
  { id: "out_of_stock", title: "Sem Estoque", color: "#EF4444" },
  { id: "ordered", title: "Pedido Efetuado", color: "#3B82F6" }
];

const listUseStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const cardBg =
    isDark && theme.palette.dashboardCard
      ? theme.palette.dashboardCard
      : isDark
        ? "#353538"
        : "#ffffff";
  return {
    kpiRow: {
      display: "grid",
      gridTemplateColumns: "repeat(5, minmax(160px, 1fr))",
      gap: 16,
      padding: 0,
      margin: "0 24px 24px",
      width: "calc(100% - 48px)",
      "@media (max-width:1280px)": {
        gridTemplateColumns: "repeat(5, minmax(140px, 1fr))"
      },
      "@media (max-width:1024px)": {
        gridTemplateColumns: "repeat(5, minmax(120px, 1fr))"
      },
      "@media (max-width:900px)": {
        gridTemplateColumns: "repeat(5, minmax(110px, 1fr))"
      }
    },
    kpiCard: {
      borderRadius: 12,
      padding: 12,
      border: isDark
        ? "1px solid rgba(255,255,255,0.12)"
        : "1px solid #E5EAF1",
      boxShadow: isDark
        ? "0 4px 16px rgba(0,0,0,0.35)"
        : "0 1px 2px rgba(0,0,0,0.04), 0 6px 16px rgba(2,6,23,0.08), inset 0 1px 0 rgba(255,255,255,0.6)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      gap: 8,
      minHeight: 110,
      width: "100%",
      background: cardBg,
      transition: "transform 160ms ease, box-shadow 220ms ease",
      "&:hover": {
        transform: "translateY(-3px)",
        boxShadow: isDark
          ? "0 12px 24px rgba(0,0,0,0.5)"
          : "0 10px 20px rgba(2,6,23,0.12), 0 3px 6px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)"
      }
    }
  };
});

const boardStyles = makeStyles((theme) => ({
  kanbanCard: {
    marginBottom: 8,
    transition: "transform 160ms ease, box-shadow 220ms ease",
    boxShadow:
      theme.palette.type === "dark"
        ? "0 2px 8px rgba(0,0,0,0.4)"
        : "0 1px 2px rgba(0,0,0,0.04), 0 6px 16px rgba(2,6,23,0.06)",
    backgroundColor:
      theme.palette.type === "dark"
        ? theme.palette.dashboardCard || "#353538"
        : undefined,
    "&:hover": {
      transform: "translateY(-3px)",
      boxShadow:
        theme.palette.type === "dark"
          ? "0 8px 20px rgba(0,0,0,0.5)"
          : "0 10px 20px rgba(2,6,23,0.12), 0 3px 6px rgba(0,0,0,0.06)"
    }
  },
  columnPaper: {
    height: "100%",
    padding: 16,
    backgroundColor:
      theme.palette.type === "dark"
        ? theme.palette.inputBackground
        : "#f5f5f5"
  },
  columnTitle: {
    color: theme.palette.text.primary
  }
}));

const InventoryBoard = ({ data, loading, onMove }) => {
  const bclasses = boardStyles();
  if (loading) return <CircularProgress />;
  const getByCol = (colId) => (Array.isArray(data) ? data.filter(i => String(i.status || "").toLowerCase() === colId) : []);
  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    if (onMove) onMove(draggableId, source.droppableId, destination.droppableId);
  };
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Grid container spacing={2} style={{ height: '100%', overflowX: 'auto', flexWrap: 'nowrap' }}>
        {columnsDef.map((col) => (
          <Grid item xs={12} sm={6} md={3} key={col.id} style={{ minWidth: 280 }}>
            <Paper className={bclasses.columnPaper} style={{ height: '100%' }}>
              <Typography variant="h6" gutterBottom className={bclasses.columnTitle}>
                {col.title}
              </Typography>
              <Droppable droppableId={col.id}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} style={{ minHeight: 100 }}>
                    {getByCol(col.id).map((item, index) => (
                      <Draggable draggableId={String(item.id)} index={index} key={item.id}>
                        {(prov) => (
                          <Card ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} className={bclasses.kanbanCard}>
                            <CardContent>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <Typography variant="subtitle1" style={{ flex: 1 }}>{item.name || "Sem nome"}</Typography>
                                
                              </div>
                              <Typography variant="body2" color="textSecondary">Qtd: {item.quantity || 0}</Typography>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </DragDropContext>
  );
};

const InventoryList = ({ data, loading, onEdit, onDelete }) => {
    const lclasses = listUseStyles();
    const theme = useTheme();
    const isDark = theme.palette.type === "dark";
    if (loading) return <CircularProgress />;
    const items = Array.isArray(data) ? data : [];
    const totalItens = items.length;
    const semEstoque = items.filter(i => String(i.status || "").toLowerCase() === "out_of_stock").length;
    const estoqueBaixo = items.filter(i => String(i.status || "").toLowerCase() === "low_stock").length;
    const emEstoque = items.filter(i => String(i.status || "").toLowerCase() === "in_stock").length;
    const valorTotal = items.reduce((sum, i) => {
      const q = Number(i.quantity || 0);
      const p = Number(i.price || 0);
      if (!isFinite(q) || !isFinite(p)) return sum;
      return sum + q * p;
    }, 0);
    const fmt = (value, currency) => {
      const c = (currency || "BRL").toUpperCase();
      const locales = c === "USD" ? "en-US" : "pt-BR";
      try {
        return new Intl.NumberFormat(locales, { style: "currency", currency: c }).format(Number(value || 0));
      } catch {
        return c === "USD" ? `$ ${Number(value || 0).toFixed(2)}` : `R$ ${Number(value || 0).toFixed(2)}`;
      }
    };
    
    return (
        <div>
          <div className={lclasses.kpiRow}>
            {[
              { label: "Itens", value: totalItens, icon: <ListIcon style={{ color: "#111827" }} /> },
              { label: "Em Estoque", value: emEstoque, icon: <CheckCircleOutlineIcon style={{ color: "#111827" }} /> },
              { label: "Estoque Baixo", value: estoqueBaixo, icon: <ReportProblemOutlinedIcon style={{ color: "#111827" }} /> },
              { label: "Sem Estoque", value: semEstoque, icon: <CloseIcon style={{ color: "#111827" }} /> },
              { label: "Valor Total", value: (valorTotal || 0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}), icon: <AttachMoneyOutlinedIcon style={{ color: "#111827" }} /> }
            ].map((c) => (
              <Paper key={c.label} className={lclasses.kpiCard}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 13, color: theme.palette.text.primary, whiteSpace: "nowrap" }}>{c.label}</div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: theme.palette.text.primary, whiteSpace: "nowrap" }}>{c.value}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginTop: "auto" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 10,
                    background: isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6",
                    display: "grid", placeItems: "center"
                  }}>
                    {React.cloneElement(c.icon, {
                      style: { ...(c.icon.props.style || {}), color: theme.palette.text.primary }
                    })}
                  </div>
                </div>
              </Paper>
            ))}
          </div>
        <TableContainer
          component={Paper}
          style={{
            width: "calc(100% - 48px)",
            margin: "0 24px",
            borderRadius: 12,
            border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #E5EAF1",
            boxShadow: isDark
              ? "0 4px 16px rgba(0,0,0,0.35)"
              : "0 1px 2px rgba(0,0,0,0.04), 0 6px 16px rgba(2,6,23,0.06)",
            backgroundColor: isDark
              ? theme.palette.dashboardCard || "#252526"
              : "#ffffff",
          }}
        >
            <Table size="small">
            <TableHead>
                <TableRow>
                <TableCell style={{ width: 72, padding: "8px 12px" }}>Imagem</TableCell>
                <TableCell style={{ width: "36%", padding: "8px 12px" }}>Produto</TableCell>
                <TableCell style={{ width: "7%", padding: "8px 12px" }}>CRM</TableCell>
                <TableCell style={{ width: "22%", padding: "8px 12px" }}>Status</TableCell>
                <TableCell style={{ width: "15%", padding: "8px 12px" }}>Quantidade</TableCell>
                <TableCell style={{ width: "20%", padding: "8px 12px" }}>Preço</TableCell>
                <TableCell style={{ width: 88, padding: "8px 8px" }} align="right">Ações</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {data && data.length > 0 ? (
                    data.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell style={{ padding: "8px 12px" }}>
                              {item?.image ? (
                                <Avatar variant="rounded" src={item.image} style={{ width: 40, height: 40 }} />
                              ) : (
                                <Avatar variant="rounded" style={{ width: 40, height: 40, background: "#E5E7EB", color: "#111827" }}>
                                  {(item.name || "P")[0]}
                                </Avatar>
                              )}
                            </TableCell>
                            <TableCell style={{ padding: "8px 12px" }}>{item.name}</TableCell>
                            <TableCell style={{ padding: "8px 12px" }}>
                              
                            </TableCell>
                            <TableCell style={{ padding: "8px 12px" }}>{(() => {
                              const map = {
                                in_stock: "Em Estoque",
                                low_stock: "Estoque Baixo",
                                out_of_stock: "Sem Estoque",
                                ordered: "Pedido Efetuado"
                              };
                              return map[String(item.status || "").toLowerCase()] || item.status;
                            })()}</TableCell>
                            <TableCell style={{ padding: "8px 12px" }}>{item.quantity}</TableCell>
                            <TableCell style={{ padding: "8px 12px" }}>
                              {fmt(item.price, item.currency)}
                            </TableCell>
                            <TableCell style={{ padding: "8px 8px" }} align="right">
                              <IconButton size="small" onClick={() => onEdit(item)} aria-label="editar">
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => onDelete(item)} aria-label="excluir" color="secondary">
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={6} align="center" style={{ padding: "12px" }}>Nenhum produto encontrado</TableCell>
                    </TableRow>
                )}
            </TableBody>
            </Table>
        </TableContainer>
        </div>
    );
};

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  content: {
    flex: 1,
    overflowY: "auto",
  },
  fab: {
    position: "fixed",
    bottom: theme.spacing(3),
    right: theme.spacing(3),
    backgroundColor: "#131B2D",
    color: "#fff"
  },
  drawerPaper: {
    width: 480,
    maxWidth: "100%",
    padding: 0,
    height: "calc(100% - 32px)",
    marginTop: 16,
    marginBottom: 16,
    marginRight: 16,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: theme.palette.type === 'dark' ? '#1c1c1e' : '#ffffff',
    boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
    display: "flex",
    flexDirection: "column",
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(3px)',
  },
  drawerContainer: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  drawerHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 20px",
    borderBottom: theme.palette.type === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f0f0f0',
  },
  drawerTitle: {
    fontWeight: 600,
    fontSize: 15,
    letterSpacing: "-0.01em",
    color: theme.palette.text.primary,
  },
  drawerClose: {
    width: 30,
    height: 30,
    color: theme.palette.text.secondary,
    "&:hover": { backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.05)' : '#f3f4f6' },
  },
  drawerContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 0,
    padding: "24px 24px 16px",
    overflowY: "auto",
    '&::-webkit-scrollbar': { width: 5 },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.08)',
      borderRadius: 3,
    },
  },
  titleInput: {
    '& .MuiInputBase-root': {
      fontSize: 20,
      fontWeight: 500,
      padding: 0,
      letterSpacing: '-0.01em',
    },
    '& .MuiInput-underline:before': { border: 'none' },
    '& .MuiInput-underline:after': { border: 'none' },
    '& .MuiInput-underline:hover:before': { border: 'none' },
    '& .MuiInputBase-input::placeholder': {
      color: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
      opacity: 1,
    },
    marginBottom: 16,
  },
  descRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 16,
    padding: '6px 0',
  },
  descIcon: {
    color: theme.palette.text.secondary,
    fontSize: 18,
    opacity: 0.6,
    marginTop: 2,
  },
  descInput: {
    '& .MuiInputBase-root': { fontSize: 13, padding: 0 },
    '& .MuiInput-underline:before': { border: 'none' },
    '& .MuiInput-underline:after': { border: 'none' },
    '& .MuiInput-underline:hover:before': { border: 'none' },
    '& .MuiInputBase-input::placeholder': {
      color: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)',
      opacity: 1,
    },
  },
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '7px 0',
    borderBottom: theme.palette.type === 'dark' ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.04)',
  },
  fieldIcon: {
    color: theme.palette.text.secondary,
    fontSize: 16,
    opacity: 0.5,
    width: 20,
    textAlign: 'center',
    flexShrink: 0,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: theme.palette.text.secondary,
    width: 80,
    flexShrink: 0,
  },
  fieldInput: {
    flex: 1,
    '& .MuiInputBase-root': { fontSize: 13, padding: 0 },
    '& .MuiInput-underline:before': { border: 'none' },
    '& .MuiInput-underline:after': { border: 'none' },
    '& .MuiInput-underline:hover:before': { border: 'none' },
    '& .MuiInputBase-input': { padding: '4px 0' },
    '& .MuiInputBase-input::placeholder': {
      color: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)',
      opacity: 1,
    },
  },
  fieldSelect: {
    flex: 1,
    '& .MuiInputBase-root': { fontSize: 13 },
    '& .MuiInput-underline:before': { border: 'none' },
    '& .MuiInput-underline:after': { border: 'none' },
    '& .MuiInput-underline:hover:before': { border: 'none' },
    '& .MuiSelect-select': { padding: '4px 24px 4px 0' },
  },
  imageSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    padding: '8px 0',
  },
  imageBtn: {
    fontSize: 12,
    fontWeight: 500,
    textTransform: 'none',
    borderRadius: 6,
    padding: '5px 14px',
    borderColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.12)' : '#e5e7eb',
  },
  drawerActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 20px",
    borderTop: theme.palette.type === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f0f0f0',
    "& .MuiButton-containedPrimary": {
      height: 34,
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 600,
      textTransform: "none",
      boxShadow: "none",
      backgroundColor: theme.palette.type === 'dark' ? '#1e3a5f' : '#1e40af',
      color: '#fff',
      "&:hover": { backgroundColor: '#1e3a8a', boxShadow: '0 2px 8px rgba(30,64,175,0.3)' },
    },
    "& .MuiButton-text": {
      textTransform: "none",
      fontSize: 13,
    },
  },
  importDrawerPaper: {
    width: 420,
    maxWidth: "100%",
    padding: theme.spacing(2),
    borderRadius: 16,
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    height: "calc(100% - 32px)",
    marginRight: theme.spacing(2),
    overflow: "visible",
    backgroundColor: theme.palette.type === 'dark' ? theme.palette.background.paper : undefined,
    color: theme.palette.text.primary,
  },
  importHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    paddingBottom: theme.spacing(2),
    marginBottom: theme.spacing(2),
    borderBottom: theme.palette.type === 'dark' ? '1px solid rgba(255,255,255,0.1)' : "1px solid #eee",
  },
  importClose: {
    position: "absolute",
    right: 0,
  },
  importIntro: {
    fontSize: 13,
    color: theme.palette.text.secondary,
    marginBottom: 8
  },
  importBox: {
    border: theme.palette.type === 'dark' ? '1px solid rgba(255,255,255,0.1)' : "1px solid #E5E7EB",
    borderRadius: 8,
    padding: theme.spacing(1.5),
    background: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.04)' : "#F9FAFB",
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(2)
  },
}));

const Inventory = () => {
  const classes = useStyles();
  const theme = useTheme();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("list");
  const [searchParam, setSearchParam] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ 
    name: "", 
    price: "", 
    currency: "BRL",
    quantity: 0, 
    status: "in_stock",
    sku: "",
    category: "",
    brand: "",
    description: "",
    image: ""
  });
  const [inventoryState, setInventoryState] = useState([]);
  const [openImport, setOpenImport] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [goals, setGoals] = useState([]);
  const [orgUsers, setOrgUsers] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [anchorStatus, setAnchorStatus] = useState(null);
  const [anchorPeriodo, setAnchorPeriodo] = useState(null);
  const { inventory, loading, count } = useInventory({
      pageNumber: 1,
      searchParam,
      refreshSignal: 0
  });
  useEffect(() => {
    setInventoryState(Array.isArray(inventory) ? inventory : []);
  }, [inventory]);

  useEffect(() => {
    if (goalsOpen && orgUsers.length === 0) {
      api.get("/users/", { params: { searchParam: "", pageNumber: 1 } })
        .then(({ data }) => setOrgUsers(data.users || []))
        .catch(() => {});
    }
  }, [goalsOpen]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const tabs = [
    { label: "Lista", value: "list", icon: <ListIcon /> },
    { label: "Quadro", value: "board", icon: <KanbanIcon /> },
  ];

  const handleOpen = (item) => {
    if (item) {
      setEditItem(item);
      setForm({
        name: item.name || "",
        price: item.price || "",
        currency: (item.currency || "BRL").toUpperCase(),
        quantity: item.quantity || 0,
        status: item.status || "in_stock",
        sku: item.sku || "",
        category: item.category || "",
        brand: item.brand || "",
        description: item.description || "",
        image: item.image || ""
      });
    } else {
      setEditItem(null);
      setForm({ 
        name: "", 
        price: "", 
        currency: "BRL",
        quantity: 0, 
        status: "in_stock",
        sku: "",
        category: "",
        brand: "",
        description: "",
        image: ""
      });
    }
    setOpenModal(true);
  };
  const handleClose = () => setOpenModal(false);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === "quantity" ? Number(value) : value }));
  };
  const handleImageFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm(prev => ({ ...prev, image: reader.result || "" }));
    };
    reader.readAsDataURL(file);
  };
  const handleSave = async () => {
    try {
      const normalizedPrice = (() => {
        const raw = String(form.price ?? "")
          .replace(/[^\d,.,,-]/g, "")
          .replace(/\s+/g, "");
        const canon = raw
          .replace(/\./g, "")
          .replace(",", ".");
        const n = parseFloat(canon);
        return Number.isFinite(n) ? n : 0;
      })();
      const payload = {
        name: form.name || "",
        price: normalizedPrice,
        currency: (form.currency || "BRL").toUpperCase(),
        quantity: Number(form.quantity || 0),
        status: form.status || undefined,
        sku: form.sku || undefined,
        category: form.category || undefined,
        brand: form.brand || undefined,
        description: form.description || undefined,
        image: form.image || undefined
      };
      if (editItem) {
        const saved = await inventoryService.update(editItem.id, payload);
        setInventoryState(prev => prev.map(i => i.id === saved.id ? saved : i));
        toast.success("Produto atualizado");
      } else {
        const created = await inventoryService.create(payload);
        setInventoryState(prev => [created, ...prev]);
        toast.success("Produto criado");
      }
      setOpenModal(false);
    } catch (err) {
      toast.error("Erro ao salvar");
    }
  };
  const handleDelete = async (item) => {
    try {
      await inventoryService.delete(item.id);
      setInventoryState(prev => prev.filter(i => i.id !== item.id));
      toast.success("Produto excluído");
    } catch (err) {
      toast.error("Erro ao excluir");
    }
  };
  const handleMove = async (id, from, to) => {
    try {
      const saved = await inventoryService.update(id, { status: to });
      setInventoryState(prev => prev.map(i => String(i.id) === String(id) ? saved : i));
    } catch (err) {
      toast.error("Erro ao mover");
    }
  };

  const renderContent = () => {
    const filtered = (Array.isArray(inventoryState) ? inventoryState : []).filter((item) => {
      const matchesStatus = !statusFilter || String(item?.status || "").toLowerCase() === statusFilter;
      if (!matchesStatus) return false;
      if (!dateStart && !dateEnd) return true;
      const d = new Date(item?.createdAt || item?.updatedAt || Date.now());
      if (Number.isNaN(d.getTime())) return true;
      if (dateStart) {
        const start = new Date(dateStart);
        start.setHours(0, 0, 0, 0);
        if (d < start) return false;
      }
      if (dateEnd) {
        const end = new Date(dateEnd);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });

    switch (activeTab) {
      case "board":
        return (
          <KanbanBoard
            columns={[
              { id: "in_stock", title: "Em Estoque", color: "#10B981" },
              { id: "low_stock", title: "Estoque Baixo", color: "#F59E0B" },
              { id: "out_of_stock", title: "Sem Estoque", color: "#EF4444" },
              { id: "ordered", title: "Pedido Efetuado", color: "#3B82F6" }
            ]}
            statusResolver={(status) => {
              const s = String(status || "").toLowerCase();
              if (["in_stock","em estoque","estoque"].includes(s)) return "in_stock";
              if (["low_stock","estoque baixo","baixo"].includes(s)) return "low_stock";
              if (["out_of_stock","sem estoque","esgotado"].includes(s)) return "out_of_stock";
              if (["ordered","pedido efetuado","pedido"].includes(s)) return "ordered";
              return "in_stock";
            }}
            activities={filtered.map((i) => ({
              id: i.id,
              title: i.name || "Sem nome",
              description: `Qtd: ${i.quantity ?? 0}  •  R$ ${Number(i.price || 0).toFixed(2)}`,
              date: i.createdAt || i.updatedAt || null,
              status: String(i.status || "").toLowerCase()
            }))}
            onAdd={() => handleOpen(null)}
            onMove={(id, from, to) => handleMove(id, from, to)}
            onDelete={(activity) => {
              const item = inventoryState.find((x) => String(x.id) === String(activity.id));
              if (item) handleDelete(item);
            }}
          />
        );
      case "list":
        return <InventoryList data={filtered} loading={loading} onEdit={handleOpen} onDelete={handleDelete} />;
      default:
        return (
          <KanbanBoard
            columns={[
              { id: "in_stock", title: "Em Estoque", color: "#10B981" },
              { id: "low_stock", title: "Estoque Baixo", color: "#F59E0B" },
              { id: "out_of_stock", title: "Sem Estoque", color: "#EF4444" },
              { id: "ordered", title: "Pedido Efetuado", color: "#3B82F6" }
            ]}
            statusResolver={(status) => {
              const s = String(status || "").toLowerCase();
              if (["in_stock","em estoque","estoque"].includes(s)) return "in_stock";
              if (["low_stock","estoque baixo","baixo"].includes(s)) return "low_stock";
              if (["out_of_stock","sem estoque","esgotado"].includes(s)) return "out_of_stock";
              if (["ordered","pedido efetuado","pedido"].includes(s)) return "ordered";
              return "in_stock";
            }}
            activities={filtered.map((i) => ({
              id: i.id,
              title: i.name || "Sem nome",
              description: `Qtd: ${i.quantity ?? 0}  •  R$ ${Number(i.price || 0).toFixed(2)}`,
              date: i.createdAt || i.updatedAt || null,
              status: String(i.status || "").toLowerCase()
            }))}
            onAdd={() => handleOpen(null)}
            onMove={(id, from, to) => handleMove(id, from, to)}
            onDelete={(activity) => {
              const item = inventoryState.find((x) => String(x.id) === String(activity.id));
              if (item) handleDelete(item);
            }}
          />
        );
    }
  };

  return (
    <MainContainer>
      <ActivitiesStyleLayout
        viewModes={tabs}
        currentViewMode={activeTab}
        onViewModeChange={setActiveTab}
        disableFilterBar={false}
        hideDefaultRightFilters
        hideLeftIcon
        searchPlaceholder="Buscar..."
        searchValue={searchParam}
        onSearchChange={setSearchParam}
        onCreateClick={() => handleOpen(null)}
        rightFilters={({ classes: layout }) => (
          <>
            <div className={layout.filterItem} onClick={(e) => setAnchorStatus(e.currentTarget)}>
              <Typography className={layout.filterLabel}>
                {statusFilter
                  ? ({
                      in_stock: "Em Estoque",
                      low_stock: "Estoque Baixo",
                      out_of_stock: "Sem Estoque",
                      ordered: "Pedido Efetuado",
                    }[statusFilter] || "Status")
                  : "Status"}
              </Typography>
              <ExpandMoreIcon className={layout.chevronIcon} style={{ fontSize: 11 }} />
            </div>
            <Popover
              open={Boolean(anchorStatus)}
              anchorEl={anchorStatus}
              onClose={() => setAnchorStatus(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            >
              <div style={{ padding: 8, minWidth: 220 }}>
                {[
                  { value: "", label: "Todos" },
                  { value: "in_stock", label: "Em Estoque" },
                  { value: "low_stock", label: "Estoque Baixo" },
                  { value: "out_of_stock", label: "Sem Estoque" },
                  { value: "ordered", label: "Pedido Efetuado" },
                ].map((opt) => (
                  <div
                    key={opt.value || "all"}
                    onClick={() => {
                      setStatusFilter(opt.value);
                      setAnchorStatus(null);
                    }}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: statusFilter === opt.value || (!statusFilter && !opt.value) ? 600 : 400,
                      color: statusFilter === opt.value || (!statusFilter && !opt.value) ? theme.palette.primary.main : theme.palette.text.primary,
                      backgroundColor: statusFilter === opt.value || (!statusFilter && !opt.value)
                        ? (theme.palette.type === "dark" ? "rgba(96,165,250,0.12)" : "rgba(59,130,246,0.06)")
                        : "transparent",
                    }}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            </Popover>

            <div className={layout.filterItem} onClick={(e) => setAnchorPeriodo(e.currentTarget)}>
              <CalendarIcon className={layout.calendarIcon} style={{ fontSize: 11 }} />
              <Typography className={layout.filterLabel}>
                {dateStart && dateEnd ? `${dateStart.slice(8,10)}/${dateStart.slice(5,7)} – ${dateEnd.slice(8,10)}/${dateEnd.slice(5,7)}` : "Período"}
              </Typography>
              <ExpandMoreIcon className={layout.chevronIcon} style={{ fontSize: 11 }} />
            </div>
            <Popover
              open={Boolean(anchorPeriodo)}
              anchorEl={anchorPeriodo}
              onClose={() => setAnchorPeriodo(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
              PaperProps={{ style: { borderRadius: 6, boxShadow: '0 4px 24px rgba(0,0,0,0.12)', border: 'none', minWidth: 240 } }}
            >
              <div style={{ padding: 12 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)}
                    style={{ flex: 1, padding: '5px 6px', fontSize: 11, borderRadius: 4, border: `1px solid ${theme.palette.type === "dark" ? 'rgba(255,255,255,0.15)' : '#d1d5db'}`, background: theme.palette.type === "dark" ? 'rgba(255,255,255,0.06)' : '#fff', color: theme.palette.type === "dark" ? '#e5e7eb' : '#111', outline: 'none' }}
                  />
                  <span style={{ fontSize: 10, color: theme.palette.type === "dark" ? '#9ca3af' : '#6b7280' }}>–</span>
                  <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)}
                    style={{ flex: 1, padding: '5px 6px', fontSize: 11, borderRadius: 4, border: `1px solid ${theme.palette.type === "dark" ? 'rgba(255,255,255,0.15)' : '#d1d5db'}`, background: theme.palette.type === "dark" ? 'rgba(255,255,255,0.06)' : '#fff', color: theme.palette.type === "dark" ? '#e5e7eb' : '#111', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, gap: 6 }}>
                  <div onClick={() => { setDateStart(""); setDateEnd(""); setAnchorPeriodo(null); }}
                    style={{ padding: '4px 10px', fontSize: 11, fontWeight: 500, cursor: 'pointer', borderRadius: 4, color: theme.palette.type === "dark" ? '#9ca3af' : '#6b7280' }}
                  >Limpar</div>
                  <div onClick={() => setAnchorPeriodo(null)}
                    style={{ padding: '4px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer', borderRadius: 4, backgroundColor: '#3b82f6', color: '#fff' }}
                  >Aplicar</div>
                </div>
              </div>
            </Popover>
          </>
        )}
        navActions={
          <>
            
            <IconButton title="Metas" onClick={() => setGoalsOpen(true)}>
              <FlagOutlinedIcon />
            </IconButton>
            <IconButton title="Importar Itens" onClick={() => setOpenImport(true)}>
              <CloudUploadIcon />
            </IconButton>
          </>
        }
      >
        <div className={classes.content}>
          {renderContent()}
        </div>
      </ActivitiesStyleLayout>

      <Drawer
        anchor="right"
        open={openModal}
        onClose={handleClose}
        classes={{ paper: classes.drawerPaper }}
        BackdropProps={{ className: classes.backdrop }}
      >
        <div className={classes.drawerContainer}>
          <div className={classes.drawerHeader}>
            <Typography variant="h6" className={classes.drawerTitle}>
              {editItem ? "Editar Produto" : "Novo Produto"}
            </Typography>
            <IconButton onClick={handleClose} aria-label="fechar" className={classes.drawerClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </div>

          <div className={classes.drawerContent}>
            <TextField
              className={classes.titleInput}
              placeholder="Nome do produto"
              name="name"
              value={form.name}
              onChange={handleChange}
              fullWidth
              InputProps={{ disableUnderline: true }}
              autoFocus
            />

            <Box className={classes.descRow}>
              <DescIcon className={classes.descIcon} />
              <TextField
                className={classes.descInput}
                placeholder="Adicionar descrição do produto"
                name="description"
                value={form.description}
                onChange={handleChange}
                fullWidth
                multiline
                InputProps={{ disableUnderline: true }}
              />
            </Box>

            <Box className={classes.fieldRow}>
              <AttachMoneyOutlinedIcon className={classes.fieldIcon} />
              <span className={classes.fieldLabel}>Preço</span>
              <TextField
                className={classes.fieldInput}
                placeholder="0,00"
                name="price"
                value={form.price}
                onChange={handleChange}
                InputProps={{ disableUnderline: true }}
              />
              <FormControl className={classes.fieldSelect} style={{ flex: '0 0 90px' }}>
                <Select
                  name="currency"
                  value={form.currency}
                  onChange={handleChange}
                  disableUnderline
                  style={{ fontSize: 13 }}
                >
                  <MenuItem value="BRL">R$</MenuItem>
                  <MenuItem value="USD">US$</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box className={classes.fieldRow}>
              <CheckCircleOutlineIcon className={classes.fieldIcon} />
              <span className={classes.fieldLabel}>Quantidade</span>
              <TextField
                className={classes.fieldInput}
                placeholder="0"
                name="quantity"
                type="number"
                value={form.quantity}
                onChange={handleChange}
                InputProps={{ disableUnderline: true }}
              />
            </Box>

            <Box className={classes.fieldRow}>
              <SkuIcon className={classes.fieldIcon} />
              <span className={classes.fieldLabel}>SKU</span>
              <TextField
                className={classes.fieldInput}
                placeholder="Código SKU"
                name="sku"
                value={form.sku}
                onChange={handleChange}
                InputProps={{ disableUnderline: true }}
              />
            </Box>

            <Box className={classes.fieldRow}>
              <CategoryIcon className={classes.fieldIcon} />
              <span className={classes.fieldLabel}>Categoria</span>
              <TextField
                className={classes.fieldInput}
                placeholder="Ex: Eletrônicos"
                name="category"
                value={form.category}
                onChange={handleChange}
                InputProps={{ disableUnderline: true }}
              />
            </Box>

            <Box className={classes.fieldRow}>
              <BrandIcon className={classes.fieldIcon} />
              <span className={classes.fieldLabel}>Marca</span>
              <TextField
                className={classes.fieldInput}
                placeholder="Ex: Samsung"
                name="brand"
                value={form.brand}
                onChange={handleChange}
                InputProps={{ disableUnderline: true }}
              />
            </Box>

            <Box className={classes.fieldRow}>
              <FlagOutlinedIcon className={classes.fieldIcon} />
              <span className={classes.fieldLabel}>Status</span>
              <FormControl className={classes.fieldSelect}>
                <Select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  disableUnderline
                  style={{ fontSize: 13 }}
                >
                  <MenuItem value="in_stock">Em Estoque</MenuItem>
                  <MenuItem value="low_stock">Estoque Baixo</MenuItem>
                  <MenuItem value="out_of_stock">Sem Estoque</MenuItem>
                  <MenuItem value="ordered">Pedido Efetuado</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box className={classes.imageSection}>
              <input id="inventory-image-input" type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageFile} />
              <Button
                variant="outlined"
                size="small"
                className={classes.imageBtn}
                startIcon={<PhotoIcon style={{ fontSize: 16 }} />}
                onClick={() => document.getElementById("inventory-image-input").click()}
              >
                {form.image ? "Trocar imagem" : "Anexar imagem"}
              </Button>
              {form.image && (
                <Avatar variant="rounded" src={form.image} style={{ width: 48, height: 48, borderRadius: 8 }} />
              )}
            </Box>
          </div>

          <div className={classes.drawerActions}>
            <Button onClick={handleClose} style={{ fontSize: 13, textTransform: 'none' }}>Cancelar</Button>
            <Button
              color="primary"
              variant="contained"
              onClick={handleSave}
              disabled={!(form.name || "").trim()}
              style={{ fontSize: 13, textTransform: 'none', borderRadius: 8, minWidth: 80, height: 34, boxShadow: 'none' }}
            >
              {editItem ? "Salvar" : "Criar"}
            </Button>
          </div>
        </div>
      </Drawer>

      <Drawer
        anchor="right"
        open={openImport}
        onClose={() => setOpenImport(false)}
        classes={{ paper: classes.importDrawerPaper }}
      >
        <div className={classes.drawerContainer}>
          <div className={classes.importHeader}>
            <Typography variant="h6" className={classes.drawerTitle} style={{ textAlign: "center" }}>
              Importar Itens do Inventário
            </Typography>
            <IconButton onClick={() => setOpenImport(false)} aria-label="fechar" className={classes.importClose}>
              <CloseIcon />
            </IconButton>
          </div>
          <div className={classes.drawerContent}>
            <Typography className={classes.importIntro}>
              Use uma planilha .xlsx ou .csv seguindo o modelo. Recomendado salvar em UTF-8.
            </Typography>
            <div className={classes.importBox}>
              <Typography variant="subtitle2" style={{ marginBottom: 6 }}>
                Estrutura esperada
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>name (obrigatório)</li>
                <li>price e currency (BRL ou USD)</li>
                <li>quantity e status [in_stock, low_stock, out_of_stock, ordered]</li>
                <li>sku, category, brand, description, image (opcional)</li>
              </ul>
              <Typography variant="caption" color="textSecondary" style={{ display: "block", marginTop: 8 }}>
                Também aceitamos cabeçalhos em PT equivalentes: Preco/Valor → price, Quantidade/Qtd → quantity, Moeda → currency, Descricao → description, Imagem → image.
              </Typography>
            </div>
            <Typography variant="body2" style={{ marginBottom: 6 }}>
              Passo a passo
            </Typography>
            <ol style={{ marginTop: 0, paddingLeft: 18 }}>
              <li>Baixe o modelo e preencha seus itens.</li>
              <li>Salve como .csv ou .xlsx.</li>
              <li>Clique em “Selecionar arquivo” e escolha sua planilha.</li>
              <li>Pressione “Importar”. Os itens aparecerão na lista e no quadro.</li>
            </ol>
            <div style={{ display: "flex", gap: 8 }}>
              <Button
                onClick={() => {
                  const headers = ["name","price","currency","quantity","status","sku","category","brand","description","image"];
                  const example = [
                    ["Capa de Celular", "39.9", "BRL", "10", "in_stock","C-001","Acessórios","VB","Capa silicone",""],
                    ["Suporte Articulado","19.9","BRL","3","low_stock","","Suportes","","",""]
                  ];
                  const csv = [headers.join(","), ...example.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(","))].join("\n");
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "modelo_inventario.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Baixar modelo (.csv)
              </Button>
            </div>
            <div style={{ marginTop: 16 }}>
              <input
                id="inventory-import-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: "none" }}
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
              <Button variant="outlined" onClick={() => document.getElementById("inventory-import-input").click()}>
                Selecionar arquivo
              </Button>
              <span style={{ marginLeft: 8, fontSize: 13 }}>
                {importFile ? importFile.name : "Nenhum arquivo selecionado"}
              </span>
            </div>
          </div>
          <div className={classes.drawerActions}>
            <Button onClick={() => setOpenImport(false)}>Cancelar</Button>
            <Button
              color="primary"
              variant="contained"
              disabled={!importFile || importing}
              onClick={async () => {
                if (!importFile) return;
                setImporting(true);
                try {
                  const data = await inventoryService.importFile(importFile);
                  const items = Array.isArray(data?.items) ? data.items : [];
                  if (items.length) {
                    setInventoryState(prev => [...items, ...prev]);
                  }
                  toast.success(`Importação concluída (${data?.created || items.length} itens)`);
                  setOpenImport(false);
                  setImportFile(null);
                } catch (err) {
                  toast.error("Falha ao importar planilha");
                } finally {
                  setImporting(false);
                }
              }}
            >
              {importing ? "Importando..." : "Importar"}
            </Button>
          </div>
        </div>
      </Drawer>

      <Drawer
        anchor="right"
        open={goalsOpen}
        onClose={() => setGoalsOpen(false)}
        classes={{ paper: classes.drawerPaper }}
        BackdropProps={{ className: classes.backdrop }}
      >
        <div className={classes.drawerContainer}>
          <div className={classes.drawerHeader}>
            <Typography variant="h6" className={classes.drawerTitle}>
              Metas de Inventário
            </Typography>
            <IconButton onClick={() => setGoalsOpen(false)} aria-label="fechar" className={classes.drawerClose}>
              <CloseIcon />
            </IconButton>
          </div>

          <div className={classes.drawerContent}>
            <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
              Defina metas de vendas e faturamento por produto. Acompanhe o desempenho da equipe.
            </Typography>

            {inventoryState.length === 0 ? (
              <Typography variant="body2" color="textSecondary">Nenhum produto cadastrado.</Typography>
            ) : (
              inventoryState.map((item) => {
                const goal = goals.find(g => String(g.productId) === String(item.id)) || {};
                return (
                  <Paper
                    key={item.id}
                    elevation={0}
                    style={{
                      border: theme.palette.type === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E5E7EB',
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 12,
                      background: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.04)' : '#FAFBFC'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      {item.image ? (
                        <Avatar variant="rounded" src={item.image} style={{ width: 36, height: 36 }} />
                      ) : (
                        <Avatar variant="rounded" style={{ width: 36, height: 36, background: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.08)' : '#E5E7EB', color: theme.palette.text.primary, fontSize: 14 }}>
                          {(item.name || 'P')[0]}
                        </Avatar>
                      )}
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Typography variant="subtitle2" style={{ fontWeight: 600 }}>{item.name}</Typography>
                          
                        </div>
                        <Typography variant="caption" color="textSecondary">
                          Estoque atual: {item.quantity || 0}
                        </Typography>
                      </div>
                    </div>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <TextField
                          label="Meta de Vendas (qtd)"
                          type="number"
                          size="small"
                          variant="outlined"
                          fullWidth
                          value={goal.salesTarget || ''}
                          onChange={(e) => {
                            setGoals(prev => {
                              const existing = prev.find(g => String(g.productId) === String(item.id));
                              if (existing) {
                                return prev.map(g => String(g.productId) === String(item.id) ? { ...g, salesTarget: e.target.value } : g);
                              }
                              return [...prev, { productId: item.id, salesTarget: e.target.value, revenueTarget: '', responsible: '' }];
                            });
                          }}
                          InputProps={{ inputProps: { min: 0 } }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          label="Meta Faturamento (R$)"
                          type="number"
                          size="small"
                          variant="outlined"
                          fullWidth
                          value={goal.revenueTarget || ''}
                          onChange={(e) => {
                            setGoals(prev => {
                              const existing = prev.find(g => String(g.productId) === String(item.id));
                              if (existing) {
                                return prev.map(g => String(g.productId) === String(item.id) ? { ...g, revenueTarget: e.target.value } : g);
                              }
                              return [...prev, { productId: item.id, salesTarget: '', revenueTarget: e.target.value, responsible: '' }];
                            });
                          }}
                          InputProps={{ inputProps: { min: 0 } }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <FormControl variant="outlined" size="small" fullWidth>
                          <InputLabel>Responsável</InputLabel>
                          <Select
                            label="Responsável"
                            value={goal.responsible || ''}
                            onChange={(e) => {
                              setGoals(prev => {
                                const existing = prev.find(g => String(g.productId) === String(item.id));
                                if (existing) {
                                  return prev.map(g => String(g.productId) === String(item.id) ? { ...g, responsible: e.target.value } : g);
                                }
                                return [...prev, { productId: item.id, salesTarget: '', revenueTarget: '', responsible: e.target.value }];
                              });
                            }}
                          >
                            <MenuItem value="">
                              <em>Nenhum</em>
                            </MenuItem>
                            {orgUsers.map((u) => (
                              <MenuItem key={u.id} value={u.name}>{u.name}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </Paper>
                );
              })
            )}
          </div>

          <div className={classes.drawerActions}>
            <Button onClick={() => setGoalsOpen(false)}>Cancelar</Button>
            <Button
              color="primary"
              variant="contained"
              onClick={() => {
                toast.success("Metas salvas com sucesso!");
                setGoalsOpen(false);
              }}
            >
              Salvar Metas
            </Button>
          </div>
        </div>
      </Drawer>
    </MainContainer>
  );
};

export default Inventory;
