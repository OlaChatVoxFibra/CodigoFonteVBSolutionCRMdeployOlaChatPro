/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { fileExtension } from "./brainVscodeIcons";

function lineColFromIndex(text, index) {
  const slice = String(text).slice(0, Math.max(0, index));
  const lines = slice.split("\n");
  const row = Math.max(0, lines.length - 1);
  const column = lines[lines.length - 1]?.length || 0;
  return { row, column };
}

function validateJson(code) {
  try {
    JSON.parse(code);
    return [];
  } catch (err) {
    const msg = String(err.message || "JSON inválido");
    const posMatch = msg.match(/position\s+(\d+)/i);
    const lineMatch = msg.match(/line\s+(\d+)/i);
    let row = 0;
    let column = 0;
    if (posMatch) {
      ({ row, column } = lineColFromIndex(code, Number(posMatch[1])));
    } else if (lineMatch) {
      row = Math.max(0, Number(lineMatch[1]) - 1);
    }
    return [{ row, column, text: msg, type: "error" }];
  }
}

function validateJavaScript(code) {
  try {
    // eslint-disable-next-line no-new-func
    new Function(code);
    return [];
  } catch (err) {
    const msg = String(err.message || "Erro de sintaxe");
    const lineMatch =
      msg.match(/:(\d+):(\d+)/) ||
      msg.match(/line\s+(\d+)/i) ||
      String(err.stack || "").match(/:(\d+):(\d+)/);
    const row = lineMatch ? Math.max(0, Number(lineMatch[1]) - 1) : 0;
    const column = lineMatch && lineMatch[2] ? Math.max(0, Number(lineMatch[2]) - 1) : 0;
    return [{ row, column, text: msg, type: "error" }];
  }
}

function validateCss(code) {
  const open = (String(code).match(/\{/g) || []).length;
  const close = (String(code).match(/\}/g) || []).length;
  if (open === close) return [];
  return [{
    row: Math.max(0, String(code).split("\n").length - 1),
    column: 0,
    text: "Chaves `{` e `}` desbalanceadas",
    type: "error",
  }];
}

function validateHtml(code) {
  const text = String(code);
  const errors = [];
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(text)) !== null) {
    const scriptBody = match[1]?.trim();
    if (scriptBody) {
      const jsErrors = validateJavaScript(scriptBody);
      const lineOffset = lineColFromIndex(text, match.index + match[0].indexOf(scriptBody)).row;
      jsErrors.forEach((err) => {
        errors.push({ ...err, row: err.row + lineOffset, text: `Script: ${err.text}` });
      });
    }
  }
  const openTags = (text.match(/<(?!\/|!|br|hr|img|input|meta|link)[a-z][^>]*>/gi) || []).length;
  const closeTags = (text.match(/<\/[a-z][^>]*>/gi) || []).length;
  if (openTags !== closeTags) {
    errors.push({
      row: Math.max(0, text.split("\n").length - 1),
      column: 0,
      text: "Tags HTML possivelmente desbalanceadas",
      type: "error",
    });
  }
  return errors;
}

export function validateCode(path, code) {
  const ext = fileExtension(path);
  if (ext === "json") return validateJson(code);
  if (["js", "jsx"].includes(ext)) return validateJavaScript(code);
  if (ext === "css" || ext === "scss") return validateCss(code);
  if (ext === "html" || ext === "htm") return validateHtml(code);
  return [];
}
