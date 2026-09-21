/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { memo, useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Paper,
  Tooltip
} from "@mui/material";
import {
  QuestionAnswer,
  Code as VariablesIcon,
  ContentCopy as ContentCopyIcon,
  DeleteOutline as DeleteOutlineIcon,
  Save as SaveIcon
} from "@mui/icons-material";

import { Handle } from "react-flow-renderer";
import { useNodeStorage } from "../../../stores/useNodeStorage";
import { processVariablesInText } from "../../../utils/variableUtils";

export default memo(({ data, isConnectable, id }) => {
  const storageItems = useNodeStorage();
  const [processedQuestion, setProcessedQuestion] = useState(data.question || "");
  const [variableValue, setVariableValue] = useState("");
  const [isExecutionMode, setIsExecutionMode] = useState(false);
 
  const extractVariables = (text) => {
    if (!text) return [];
    const regex = /\$\{([^}]+)\}/g;
    const matches = [];
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      matches.push(match[1]);
    }
    
    return [...new Set(matches)];
  };

  const updateProcessedQuestion = useCallback(() => {
    const originalText = data.question || "";
    const newText = processVariablesInText(originalText);
    setProcessedQuestion(newText);
  }, [data.question]);
  

  useEffect(() => {
    const isExecutionPath = !window.location.pathname.includes('/flowbuilder-config');
    setIsExecutionMode(isExecutionPath);
    
 
    if (isExecutionPath && data.variableName) {
      const checkVariableValue = () => {
        if (window.flowVariables && window.flowVariables[data.variableName]) {
          setVariableValue(window.flowVariables[data.variableName]);
        }
      };
    
      checkVariableValue();
      
      const intervalId = setInterval(checkVariableValue, 1000);
      
      return () => clearInterval(intervalId);
    }
  }, [data.variableName]);

  useEffect(() => {
    updateProcessedQuestion();

    const handleVariableUpdate = () => {
      console.log('[inputNode] Detectada atualização de variáveis');
      updateProcessedQuestion();
    };
 
    window.addEventListener('flowVariableUpdate', handleVariableUpdate);
    
    const intervalId = setInterval(() => {
      updateProcessedQuestion();
    }, 500);
    

    return () => {
      window.removeEventListener('flowVariableUpdate', handleVariableUpdate);
      clearInterval(intervalId);
    };
  }, [data.question, updateProcessedQuestion]);

  return (
    <Box
      sx={{
        backgroundColor: "#fff",
        borderRadius: 2,
        boxShadow: 2,
        p: 2,
        width: 280,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        position: "relative",
        border: "1px solid rgba(156, 39, 176, 0.2)"
      }}
    >
      <Handle
        type="target"
        position="left"
        style={{
          left: -8,
          top: "50%",
          transform: "translateY(-50%)",
          background: "#9c27b0",
          width: 12,
          height: 12,
          cursor: 'pointer'
        }}
        onConnect={params => console.log("handle onConnect", params)}
        isConnectable={isConnectable}
      />

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <QuestionAnswer fontSize="small" sx={{ color: '#9c27b0' }} />
          <Typography variant="subtitle1" fontWeight="bold">
            Input
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => {
              storageItems.setNodesStorage(id);
              storageItems.setAct("duplicate");
            }}
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
          
          <IconButton
            size="small"
            onClick={() => {
              storageItems.setNodesStorage(id);
              storageItems.setAct("delete");
            }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ 
        bgcolor: '#f9f4fb', 
        p: 1.5, 
        borderRadius: 1, 
        minHeight: '60px',
        overflow: 'auto',
        maxHeight: '150px',
        wordBreak: 'break-word',
        border: '1px solid rgba(156, 39, 176, 0.1)'
      }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          Pergunta:
        </Typography>
        
        {data.question ? (
          <Box>
            
            {!isExecutionMode ? (
              
              data.question.split(/\$\{([^}]+)\}/).map((part, index) => {
              
                if (index % 2 === 0) {
                  return <Typography key={index} variant="body2" component="span">{part}</Typography>;
                } else {
                 
                  return (
                    <Chip
                      key={index}
                      label={part}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.75rem',
                        bgcolor: 'rgba(156, 39, 176, 0.1)',
                        color: '#9c27b0',
                        border: '1px solid rgba(156, 39, 176, 0.2)',
                        my: 0.25,
                        mx: 0.5,
                        '& .MuiChip-label': { px: 1 }
                      }}
                    />
                  );
                }
              })
            ) : (
     
              <Typography variant="body2">{processedQuestion}</Typography>
            )}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Pergunta não definida
          </Typography>
        )}
      </Paper>
    
      <Paper elevation={0} sx={{ 
        bgcolor: '#f9f4fb', 
        p: 1.5, 
        borderRadius: 1, 
        minHeight: '40px',
        overflow: 'auto',
        wordBreak: 'break-word',
        border: '1px solid rgba(156, 39, 176, 0.1)'
      }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          Variável para armazenar resposta:
        </Typography>
        
        {data.variableName ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Chip
              label={data.variableName}
              size="small"
              sx={{
                height: 24,
                fontSize: '0.85rem',
                bgcolor: 'rgba(156, 39, 176, 0.1)',
                color: '#9c27b0',
                border: '1px solid rgba(156, 39, 176, 0.2)',
                '& .MuiChip-label': { px: 1.5 }
              }}
            />
            
            {isExecutionMode && variableValue && (
              <Tooltip title={`Valor: ${variableValue}`}>
                <Box sx={{ 
                  ml: 1.5, 
                  p: 0.75, 
                  borderRadius: 1, 
                  bgcolor: 'rgba(25, 118, 210, 0.1)',
                  border: '1px solid rgba(25, 118, 210, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}>
                  <SaveIcon fontSize="small" sx={{ color: '#1976d2', width: 16, height: 16 }} />
                  <Typography variant="caption" color="primary">
                    {variableValue.length > 15 ? `${variableValue.substring(0, 15)}...` : variableValue}
                  </Typography>
                </Box>
              </Tooltip>
            )}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Variável não definida
          </Typography>
        )}
      </Paper>
      
      {data.question && data.question.includes("${") && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          mt: 0.5,
          bgcolor: 'rgba(156, 39, 176, 0.05)',
          p: 0.75,
          borderRadius: 1
        }}>
          <VariablesIcon fontSize="small" sx={{ color: '#9c27b0', width: 16, height: 16 }} />
          <Typography variant="caption" sx={{ color: '#9c27b0' }}>
            Usando variáveis: {extractVariables(data.question).join(', ')}
          </Typography>
        </Box>
      )}
      
      <Handle
        type="source"
        position="right"
        id="a"
        style={{
          right: -8,
          top: "50%",
          transform: "translateY(-50%)",
          background: "#9c27b0",
          width: 12,
          height: 12,
          cursor: 'pointer'
        }}
        isConnectable={isConnectable}
      />
    </Box>
  );
});