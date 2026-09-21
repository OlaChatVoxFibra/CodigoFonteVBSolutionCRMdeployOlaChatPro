/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  Typography,
  Divider,
  Box,
  CircularProgress,
} from "@material-ui/core";
import { CompareArrows } from "@mui/icons-material";

const operators = [
  { value: "equals", label: "Igual a" },
  { value: "notEquals", label: "Diferente de" },
  { value: "contains", label: "Contém" },
  { value: "greaterThan", label: "Maior que" },
  { value: "lessThan", label: "Menor que" },
  { value: "greaterOrEqual", label: "Maior ou igual a" },
  { value: "lessOrEqual", label: "Menor ou igual a" },
  { value: "startsWith", label: "Começa com" },
  { value: "endsWith", label: "Termina com" },
  { value: "isEmpty", label: "Está vazio" },
  { value: "isNotEmpty", label: "Não está vazio" },
];

const FlowBuilderConditionCompareModal = ({
  open,
  onSave,
  data,
  onUpdate,
  close,
}) => {
  const [formData, setFormData] = useState({
    leftValue: "",
    operator: "equals",
    rightValue: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (data) {
      setFormData({
        leftValue: data.leftValue || "",
        operator: data.operator || "equals",
        rightValue: data.rightValue || "",
      });
    } else {
      setFormData({
        leftValue: "",
        operator: "equals",
        rightValue: "",
      });
    }
  }, [data, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = () => {
    setLoading(true);
    try {
      const nodeData = {
        leftValue: formData.leftValue,
        operator: formData.operator,
        rightValue: formData.operator === "isEmpty" || formData.operator === "isNotEmpty" 
          ? "" 
          : formData.rightValue,
      };

      if (data && data.id) {
        // Modo edição
        onUpdate({
          ...data,
          data: {
            ...data.data,
            ...nodeData,
          },
        });
      } else {
        // Modo criação
        onSave(nodeData);
      }
    } catch (error) {
      console.error("Erro ao salvar comparação:", error);
    } finally {
      setLoading(false);
      close();
    }
  };

  return (
    <Dialog
      open={!!open}
      onClose={close}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <CompareArrows />
          <Typography variant="h6">
            {data ? "Editar Comparação" : "Nova Comparação"}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Valor 1"
              name="leftValue"
              value={formData.leftValue}
              onChange={handleChange}
              variant="outlined"
              helperText="Pode ser texto fixo ou variável (ex: ${variavel})"
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              select
              fullWidth
              label="Operador"
              name="operator"
              value={formData.operator}
              onChange={handleChange}
              variant="outlined"
            >
              {operators.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          
          {(formData.operator !== "isEmpty" && formData.operator !== "isNotEmpty") && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Valor 2"
                name="rightValue"
                value={formData.rightValue}
                onChange={handleChange}
                variant="outlined"
                helperText="Pode ser texto fixo ou variável (ex: ${variavel})"
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={close} color="secondary">
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          color="primary"
          variant="contained"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : "Salvar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FlowBuilderConditionCompareModal;