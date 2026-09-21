/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Popover,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  InputAdornment,
  Chip,
  Divider,
} from "@mui/material";
import { 
  Close as CloseIcon, 
  Help as HelpIcon,
  CompareArrows as CompareArrowsIcon,
  Code as CodeIcon,
  Search as SearchIcon,
  Tag as TagIcon,
} from "@mui/icons-material";

const FlowBuilderConditionCompareModal = ({ open, onSave, data, onUpdate, close }) => {
  const [leftValue, setLeftValue] = useState("");
  const [rightValue, setRightValue] = useState("");
  const [operator, setOperator] = useState("equals");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeField, setActiveField] = useState(null);

  const availableVariables = [
    { name: "nome", description: "Nome do contato", category: "Contato" },
    { name: "email", description: "Email do contato", category: "Contato" },
    { name: "telefone", description: "Telefone do contato", category: "Contato" },
    { name: "ultimaMensagem", description: "Última mensagem recebida", category: "Mensagem" },
    { name: "dataContato", description: "Data do último contato", category: "Contato" },
    { name: "apiResponse", description: "Resposta da última requisição HTTP", category: "API" },
  ];

  const categoryOrder = ["Contato", "Mensagem", "API"];
  const groupedVariables = availableVariables.reduce((acc, variable) => {
    if (!acc[variable.category]) {
      acc[variable.category] = [];
    }
    acc[variable.category].push(variable);
    return acc;
  }, {});

  const comparisonOperators = [
    { value: "equals", label: "Igual a", icon: "=" },
    { value: "notEquals", label: "Diferente de", icon: "≠" },
    { value: "contains", label: "Contém", icon: "∈" },
    { value: "startsWith", label: "Começa com", icon: "⊰" },
    { value: "endsWith", label: "Termina com", icon: "⊱" },
    { value: "greaterThan", label: "Maior que", icon: ">" },
    { value: "lessThan", label: "Menor que", icon: "<" },
    { value: "greaterOrEqual", label: "Maior ou igual a", icon: "≥" },
    { value: "lessOrEqual", label: "Menor ou igual a", icon: "≤" },
    { value: "isEmpty", label: "Está vazio", icon: "∅" },
    { value: "isNotEmpty", label: "Não está vazio", icon: "¬∅" },
  ];

  const isUnaryOperator = operator === "isEmpty" || operator === "isNotEmpty";

  useEffect(() => {
    if (open === "edit" && data) {
      setLeftValue(data.data.leftValue || "");
      setRightValue(data.data.rightValue || "");
      setOperator(data.data.operator || "equals");
    } else {
      setLeftValue("");
      setRightValue("");
      setOperator("equals");
    }
    setError("");
  }, [open, data]);

  const handleSave = () => {
    if (!leftValue) {
      setError("O primeiro valor é obrigatório");
      return;
    }

    if (!isUnaryOperator && !rightValue) {
      setError("O segundo valor é obrigatório para este operador");
      return;
    }

    setIsSubmitting(true);

    try {
      const conditionData = {
        leftValue,
        operator,
        rightValue: isUnaryOperator ? "" : rightValue,
      };

      if (open === "edit" && data) {
        onUpdate({
          ...data,
          data: conditionData,
        });
      } else {
        onSave(conditionData);
      }
      
      setIsSubmitting(false);
      resetFields();
      close(false);
    } catch (error) {
      console.error("Erro ao salvar condição:", error);
      setError("Ocorreu um erro ao salvar. Tente novamente.");
      setIsSubmitting(false);
    }
  };

  const resetFields = () => {
    setLeftValue("");
    setRightValue("");
    setOperator("equals");
    setError("");
    setSearchTerm("");
  };

  const handleClose = () => {
    resetFields();
    close(false);
  };

  const handleVariableClick = (event, field) => {
    setActiveField(field);
    setAnchorEl(event.currentTarget);
    setSearchTerm("");
  };

  const insertVariable = (variableName) => {
    const value = "\${" + variableName + "}";
    if (activeField === "left") {
      setLeftValue(leftValue + value);
    } else {
      setRightValue(rightValue + value);
    }
    setAnchorEl(null);
  };

  const filteredVariables = availableVariables.filter(
    (variable) =>
      variable.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      variable.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog 
      open={open !== false} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
        },
      }}
    >
      <DialogTitle 
        sx={{ 
          bgcolor: "#f8f9fa", 
          display: "flex", 
          alignItems: "center",
          justifyContent: "space-between", 
          p: 2,
          borderBottom: "1px solid #e9ecef",
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CompareArrowsIcon sx={{ color: "#9c27b0" }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {open === "edit" ? "Editar Comparação" : "Nova Comparação"}
          </Typography>
        </Stack>
        <IconButton 
          size="small" 
          onClick={handleClose} 
          sx={{ 
            color: "text.secondary",
            "&:hover": { 
              bgcolor: "rgba(0,0,0,0.04)" 
            } 
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Valor 1
              </Typography>
              <Tooltip title="Este é o valor que será comparado. Pode ser texto fixo ou uma variável.">
                <HelpIcon fontSize="small" sx={{ color: "text.secondary" }} />
              </Tooltip>
            </Stack>
            <TextField
              fullWidth
              value={leftValue}
              onChange={(e) => setLeftValue(e.target.value)}
              placeholder="Digite um valor ou selecione uma variável"
              variant="outlined"
              size="small"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      variant="text"
                      size="small"
                      onClick={(e) => handleVariableClick(e, "left")}
                      startIcon={<CodeIcon />}
                      sx={{ 
                        color: "#9c27b0",
                        "&:hover": {
                          bgcolor: "rgba(156, 39, 176, 0.04)",
                        },
                      }}
                    >
                      Variável
                    </Button>
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
          <FormControl fullWidth>
            <InputLabel id="operador-comparacao-label">
              Operador de Comparação
            </InputLabel>
            <Select
              labelId="operador-comparacao-label"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              label="Operador de Comparação"
              sx={{
                "& .MuiSelect-select": {
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                },
              }}
            >
              {comparisonOperators.map((op) => (
                <MenuItem 
                  key={op.value} 
                  value={op.value}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Chip 
                    label={op.icon} 
                    size="small" 
                    sx={{ 
                      bgcolor: "rgba(156, 39, 176, 0.08)",
                      color: "#9c27b0",
                      fontWeight: "bold",
                      minWidth: 32,
                    }} 
                  />
                  {op.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {!isUnaryOperator && (
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Valor 2
                </Typography>
                <Tooltip title="Este é o valor com o qual o primeiro valor será comparado. Pode ser texto fixo ou uma variável.">
                  <HelpIcon fontSize="small" sx={{ color: "text.secondary" }} />
                </Tooltip>
              </Stack>
              <TextField
                fullWidth
                value={rightValue}
                onChange={(e) => setRightValue(e.target.value)}
                placeholder="Digite um valor ou selecione uma variável"
                variant="outlined"
                size="small"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        variant="text"
                        size="small"
                        onClick={(e) => handleVariableClick(e, "right")}
                        startIcon={<CodeIcon />}
                        sx={{ 
                          color: "#9c27b0",
                          "&:hover": {
                            bgcolor: "rgba(156, 39, 176, 0.04)",
                          },
                        }}
                      >
                        Variável
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>
          )}

          {error && (
            <Typography 
              color="error" 
              variant="body2" 
              align="center"
              sx={{
                bgcolor: "rgba(211, 47, 47, 0.04)",
                py: 1,
                borderRadius: 1,
              }}
            >
              {error}
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions 
        sx={{ 
          px: 3, 
          py: 2, 
          bgcolor: "#f8f9fa",
          borderTop: "1px solid #e9ecef",
        }}
      >
        <Button 
          onClick={handleClose}
          variant="outlined"
          sx={{ 
            borderRadius: 2,
            textTransform: "none",
            borderColor: "#dee2e6",
            color: "text.secondary",
            "&:hover": {
              borderColor: "#ced4da",
              bgcolor: "#f8f9fa",
            },
          }}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={isSubmitting}
          sx={{ 
            borderRadius: 2,
            textTransform: "none",
            bgcolor: "#9c27b0",
            "&:hover": {
              bgcolor: "#7b1fa2",
            },
            "&:disabled": {
              bgcolor: "#e9ecef",
            },
          }}
        >
          {isSubmitting ? "Salvando..." : open === "edit" ? "Salvar alterações" : "Adicionar"}
        </Button>
      </DialogActions>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        PaperProps={{
          sx: {
            width: 320,
            mt: 1,
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
            borderRadius: 2,
          },
        }}
      >
        <Paper sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#1a1a1a" }}>
                Selecionar Variável
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Estas são variáveis de exemplo. Configure as variáveis reais no nó de Variável Global ou em outros nós do fluxo.
              </Typography>
            </Stack>

            <TextField
              fullWidth
              size="small"
              placeholder="Buscar variável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
              }}
            />
            
            <Divider />

            {filteredVariables.length > 0 ? (
              <List sx={{ maxHeight: 300, overflow: "auto" }}>
                {categoryOrder.map((category) => {
                  const variables = groupedVariables[category];
                  if (!variables || variables.length === 0) return null;

                  return (
                    <React.Fragment key={category}>
                      <ListItem sx={{ py: 0 }}>
                        <Typography 
                          variant="overline" 
                          sx={{ 
                            color: "text.secondary",
                            fontWeight: 600,
                            fontSize: "0.75rem"
                          }}
                        >
                          {category}
                        </Typography>
                      </ListItem>
                      {variables.map((variable) => (
                        <ListItem
                          key={variable.name}
                          button
                          onClick={() => insertVariable(variable.name)}
                          sx={{
                            borderRadius: 1,
                            mb: 0.5,
                            "&:hover": {
                              bgcolor: "rgba(156, 39, 176, 0.04)",
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            <TagIcon sx={{ color: "#9c27b0" }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={variable.name}
                            secondary={
                              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                                {variable.description}
                                <Typography 
                                  component="span" 
                                  variant="caption" 
                                  sx={{ 
                                    color: "warning.main",
                                    display: "block",
                                    mt: 0.5,
                                    fontSize: "0.7rem"
                                  }}
                                >
                                  (Configure no nó de Variável Global)
                                </Typography>
                              </Typography>
                            }
                            primaryTypographyProps={{
                              variant: "subtitle2",
                              sx: { fontWeight: 600 },
                            }}
                          />
                        </ListItem>
                      ))}
                    </React.Fragment>
                  );
                })}
              </List>
            ) : (
              <Typography 
                variant="body2" 
                sx={{ 
                  textAlign: "center", 
                  py: 2, 
                  color: "text.secondary" 
                }}
              >
                Nenhuma variável encontrada
              </Typography>
            )}
          </Stack>
        </Paper>
      </Popover>
    </Dialog>
  );
};

export default FlowBuilderConditionCompareModal;