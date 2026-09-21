/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AceEditor from "react-ace";
import ace from "ace-builds/src-noconflict/ace";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/mode-html";
import "ace-builds/src-noconflict/mode-css";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-markdown";
import "ace-builds/src-noconflict/mode-typescript";
import "ace-builds/src-noconflict/mode-text";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/theme-tomorrow_night";
import "ace-builds/src-noconflict/ext-language_tools";
import "ace-builds/src-noconflict/keybinding-vscode";
import { useIsDarkMode } from "../../hooks/useMediaQueryBrain";
import { fileExtension } from "./brainVscodeIcons";

function aceModeForPath(path) {
  const ext = fileExtension(path);
  const map = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    html: "html",
    htm: "html",
    css: "css",
    scss: "css",
    json: "json",
    md: "markdown",
  };
  return map[ext] || "text";
}

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
  const annotations = [];
  const open = (String(code).match(/\{/g) || []).length;
  const close = (String(code).match(/\}/g) || []).length;
  if (open !== close) {
    annotations.push({
      row: Math.max(0, String(code).split("\n").length - 1),
      column: 0,
      text: "Chaves `{` e `}` desbalanceadas",
      type: "error",
    });
  }
  return annotations;
}

export function validateCode(path, code) {
  const ext = fileExtension(path);
  if (ext === "json") return validateJson(code);
  if (["js", "jsx"].includes(ext)) return validateJavaScript(code);
  if (ext === "css" || ext === "scss") return validateCss(code);
  return [];
}

function readIsDarkFromShell() {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector(".brain-shell--dark"));
}

export default function BrainVscodeAce({ path, value = "", onChange, isDark: isDarkProp = false }) {
  const wrapRef = useRef(null);
  const editorRef = useRef(null);
  const validateTimerRef = useRef(null);
  const isDarkHook = useIsDarkMode();
  const [shellDark, setShellDark] = useState(readIsDarkFromShell);
  const [editorHeight, setEditorHeight] = useState(480);
  const isDark = isDarkProp || isDarkHook || shellDark;
  const mode = useMemo(() => aceModeForPath(path), [path]);
  const theme = isDark ? "tomorrow_night" : "github";

  useEffect(() => {
    setShellDark(readIsDarkFromShell());
    const obs = new MutationObserver(() => setShellDark(readIsDarkFromShell()));
    const shell = document.querySelector(".brain-shell");
    if (shell) obs.observe(shell, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const syncSize = () => {
      const h = Math.max(el.clientHeight, 240);
      if (h > 0) setEditorHeight(h);
      editorRef.current?.resize();
    };
    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const applyValidation = useCallback(
    (editor, nextValue) => {
      if (!editor?.getSession) return;
      try {
        const session = editor.getSession();
        session.setAnnotations(validateCode(path, nextValue ?? session.getValue()));
      } catch {
        /* ignore */
      }
    },
    [path]
  );

  const scheduleValidation = useCallback(
    (editor, nextValue) => {
      if (validateTimerRef.current) clearTimeout(validateTimerRef.current);
      validateTimerRef.current = setTimeout(() => {
        applyValidation(editor, nextValue);
      }, 280);
    },
    [applyValidation]
  );

  useEffect(() => {
    return () => {
      if (validateTimerRef.current) clearTimeout(validateTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.setTheme(isDark ? "ace/theme/tomorrow_night" : "ace/theme/github");
    editor.renderer.updateFull(true);
    applyValidation(editor, value);
  }, [path, isDark, applyValidation, value]);

  const handleLoad = (editor) => {
    editorRef.current = editor;
    editor.setTheme(isDark ? "ace/theme/tomorrow_night" : "ace/theme/github");
    editor.setOptions({
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true,
      enableSnippets: false,
      showLineNumbers: true,
      tabSize: 2,
      useWorker: false,
      wrap: false,
      fontSize: 13,
      highlightActiveLine: true,
      showPrintMargin: false,
      scrollPastEnd: 0.35,
    });
    try {
      const vscodeKb = ace.require("ace/keyboard/vscode");
      if (vscodeKb?.handler) editor.setKeyboardHandler(vscodeKb.handler);
    } catch {
      /* default keybindings */
    }
    editor.renderer.setScrollMargin(8, 8, 0, 0);
    editor.setValue(String(value ?? ""), -1);
    editor.clearSelection();
    editor.renderer.updateFull(true);
    editor.resize();
    applyValidation(editor, value);
  };

  const handleChange = (next) => {
    onChange?.(next);
    scheduleValidation(editorRef.current, next);
  };

  return (
    <div
      ref={wrapRef}
      className={`brain-vscode-editor__ace-wrap${isDark ? " brain-vscode-editor__ace-wrap--dark" : ""}`}
    >
      <AceEditor
        key={path || "untitled"}
        mode={mode}
        theme={theme}
        name={`brain-vscode-${path || "untitled"}`}
        value={value}
        onChange={handleChange}
        onLoad={handleLoad}
        width="100%"
        height={`${editorHeight}px`}
        editorProps={{ $blockScrolling: true }}
        setOptions={{
          useWorker: false,
        }}
      />
    </div>
  );
}
