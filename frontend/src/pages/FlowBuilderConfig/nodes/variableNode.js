/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  Button
} from '@mui/material';
import DataObjectIcon from '@mui/icons-material/DataObject';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Handle } from 'react-flow-renderer';
import { useNodeStorage } from '../../../stores/useNodeStorage';

const VariableNode = React.memo(({ data, id }) => {

  const [variableName, setVariableName] = useState(data.variableName || '');
  const [variableValue, setVariableValue] = useState(data.variableValue || '');
  const [variableType, setVariableType] = useState(data.variableType || 'text');
  const [savedStatus, setSavedStatus] = useState(data.savedStatus || '');
  const [showSavePopup, setShowSavePopup] = useState(false);
  

  const storageItems = useNodeStorage();


  useEffect(() => {
   
    data.variableName = variableName;
    data.variableValue = variableValue;
    data.variableType = variableType;
    data.savedStatus = savedStatus;
  }, [variableName, variableValue, variableType, savedStatus, data]);
  

  useEffect(() => {
    let timer;
    if (showSavePopup) {
      timer = setTimeout(() => {
        setShowSavePopup(false);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [showSavePopup]);


  const handleSave = useCallback(() => {
   
    if (variableName) {

      window.flowVariables = window.flowVariables || {};
      

      window.flowVariables[variableName] = variableValue;
      

      setSavedStatus('Salvo!');
      setShowSavePopup(true);
      

    }
  }, [variableName, variableValue, data]);

  return (
    <Box
      sx={{
        backgroundColor: '#fff',
        borderRadius: 2,
        boxShadow: 2,
        p: 2,
        width: 280,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        position: 'relative',
      }}
    >

      <Handle
        type="target"
        position="left"
        id="variable-in"
        style={{
          left: -8,
          top: '50%',
          transform: 'translateY(-50%)',
          background: '#555',
          width: 12,
          height: 12,
        }}
      />

      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <DataObjectIcon fontSize="small" sx={{ color: '#1976d2' }} />
          <Typography variant="subtitle1" fontWeight="bold">
            Variável Global
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

      <TextField
        label="Nome da variável"
        size="small"
        value={variableName}
        onChange={(e) => setVariableName(e.target.value)}
        fullWidth
        sx={{ mb: 1 }}
      />

      <TextField
        label="Valor"
        size="small"
        value={variableValue}
        onChange={(e) => setVariableValue(e.target.value)}
        fullWidth
        multiline
        minRows={2}
        maxRows={4}
        helperText="Você pode usar valores estáticos ou referências como ${outraVariavel}"
      />

      <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
        <Typography variant="caption" color={savedStatus === 'Salvo!' ? 'success.main' : 'text.secondary'}>
          {savedStatus}
        </Typography>
        <Button 
          variant="contained" 
          color="primary"
          size="small"
          onClick={handleSave}
          startIcon={<CheckCircleOutlineIcon />}
          sx={{ textTransform: 'none', boxShadow: 2 }}
        >
          Salvar variável
        </Button>
      </Box>
      

      {showSavePopup && (
        <Box
          sx={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            backgroundColor: '#4caf50',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            zIndex: 1000,
            animation: 'fadeIn 0.3s ease-in-out',
            '@keyframes fadeIn': {
              '0%': { opacity: 0, transform: 'translateY(-10px)' },
              '100%': { opacity: 1, transform: 'translateY(0)' }
            }
          }}
        >
          <Typography variant="body2">
            Variável salva com sucesso!
          </Typography>
        </Box>
      )}


      <Handle
        type="source"
        position="right"
        id="variable-out"
        style={{
          right: -8, 
          top: '50%',
          transform: 'translateY(-50%)',
          background: '#555',
          width: 12,
          height: 12,
        }}
      />
    </Box>
  );
});

export default VariableNode;


export const getFlowVariable = (name) => {
  if (!window.flowVariables) {

    return undefined;
  }
  return window.flowVariables[name];
};


export const setFlowVariable = (name, value) => {
  if (!window.flowVariables) {

    window.flowVariables = {};
  }
  

  window.flowVariables[name] = value;
  

  const event = new CustomEvent('flowVariableUpdate', { 
    detail: { name, value } 
  });
  window.dispatchEvent(event);
  

  return value;
};