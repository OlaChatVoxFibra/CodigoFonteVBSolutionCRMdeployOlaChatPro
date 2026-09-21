/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// SGP helpers and constants

export const SGP_PASSWORD_OPTIONS = [
  { value: "S", label: "SIM" },
  { value: "N", label: "NÃO" },
];

export const SGP_INTEGRATION_TYPES = [
  { value: "NA", label: "Nenhuma" },
  { value: "SB", label: "2ª Via Boleto" },
  { value: "AV", label: "A Vencer" },
  { value: "VE", label: "Vencido" },
  { value: "LC", label: "Liberação por Confiança" },
];

export const validateSgpConfig = (values) => {
  const errors = [];
  if (!values.name) errors.push("Nome da integração é obrigatório.");
  if (!values.sgpUrl) errors.push("SGP URL é obrigatório.");
  return errors;
};

