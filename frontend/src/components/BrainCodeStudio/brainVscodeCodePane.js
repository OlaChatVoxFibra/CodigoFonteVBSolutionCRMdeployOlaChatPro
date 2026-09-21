/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useMemo } from "react";
import { validateCode } from "./brainCodeValidate";

export default function BrainVscodeCodePane({
  path,
  value = "",
  onChange,
  isDark = false,
  showRun = false,
  onRun,
  runLabel = "Run",
}) {
  const text = String(value ?? "");
  const lines = text.split("\n");
  const lineCount = Math.max(lines.length, 1);
  const errors = useMemo(() => validateCode(path, text), [path, text]);
  const errorRows = useMemo(() => new Set(errors.map((e) => e.row)), [errors]);

  return (
    <div
      className={`brain-vscode-code-pane${isDark ? " brain-vscode-code-pane--dark" : ""}`}
    >
      <div className="brain-vscode-code-pane__gutter" aria-hidden>
        {Array.from({ length: lineCount }, (_, i) => (
          <div
            key={i}
            className={`brain-vscode-code-pane__line-num${
              errorRows.has(i) ? " brain-vscode-code-pane__line-num--error" : ""
            }`}
            title={errorRows.has(i) ? errors.find((e) => e.row === i)?.text : undefined}
          >
            {errorRows.has(i) ? <span className="brain-vscode-code-pane__error-dot" /> : null}
            {i + 1}
          </div>
        ))}
      </div>
      <div className="brain-vscode-code-pane__editor">
        {showRun ? (
          <button type="button" className="brain-vscode-code-pane__run-btn" onClick={onRun}>
            {runLabel}
          </button>
        ) : null}
        <textarea
          className="brain-vscode-code-pane__input"
          value={text}
          onChange={(e) => onChange?.(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          rows={Math.max(lineCount, 24)}
        />
      </div>
    </div>
  );
}
