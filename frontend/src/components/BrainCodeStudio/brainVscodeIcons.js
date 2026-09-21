/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";

const EXT_MAP = {
  js: { type: "js" },
  jsx: { type: "jsx" },
  ts: { type: "ts" },
  tsx: { type: "tsx" },
  html: { type: "html" },
  htm: { type: "html" },
  css: { type: "css" },
  scss: { type: "scss" },
  json: { type: "json" },
  md: { type: "md" },
  svg: { type: "svg" },
  png: { type: "image" },
  jpg: { type: "image" },
  jpeg: { type: "image" },
  py: { type: "py" },
  yml: { type: "yml" },
  yaml: { type: "yml" },
  env: { type: "env" },
  gitignore: { type: "git" },
  npmrc: { type: "npm" },
  nvmrc: { type: "nvm" },
  eslintrc: { type: "eslint" },
};

export function fileExtension(name) {
  const base = String(name || "").split("/").pop() || "";
  if (base === ".gitignore") return "gitignore";
  if (base.startsWith(".env")) return "env";
  if (base === ".npmrc") return "npmrc";
  if (base === ".nvmrc") return "nvmrc";
  if (base.includes("eslintrc")) return "eslintrc";
  const parts = base.split(".");
  if (parts.length < 2) return "";
  return parts.pop().toLowerCase();
}

function JsIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden className="shrink-0">
      <rect x="2" y="2" width="12" height="12" rx="1.5" fill="#f7df1e" />
      <text x="8" y="11" textAnchor="middle" fill="#111" fontSize="5.5" fontWeight="700" fontFamily="Segoe UI,sans-serif">
        JS
      </text>
    </svg>
  );
}

function JsonIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden className="shrink-0">
      <text x="8" y="11.5" textAnchor="middle" fill="#cbcb41" fontSize="9" fontWeight="700" fontFamily="Consolas,monospace">
        {"{}"}
      </text>
    </svg>
  );
}

function HtmlIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden className="shrink-0">
      <text x="8" y="11.5" textAnchor="middle" fill="#e44d26" fontSize="8" fontWeight="700" fontFamily="Consolas,monospace">
        {"<>"}
      </text>
    </svg>
  );
}

function CssIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden className="shrink-0">
      <text x="8" y="11" textAnchor="middle" fill="#563d7c" fontSize="5.5" fontWeight="700" fontFamily="Segoe UI,sans-serif">
        CSS
      </text>
    </svg>
  );
}

function TsIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden className="shrink-0">
      <rect x="2" y="2" width="12" height="12" rx="1.5" fill="#3178c6" />
      <text x="8" y="11" textAnchor="middle" fill="#fff" fontSize="5.5" fontWeight="700" fontFamily="Segoe UI,sans-serif">
        TS
      </text>
    </svg>
  );
}

function EnvIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden className="shrink-0">
      <circle cx="8" cy="8" r="5.5" fill="none" stroke="#8b8b8b" strokeWidth="1.2" />
      <circle cx="8" cy="8" r="1.8" fill="#8b8b8b" />
    </svg>
  );
}

function GitIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden className="shrink-0">
      <path d="M8 1.5 2.5 14.5h11L8 1.5z" fill="none" stroke="#f05032" strokeWidth="1.2" />
      <circle cx="8" cy="6.5" r="1.2" fill="#f05032" />
    </svg>
  );
}

function NpmIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden className="shrink-0">
      <rect x="2.5" y="3" width="11" height="10" rx="1" fill="#cb3837" />
      <text x="8" y="10.5" textAnchor="middle" fill="#fff" fontSize="4.5" fontWeight="700" fontFamily="Segoe UI,sans-serif">
        npm
      </text>
    </svg>
  );
}

function MdIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden className="shrink-0">
      <rect x="2" y="2" width="12" height="12" rx="1.5" fill="#519aba" />
      <text x="8" y="11" textAnchor="middle" fill="#fff" fontSize="5" fontWeight="700" fontFamily="Segoe UI,sans-serif">
        MD
      </text>
    </svg>
  );
}

function PyIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden className="shrink-0">
      <path
        fill="#3776ab"
        d="M7.94 1.05c-1.55 0-1.68.01-2.27.05-.58.04-1 .17-1.36.35-.39.2-.72.47-1.05.8-.33.33-.6.66-.8 1.05-.18.36-.31.78-.35 1.36-.04.59-.05.72-.05 2.27v.14c0 1.55.01 1.68.05 2.27.04.58.17 1 .35 1.36.2.39.47.72.8 1.05.33.33.66.6 1.05.8.36.18.78.31 1.36.35.59.04.72.05 2.27.05h.12c1.55 0 1.68-.01 2.27-.05.58-.04 1-.17 1.36-.35.39-.2.72-.47 1.05-.8.33-.33.6-.66.8-1.05.18-.36.31-.78.35-1.36.04-.59.05-.72.05-2.27v-.14c0-1.55-.01-1.68-.05-2.27-.04-.58-.17-1-.35-1.36-.2-.39-.47-.72-.8-1.05-.33-.33-.66-.6-1.05-.8-.36-.18-.78-.31-1.36-.35-.59-.04-.72-.05-2.27-.05h-.12Z"
      />
      <path
        fill="#ffd43b"
        d="M11.8 4.2c.9.9.9 2.36 0 3.26l-1.1 1.1c-.9.9-2.36.9-3.26 0-.9-.9-.9-2.36 0-3.26l1.1-1.1c.9-.9 2.36-.9 3.26 0Z"
      />
      <circle cx="5.4" cy="4.1" r=".75" fill="#fff" />
      <circle cx="10.1" cy="10.2" r=".75" fill="#fff" />
    </svg>
  );
}

function DefaultFileIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden className="shrink-0">
      <path d="M9 1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5L9 1z" fill="#c5c5c5" />
      <path d="M9 1v4h4" fill="#a0a0a0" />
    </svg>
  );
}

export function FileTypeIcon({ name, size = 16 }) {
  const ext = fileExtension(name);
  const type = EXT_MAP[ext]?.type || "default";
  if (type === "js" || type === "jsx") return <JsIcon size={size} />;
  if (type === "ts" || type === "tsx") return <TsIcon size={size} />;
  if (type === "json") return <JsonIcon size={size} />;
  if (type === "html") return <HtmlIcon size={size} />;
  if (type === "css" || type === "scss") return <CssIcon size={size} />;
  if (type === "env") return <EnvIcon size={size} />;
  if (type === "git") return <GitIcon size={size} />;
  if (type === "npm") return <NpmIcon size={size} />;
  if (type === "md") return <MdIcon size={size} />;
  if (type === "py") return <PyIcon size={size} />;
  return <DefaultFileIcon size={size} />;
}

export function FolderTypeIcon() {
  return null;
}
