/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useCallback } from 'react';
import { getBackendUrl } from '../config';

export const usePdfViewer = () => {
  
  // Processar URL para garantir que esteja no formato correto
  const processUrl = useCallback((url) => {
    if (!url) return '';
    
    try {
      // Se a URL já tem protocolo, retornar como está
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      
      const backendUrl = getBackendUrl();

      // Se começa com /public/, usar a URL base do backend
      if (url.startsWith('/public/')) {
        return `${backendUrl}${url}`;
      }
      
      // Se é apenas um nome de arquivo ou caminho relativo
      if (!url.startsWith('/')) {
        return `${backendUrl}/public/${url}`;
      }
      
      // Para outros casos, assumir que é um caminho absoluto do servidor
      return `${backendUrl}${url}`;
      
    } catch (error) {
      console.error('❌ Erro ao processar URL:', error);
      return url;
    }
  }, []);

  // Verificar se uma URL é um PDF
  const isPdfUrl = (mediaUrl, body, mediaType) => {
    // Verifica pelo mediaType primeiro
    if (mediaType === "application/pdf") return true;
    
    // Verifica pela extensão do arquivo na URL
    if (mediaUrl) {
      const url = mediaUrl.toLowerCase();
      return url.endsWith('.pdf') || 
             url.includes('.pdf?') || 
             url.includes('/pdf/');
    }
    
    // Verifica no body como fallback
    if (body) {
      return body.toLowerCase().includes('.pdf');
    }
    
    return false;
  };

  // Validar se a URL parece ser válida
  const validatePdfUrl = useCallback((url, filename) => {
    if (!url || typeof url !== 'string') {
      return false;
    }

    // URLs muito curtas provavelmente são inválidas
    if (url.length < 5) {
      return false;
    }

    // Verificar se tem caracteres suspeitos
    if (url.includes('undefined') || url.includes('null')) {
      return false;
    }

    return true;
  }, []);

  // Fazer download do PDF
  const downloadPdf = useCallback((url, filename = 'documento.pdf') => {
    console.log('📥 Fazendo download:', { url, filename });
    
    if (!url) {
      console.error('❌ URL do PDF não fornecida para download');
      alert('Erro: Não é possível fazer download, URL não encontrada');
      return;
    }

    try {
      // Processar URL antes do download
      const processedUrl = processUrl(url);
      
      const link = document.createElement('a');
      link.href = processedUrl;
      link.download = filename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      // Adicionar ao DOM temporariamente
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Download iniciado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao fazer download:', error);
      
      // Fallback: abrir em nova aba
      try {
        const processedUrl = processUrl(url);
        window.open(processedUrl, '_blank', 'noopener,noreferrer');
      } catch (fallbackError) {
        console.error('❌ Erro no fallback:', fallbackError);
        alert('Erro ao fazer download do arquivo');
      }
    }
  }, [processUrl]);

  // Extrair informações de um arquivo PDF de uma mensagem
  const extractPdfInfoFromMessage = useCallback((message) => {
    console.log('🔍 Extraindo info do PDF da mensagem:', message);
    
    const info = {
      url: message.mediaUrl || '',
      filename: 'documento.pdf',
      size: message.fileSize || null,
      mediaType: message.mediaType || '',
      isPdf: false
    };

    // Extrair filename do body da mensagem
    if (message.body && typeof message.body === 'string') {
      const body = message.body.trim();
      // Se o body é curto e tem extensão, provavelmente é um nome de arquivo
      if (body.length < 100 && body.includes('.')) {
        info.filename = body;
      }
    }

    // Extrair filename da URL se não obtido do body
    if (info.filename === 'documento.pdf' && info.url) {
      try {
        const urlParts = info.url.split('/');
        const urlFilename = urlParts[urlParts.length - 1];
        
        // Remover parâmetros de query se houver
        const cleanFilename = urlFilename.split('?')[0];
        const decodedFilename = decodeURIComponent(cleanFilename);
        
        if (decodedFilename && decodedFilename.includes('.')) {
          info.filename = decodedFilename;
        }
      } catch (error) {
        console.warn('⚠️ Erro ao extrair filename da URL:', error);
      }
    }

    // Verificar se é PDF
    info.isPdf = isPdfUrl(info.url, info.filename, info.mediaType);

    console.log('📄 Info extraída:', info);
    return info;
  }, [isPdfUrl]);

  return {
    // Ações principais
    downloadPdf,
    
    // Utilitários
    isPdfUrl,
    validatePdfUrl,
    extractPdfInfoFromMessage,
    processUrl,
  };
};