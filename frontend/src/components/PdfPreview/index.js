/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect } from 'react';
import { 
  Paper, 
  Typography, 
  IconButton, 
  Box,
  CircularProgress,
  Tooltip,
  Chip
} from '@material-ui/core';
import { 
  PictureAsPdf,
  GetApp,
  Error as ErrorIcon,
  InsertDriveFile
} from '@material-ui/icons';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  pdfContainer: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(2),
    margin: theme.spacing(1, 0),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
    maxWidth: 350,
    minWidth: 280,
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
      transform: 'translateY(-1px)',
      boxShadow: theme.shadows[4],
    }
  },
  
  pdfIcon: {
    fontSize: 48,
    color: '#dc3545', // Cor vermelha do PDF
    marginRight: theme.spacing(2),
    flexShrink: 0,
  },
  
  documentIcon: {
    fontSize: 48,
    color: theme.palette.primary.main,
    marginRight: theme.spacing(2),
    flexShrink: 0,
  },
  
  pdfInfo: {
    flex: 1,
    minWidth: 0, // Para permitir text overflow
  },
  
  pdfTitle: {
    fontWeight: 600,
    fontSize: '0.9rem',
    marginBottom: theme.spacing(0.5),
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  
  pdfMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(0.5),
    flexWrap: 'wrap',
  },
  
  pdfSize: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    fontWeight: 500,
  },
  
  pdfType: {
    fontSize: '0.7rem',
  },
  
  downloadButton: {
    marginLeft: theme.spacing(1),
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
    }
  },
  
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(2),
  },
  
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(2),
    color: theme.palette.error.main,
  },
  
  errorIcon: {
    marginRight: theme.spacing(1),
  },
  
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    marginTop: theme.spacing(0.5),
  }
}));

const PdfPreview = ({ 
  url, 
  filename = "documento.pdf", 
  size = null,
  onDownload = null,
  mediaType = null
}) => {
  const classes = useStyles();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isPdfValid, setIsPdfValid] = useState(false);
  const [fileInfo, setFileInfo] = useState({
    name: filename,
    size: size,
    type: mediaType || 'document'
  });

  useEffect(() => {
    const loadFileInfo = async () => {
      try {
        setLoading(true);
        
        // Verificar se é realmente um PDF
        const isPdf = checkIfPdf(url, filename, mediaType);
        setIsPdfValid(isPdf);
        
        // Extrair nome do arquivo da URL se não fornecido adequadamente
        if (!filename || filename === "documento.pdf" || filename.length < 3) {
          try {
            const urlParts = url.split('/');
            const urlFilename = urlParts[urlParts.length - 1];
            const decodedFilename = decodeURIComponent(urlFilename);
            
            if (decodedFilename && decodedFilename.length > 3) {
              setFileInfo(prev => ({
                ...prev,
                name: decodedFilename
              }));
            }
          } catch (parseError) {
            console.warn('Erro ao extrair nome do arquivo:', parseError);
          }
        }
        
        setError(false);
      } catch (err) {
        console.error('Erro ao carregar informações do arquivo:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (url) {
      loadFileInfo();
    } else {
      setLoading(false);
      setError(true);
    }
  }, [url, filename, size, mediaType]);

  // Verificar se é PDF com base em múltiplos critérios
  const checkIfPdf = (url, filename, mediaType) => {
    // 1. Verificar pelo mediaType
    if (mediaType === "application" || mediaType === "document" || mediaType === "application/pdf") {
      return true;
    }

    // 2. Verificar pela extensão no filename
    if (filename && typeof filename === 'string') {
      const name = filename.toLowerCase();
      if (name.endsWith('.pdf')) {
        return true;
      }
    }

    // 3. Verificar pela URL
    if (url && typeof url === 'string') {
      const urlLower = url.toLowerCase();
      if (urlLower.includes('.pdf')) {
        return true;
      }
    }

    return false;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unitIndex]}`;
  };

  const getFileExtension = (filename) => {
    if (!filename) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'DOC';
  };

  const handleDownload = (event) => {
    event.stopPropagation();
    
    if (onDownload) {
      onDownload(url, fileInfo.name);
    } else {
      // Download padrão
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileInfo.name;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Erro no download:', error);
        // Fallback: abrir em nova aba
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleContainerClick = () => {
    // Ao clicar no container, faz download diretamente
    handleDownload({ stopPropagation: () => {} });
  };

  if (loading) {
    return (
      <Paper className={classes.pdfContainer}>
        <div className={classes.loadingContainer}>
          <CircularProgress size={20} />
          <Typography variant="body2" style={{ marginLeft: 8 }}>
            Carregando...
          </Typography>
        </div>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper className={classes.pdfContainer}>
        <div className={classes.errorContainer}>
          <ErrorIcon className={classes.errorIcon} />
          <div>
            <Typography variant="body2">
              Erro ao carregar arquivo
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {fileInfo.name}
            </Typography>
          </div>
        </div>
      </Paper>
    );
  }

  return (
    <Paper 
      className={classes.pdfContainer}
      onClick={handleContainerClick}
      elevation={1}
    >
      {isPdfValid ? (
        <PictureAsPdf className={classes.pdfIcon} />
      ) : (
        <InsertDriveFile className={classes.documentIcon} />
      )}
      
      <div className={classes.pdfInfo}>
        <Typography className={classes.pdfTitle} title={fileInfo.name}>
          {fileInfo.name}
        </Typography>
        
        <div className={classes.pdfMeta}>
          <Chip 
            label={isPdfValid ? 'PDF' : getFileExtension(fileInfo.name)}
            size="small"
            className={classes.pdfType}
            color={isPdfValid ? 'secondary' : 'default'}
          />
          
          {fileInfo.size && (
            <Typography variant="caption" className={classes.pdfSize}>
              {formatFileSize(fileInfo.size)}
            </Typography>
          )}
        </div>
        
        <div className={classes.statusIndicator}>
          <Typography variant="caption" color="textSecondary">
            📎 Clique para baixar
          </Typography>
        </div>
      </div>
      
      <Tooltip title="Baixar arquivo">
        <IconButton
          className={classes.downloadButton}
          onClick={handleDownload}
          size="small"
        >
          <GetApp />
        </IconButton>
      </Tooltip>
    </Paper>
  );
};

export default PdfPreview;