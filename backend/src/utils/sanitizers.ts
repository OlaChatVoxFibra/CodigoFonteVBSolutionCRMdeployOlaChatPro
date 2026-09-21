/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// Sanitizar strings removendo caracteres perigosos
export const sanitizeString = (input: string | null | undefined): string => {
  if (!input || typeof input !== "string") return "";
  
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove caracteres HTML básicos
    .replace(/['"]/g, "") // Remove aspas
    .replace(/\\/g, "") // Remove barras invertidas
    .substring(0, 255); // Limita tamanho
};

// Sanitizar emails
export const sanitizeEmail = (email: string | null | undefined): string => {
  if (!email || typeof email !== "string") return "";
  
  return email
    .toLowerCase()
    .trim()
    .replace(/[^\w@\.\-]/g, "") // Mantém apenas caracteres válidos para email
    .substring(0, 255);
};

// Sanitizar números de telefone
export const sanitizePhoneNumber = (phone: string | null | undefined): string => {
  if (!phone || typeof phone !== "string") return "";
  
  return phone
    .replace(/[^\d@]/g, "") // Remove tudo exceto dígitos e @
    .substring(0, 20);
};

// Sanitizar texto geral
export const sanitizeText = (text: string | null | undefined): string => {
  if (!text || typeof text !== "string") return "";
  
  return text
    .trim()
    .replace(/[<>]/g, "")
    .replace(/\\/g, "")
    .substring(0, 1000);
};

// Sanitizar números (ADICIONANDO O QUE ESTAVA FALTANDO)
export const sanitizeNumber = (input: any): number => {
  if (typeof input === "number") {
    return Math.max(0, Math.floor(Math.abs(input)));
  }
  
  if (typeof input === "string") {
    const parsed = parseInt(input.replace(/[^\d]/g, ""), 10);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  }
  
  return 0;
};

// Sanitizar array de números
export const sanitizeNumberArray = (input: any[]): number[] => {
  if (!Array.isArray(input)) return [];
  
  return input
    .map(sanitizeNumber)
    .filter(num => num > 0)
    .slice(0, 100); // Limita a 100 itens
};

// Sanitizar boolean de string
export const sanitizeBoolean = (input: any): boolean => {
  if (typeof input === "boolean") return input;
  if (typeof input === "string") {
    return input.toLowerCase() === "true";
  }
  return false;
};

// Sanitizar objeto removendo propriedades perigosas
export const sanitizeObject = (obj: any): any => {
  if (!obj || typeof obj !== "object") return {};
  
  const sanitized: any = {};
  const allowedKeys = /^[a-zA-Z][a-zA-Z0-9_]*$/;
  
  for (const [key, value] of Object.entries(obj)) {
    if (allowedKeys.test(key) && value !== undefined) {
      if (typeof value === "string") {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === "number") {
        sanitized[key] = sanitizeNumber(value);
      } else if (typeof value === "boolean") {
        sanitized[key] = value;
      }
    }
  }
  
  return sanitized;
};