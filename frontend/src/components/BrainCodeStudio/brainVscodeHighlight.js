/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function wrap(color, text) {
  return `<span style="color:${color}">${escapeHtml(text)}</span>`;
}

function highlightJs(code) {
  let s = escapeHtml(code);
  s = s.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, (m) => wrap("#6a9955", m));
  s = s.replace(/('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)/g, (m) => wrap("#ce9178", m));
  s = s.replace(/\b(\d+(?:\.\d+)?)\b/g, (m) => wrap("#b5cea8", m));
  s = s.replace(
    /\b(const|let|var|function|return|if|else|for|while|import|export|from|class|extends|new|async|await|try|catch|throw|default|switch|case|break|continue|typeof|instanceof|null|undefined|true|false)\b/g,
    (m) => wrap("#569cd6", m)
  );
  return s;
}

function highlightHtml(code) {
  let s = escapeHtml(code);
  s = s.replace(/(&lt;!--[\s\S]*?--&gt;)/g, (m) => wrap("#6a9955", m));
  s = s.replace(/(&lt;\/?[\w-]+)/g, (m) => wrap("#569cd6", m));
  s = s.replace(/(=)(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;)/g, (_, eq, str) => `${eq}${wrap("#ce9178", str)}`);
  s = s.replace(/\b([\w-]+)(=)/g, (m, attr) => wrap("#9cdcfe", attr) + "=");
  return s;
}

function highlightCss(code) {
  let s = escapeHtml(code);
  s = s.replace(/(\/\*[\s\S]*?\*\/)/g, (m) => wrap("#6a9955", m));
  s = s.replace(/('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/g, (m) => wrap("#ce9178", m));
  s = s.replace(/#[\da-fA-F]{3,8}\b/g, (m) => wrap("#b5cea8", m));
  s = s.replace(/\b(\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw)?)\b/g, (m) => wrap("#b5cea8", m));
  s = s.replace(/([^{]+)(?=\{)/g, (m) => wrap("#569cd6", m.trim()));
  return s;
}

function highlightJson(code) {
  let s = escapeHtml(code);
  s = s.replace(/("(?:\\.|[^"\\])*")(\s*:)/g, (_, key, colon) => `${wrap("#9cdcfe", key)}${colon}`);
  s = s.replace(/("(?:\\.|[^"\\])*")/g, (m) => wrap("#ce9178", m));
  s = s.replace(/\b(true|false|null)\b/g, (m) => wrap("#569cd6", m));
  s = s.replace(/\b(-?\d+(?:\.\d+)?)\b/g, (m) => wrap("#b5cea8", m));
  return s;
}

function highlightMd(code) {
  let s = escapeHtml(code);
  s = s.replace(/^(#{1,6}\s.+)$/gm, (m) => wrap("#569cd6", m));
  s = s.replace(/(\*\*[^*]+\*\*)/g, (m) => wrap("#569cd6", m));
  s = s.replace(/(`[^`]+`)/g, (m) => wrap("#ce9178", m));
  return s;
}

export function highlightCode(path, code) {
  const ext = String(path || "").split(".").pop()?.toLowerCase() || "";
  const raw = String(code ?? "");
  if (["js", "jsx", "ts", "tsx"].includes(ext)) return highlightJs(raw);
  if (["html", "htm"].includes(ext)) return highlightHtml(raw);
  if (["css", "scss"].includes(ext)) return highlightCss(raw);
  if (ext === "json") return highlightJson(raw);
  if (ext === "md") return highlightMd(raw);
  return escapeHtml(raw);
}

export function HighlightedCode({ path, value }) {
  const html = highlightCode(path, value);
  return (
    <pre
      className="brain-vscode-highlight pointer-events-none min-h-full whitespace-pre p-3 font-[Consolas,Courier_New,monospace] text-[13px] leading-[19px]"
      aria-hidden
      dangerouslySetInnerHTML={{ __html: html + "\n" }}
    />
  );
}
