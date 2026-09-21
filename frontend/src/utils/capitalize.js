/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export function capitalize(str) {
    // Verifique se a string não está vazia
    if (str.length === 0) {
      return str;
    }
  
    // Capitalize a primeira letra e concatene com o restante da string
    return str.charAt(0).toUpperCase() + str.slice(1);
  }