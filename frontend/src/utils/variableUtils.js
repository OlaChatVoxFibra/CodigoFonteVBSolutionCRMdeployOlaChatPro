/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Utilitários para processamento de variáveis globais no Flow Builder
 */

/**
 * Substitui todas as referências de variáveis ${nome} em um texto pelo valor correspondente
 * @param {string} text - Texto com referências de variáveis para substituir
 * @returns {string} - Texto com as variáveis substituídas pelos seus valores
 */
export const processVariablesInText = (text) => {
    if (!text || typeof text !== 'string' || !text.includes('${')) {
      return text;
    }
  
    try {
      // Regex para encontrar referências no formato ${variavel}
      const regex = /\$\{([^}]+)\}/g;
      
      // Verifica se o objeto de variáveis globais existe
      if (!window.flowVariables) {
        console.warn('window.flowVariables não foi inicializado');
        return text;
      }
      
      // Mostra as variáveis disponíveis no console para debug
      console.log('Variáveis disponíveis:', window.flowVariables);
      console.log('Texto para processar:', text);
      
      // Substitui cada referência pelo valor da variável global
      const processedText = text.replace(regex, (match, varName) => {
        // Verifica se a variável existe no objeto global
        const varValue = window.flowVariables[varName];
        console.log(`Substituindo ${match} por`, varValue);
        
        // Se encontrou a variável, substitui pelo valor
        if (varValue !== undefined) {
          return typeof varValue === 'object' ? JSON.stringify(varValue) : String(varValue);
        }
        
        // Se não encontrou, mantém o placeholder original
        console.warn(`Variável '${varName}' não encontrada`);
        return match;
      });
      
      console.log('Texto processado:', processedText);
      return processedText;
    } catch (error) {
      console.error('Erro ao processar variáveis no texto:', error);
      return text; // Em caso de erro, retorna o texto original
    }
  };
  
  /**
   * Avalia uma expressão JavaScript em um contexto seguro usando as variáveis globais do flow
   * @param {string} expression - Expressão a ser avaliada
   * @returns {any} - Resultado da avaliação ou undefined em caso de erro
   */
  export const evaluateExpression = (expression) => {
    if (!expression) return undefined;
    
    try {
      // Cria um contexto com todas as variáveis globais
      const evalContext = { ...window.flowVariables };
      
      // Cria uma função que avalia a expressão com acesso às variáveis
      // eslint-disable-next-line no-new-func
      const evalFunc = new Function(
        ...Object.keys(evalContext),
        `return ${expression}`
      );
      
      // Executa a função com os valores das variáveis
      return evalFunc(...Object.values(evalContext));
    } catch (error) {
      console.error(`Erro ao avaliar expressão: ${expression}`, error);
      return undefined;
    }
  };
  
  /**
   * Helper para recuperar valor de variável em qualquer lugar
   * @param {string} name - Nome da variável
   * @returns {any} - Valor da variável ou undefined se não existir
   */
  export const getFlowVariable = (name) => {
    if (!window.flowVariables) return undefined;
    return window.flowVariables[name];
  };
  
  /**
   * Helper para definir valor de variável em qualquer lugar
   * @param {string} name - Nome da variável
   * @param {any} value - Valor a ser armazenado
   * @returns {any} - Valor armazenado
   */
  export const setFlowVariable = (name, value) => {
    window.flowVariables = window.flowVariables || {};
    window.flowVariables[name] = value;
    console.log(`Variável "${name}" definida:`, value);
    return value;
  };

/**
 * Renderiza variáveis usadas na mensagem automática de aceite do ticket.
 * Mantém compatibilidade com placeholders já usados por clientes.
 */
export const renderAcceptedTicketGreeting = (text, user = {}) => {
  const raw = typeof text === "string" ? text : "";
  if (!raw) return "";

  const attendantName = String(user?.name || user?.username || "").trim();
  if (!attendantName) return raw;

  return raw
    .replace(/\{\{\s*(userName|user\.name|attendantName|atendente|nomeAtendente|nome_do_atendente)\s*\}\}/gi, attendantName)
    .replace(/[\[{]\s*nome\s+d[oa]\s+atendente\s*[\]}]/gi, attendantName)
    .replace(/[\[{]\s*atendente\s*[\]}]/gi, attendantName);
};