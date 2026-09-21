/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import * as Yup from "yup";

// Schema para emails
export const emailSchema = Yup.string()
  .email("Invalid email format")
  .max(255, "Email must be at most 255 characters")
  .nullable();

// Schema para telefones
export const phoneSchema = Yup.string()
  .matches(/^\d+(@lid)?$/, "Invalid phone number format")
  .min(8, "Phone number must be at least 8 digits")
  .max(20, "Phone number must be at most 20 characters");

// Schema para nomes
export const nameSchema = Yup.string()
  .min(1, "Name must be at least 1 character")
  .max(255, "Name must be at most 255 characters")
  .matches(/^[a-zA-ZÀ-ÿ0-9\s\-_\.\(\)]+$/, "Name contains invalid characters");

// Schema para data de nascimento
export const birthDateSchema = Yup.date()
  .nullable()
  .max(new Date(), "Birth date cannot be in the future")
  .min(new Date("1900-01-01"), "Birth date cannot be before 1900");

// Schema para parâmetros de busca
export const searchParamSchema = Yup.string()
  .max(255, "Search parameter must be at most 255 characters")
  .nullable();

// Schema para paginação
export const paginationSchema = {
  pageNumber: Yup.string()
    .matches(/^\d+$/, "Page number must be a positive integer")
    .transform((value) => value === "" ? "1" : value)
    .default("1")
};

// Schema para IDs (ADICIONANDO O QUE ESTAVA FALTANDO)
export const idSchema = Yup.number()
  .integer("ID must be an integer")
  .positive("ID must be a positive number")
  .required("ID is required");

// Schema para strings booleanas
export const booleanStringSchema = Yup.string()
  .oneOf(["true", "false"], "Must be 'true' or 'false'")
  .nullable();

// Schema para criação de textos com validação customizada
export const createTextSchema = (options: {
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  allowSpecialChars?: boolean;
} = {}) => {
  const {
    required = false,
    maxLength = 500,
    minLength = 0,
    allowSpecialChars = false
  } = options;

  let schema = Yup.string();

  if (minLength > 0) {
    schema = schema.min(minLength, `Text must be at least ${minLength} characters`);
  }

  if (maxLength > 0) {
    schema = schema.max(maxLength, `Text must be at most ${maxLength} characters`);
  }

  if (!allowSpecialChars) {
    schema = schema.matches(
      /^[a-zA-ZÀ-ÿ0-9\s\-_\.\(\)]+$/,
      "Text contains invalid characters"
    );
  }

  return required ? schema.required("Text is required") : schema.nullable();
};

// Schema específico para validação de arrays de IDs
export const idArraySchema = Yup.array()
  .of(idSchema)
  .nullable();

// Schema para validação de confirmação de texto
export const confirmationSchema = Yup.string()
  .required("Confirmation is required");