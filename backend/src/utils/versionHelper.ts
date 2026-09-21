/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios from 'axios';

interface VersionInfo {
  version: string;
  beta: boolean;
  released: string;
  expire: string;
}

interface VersionsResponse {
  currentBeta: string | null;
  currentVersion: string;
  versions: VersionInfo[];
}

/**
 * Função que faz GET na URL e busca qualquer posição do array
 * Retorna no formato [major, minor, patch] para WAVersion
 */
export async function getVersionByIndexFromUrl(index: number = 2): Promise<[number, number, number]> {
  try {
    const url = 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/versions.json';
    
    const response = await axios.get<VersionsResponse>(url);
    const versionsData = response.data;

    if (!versionsData.versions || versionsData.versions.length <= index) {
      throw new Error(`Array versions deve ter pelo menos ${index + 1} itens`);
    }

    const versionItem = versionsData.versions[index];
    
    if (!versionItem || !versionItem.version) {
      throw new Error(`Item na posição ${index} não encontrado ou sem versão válida`);
    }

    // Remove o sufixo -alpha
    const versionWithoutAlpha = versionItem.version.replace('-alpha', '');
    
    // Converte para array de números
    const [major, minor, patch] = versionWithoutAlpha.split('.').map(Number);
    
    return [major, minor, patch];
    
  } catch (error) {
    console.error('Erro ao buscar versão da URL:', error);
    
    // Tentativa alternativa: buscar direto do WhatsApp Web
    try {
      console.log('Tentando buscar versão diretamente do WhatsApp Web...');
      const whatsappResponse = await axios.get('https://web.whatsapp.com/sw.js', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      const content = whatsappResponse.data;
      
      // Extrai o JSON do conteúdo do sw.js
      const jsonMatch = content.match(/self\.__swData=JSON\.parse\(\/\*BTDS\*\/"(.+?)"\);/);
      if (jsonMatch && jsonMatch[1]) {
        // Decodifica a string JSON escapada
        const jsonString = jsonMatch[1]
          .replace(/\\\\/g, '\\')
          .replace(/\\"/g, '"');
        
        const swData = JSON.parse(jsonString);
        const clientRevision = swData?.dynamic_data?.SiteData?.client_revision;
        
        if (clientRevision) {
          console.log('client_revision encontrado:', clientRevision);
          
          // Converte o client_revision para o formato [major, minor, patch]
          // Usa os 3 primeiros dígitos como major, os próximos 3 como minor, e o resto como patch
          const revisionStr = clientRevision.toString();
          const major = parseInt(revisionStr.substring(0, 1)) || 2;
          const minor = parseInt(revisionStr.substring(1, 5)) || 3000;
          const patch = clientRevision;
          
          return [major, minor, patch];
        }
      }
    } catch (whatsappError) {
      console.error('Erro ao buscar versão do WhatsApp Web:', whatsappError);
    }
    
    // Fallback: retorna versão fixa conhecida
    console.log('Usando versão fixa como fallback');
    return [2, 3000, 1029037448];
  }
}

// Exemplo de uso:
/*
async function exemploUso() {
  try {
    // Busca o terceiro item da URL e retorna [major, minor, patch]
    // Se falhar, tenta buscar do WhatsApp Web diretamente
    // Se falhar novamente, retorna versão fixa
    const version = await getVersionByIndexFromUrl(2);
    console.log(version); // Retorna: [2, 3000, 1022842143]
    
    // Pode ser usado diretamente no makeWASocket
    const wsocket = makeWASocket({
      version: version, // Tipo WAVersion: [number, number, number]
      // ... outras configurações
    });
    
  } catch (error) {
    // A função nunca lança erro - sempre retorna uma versão válida
    console.error('Erro:', error);
  }
}
*/
