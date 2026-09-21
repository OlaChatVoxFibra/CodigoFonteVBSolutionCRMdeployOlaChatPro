/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useContext } from "react";
import {
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControlLabel,
  Checkbox,
  Box,
  Chip,
} from "@material-ui/core";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
    width: "100%",
    boxSizing: "border-box",
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1.5),
    },
  },
  paper: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  title: {
    marginBottom: theme.spacing(2),
    color: theme.palette.primary.main,
  },
  addButton: {
    marginBottom: theme.spacing(2),
  },
  table: {
    minWidth: 0,
    width: "100%",
  },
  actionCell: {
    width: 120,
  },
  chip: {
    margin: theme.spacing(0.5),
  },
}));

const FinalizacaoAtendimento = ({ settings, onSettingsChange }) => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const [motivos, setMotivos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [editingMotivo, setEditingMotivo] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [informarValorVenda, setInformarValorVenda] = useState(false);

  useEffect(() => {
    if (settings) {
      setInformarValorVenda(settings.informarValorVenda || false);
    }
    fetchMotivos();
  }, [settings]);

  const fetchMotivos = async () => {
    try {
      const { data } = await api.get("/ticketFinalizationReasons");
      setMotivos(data);
    } catch (err) {
      console.error("Erro ao buscar motivos:", err);
    }
  };

  const handleOpenModal = (motivo = null) => {
    if (motivo) {
      setEditingMotivo(motivo);
      setFormData({
        name: motivo.name,
        description: motivo.description || "",
      });
    } else {
      setEditingMotivo(null);
      setFormData({
        name: "",
        description: "",
      });
    }
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditingMotivo(null);
    setFormData({
      name: "",
      description: "",
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Nome do motivo é obrigatório");
      return;
    }

    setLoading(true);
    try {
      if (editingMotivo) {
        await api.put(
          `/ticketFinalizationReasons/${editingMotivo.id}`,
          formData
        );
        toast.success("Motivo atualizado com sucesso!");
      } else {
        await api.post("/ticketFinalizationReasons", formData);
        toast.success("Motivo criado com sucesso!");
      }
      handleCloseModal();
      fetchMotivos();
    } catch (err) {
      toast.error(err.response?.data?.error || "Erro ao salvar motivo");
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir este motivo?")) {
      try {
        await api.delete(`/ticketFinalizationReasons/${id}`);
        toast.success("Motivo excluído com sucesso!");
        fetchMotivos();
      } catch (err) {
        toast.error(err.response?.data?.error || "Erro ao excluir motivo");
      }
    }
  };

  const handleInformarValorVendaChange = async (event) => {
    const newValue = event.target.checked;
    setInformarValorVenda(newValue);

    try {
      await api.put("/companySettings", {
        column: "informarValorVenda",
        data: newValue,
      });

      if (onSettingsChange) {
        onSettingsChange({ ...settings, informarValorVenda: newValue });
      }

      toast.success("Configuração atualizada com sucesso!");
    } catch (err) {
      toast.error("Erro ao atualizar configuração");
      setInformarValorVenda(!newValue); // Revert on error
    }
  };

  return (
    <div className={classes.root}>
      <Typography variant="h5" className={classes.title}>
        Finalização de Atendimento
      </Typography>

      {/* Configuração de Valor da Venda */}
      <Paper className={classes.paper}>
        <Typography variant="h6" gutterBottom>
          Configurações Gerais
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={informarValorVenda}
              onChange={handleInformarValorVendaChange}
              color="primary"
            />
          }
          label="Informar valor da venda ao finalizar atendimento"
        />
        <Typography variant="body2" color="textSecondary">
          Quando habilitado, o campo de valor da venda aparecerá no modal de
          finalização
        </Typography>
      </Paper>

      {/* Gestão de Motivos */}
      <Paper className={classes.paper}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h6">Motivos de Finalização</Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenModal()}
            className={classes.addButton}
          >
            Adicionar Motivo
          </Button>
        </Box>

        <TableContainer>
          <Table className={classes.table}>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell className={classes.actionCell}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {motivos.map((motivo) => (
                <TableRow key={motivo.id}>
                  <TableCell>
                    <Typography variant="body1">{motivo.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {motivo.description || "Sem descrição"}
                    </Typography>
                  </TableCell>
                  <TableCell className={classes.actionCell}>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenModal(motivo)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(motivo.id)}
                      color="secondary"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {motivos.length === 0 && (
          <Box textAlign="center" py={3}>
            <Typography variant="body2" color="textSecondary">
              Nenhum motivo cadastrado. Clique em "Adicionar Motivo" para
              começar.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Modal para Adicionar/Editar Motivo */}
      <Dialog
        open={openModal}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingMotivo ? "Editar Motivo" : "Adicionar Motivo"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome do Motivo"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                variant="outlined"
                margin="dense"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição (opcional)"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                variant="outlined"
                margin="dense"
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            color="primary"
            variant="contained"
            disabled={loading}
          >
            {loading
              ? "Salvando..."
              : editingMotivo
              ? "Atualizar"
              : "Adicionar"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default FinalizacaoAtendimento;
