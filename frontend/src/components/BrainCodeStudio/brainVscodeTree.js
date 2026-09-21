/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FilePlus2,
  FolderPlus,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { FileTypeIcon } from "./brainVscodeIcons";
import BrainVscodeCodePane from "./brainVscodeCodePane";

function buildPathTree(paths) {
  const root = { name: "", children: {}, files: [] };
  paths.forEach((path) => {
    const segments = String(path).split("/").filter(Boolean);
    if (!segments.length) return;
    let node = root;
    segments.forEach((segment, index) => {
      const isFile = index === segments.length - 1;
      if (isFile) {
        if (!node.files.some((f) => f.path === path)) {
          node.files.push({ path, name: segment });
        }
      } else {
        if (!node.children[segment]) {
          node.children[segment] = { name: segment, children: {}, files: [] };
        }
        node = node.children[segment];
      }
    });
  });
  return root;
}

const rowBase =
  "group flex w-full min-h-[22px] items-center gap-1.5 rounded-[3px] px-1 text-left text-[13px] leading-[22px] text-[var(--ide-text,#1c1917)] transition-colors hover:bg-[var(--ide-hover)]";

function FileTreeItem({
  file,
  activePath,
  onSelect,
  onRename,
  onDelete,
  paddingLeft,
  ui,
}) {
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(file.name);
  const inputRef = useRef(null);
  const isActive = file.path === activePath;

  const startRename = (event) => {
    event.stopPropagation();
    setRenameValue(file.name);
    setRenaming(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };

  const cancelRename = () => {
    setRenaming(false);
    setRenameValue(file.name);
  };

  const submitRename = () => {
    const next = renameValue.trim();
    if (!next) {
      cancelRename();
      return;
    }
    onRename?.(file.path, next);
    setRenaming(false);
  };

  const handleDelete = (event) => {
    event.stopPropagation();
    onDelete?.(file.path);
  };

  if (renaming) {
    return (
      <div className="brain-vscode-explorer__rename-row" style={{ paddingLeft }}>
        <FileTypeIcon name={renameValue || file.name} size={16} />
        <input
          ref={inputRef}
          type="text"
          className="brain-vscode-explorer__rename-input"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitRename();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              cancelRename();
            }
          }}
          onBlur={submitRename}
        />
      </div>
    );
  }

  return (
    <div
      className={`brain-vscode-explorer__file-row${isActive ? " brain-vscode-explorer__file-row--active" : ""}`}
      style={{ paddingLeft }}
    >
      <button
        type="button"
        className={`${rowBase} brain-vscode-explorer__file-btn${
          isActive ? " bg-[var(--ide-hover-strong)] text-[var(--ide-text)]" : ""
        }`}
        onClick={() => onSelect(file.path)}
      >
        <FileTypeIcon name={file.name} size={16} />
        <span className="truncate">{file.name}</span>
      </button>
      <div className="brain-vscode-explorer__file-actions">
        <button
          type="button"
          className="brain-vscode-explorer__file-action"
          title={ui("Renomear")}
          onClick={startRename}
        >
          <Pencil size={12} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="brain-vscode-explorer__file-action brain-vscode-explorer__file-action--danger"
          title={ui("Excluir")}
          onClick={handleDelete}
        >
          <Trash2 size={12} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

function TreeFolder({
  node,
  depth,
  activePath,
  onSelect,
  onRename,
  onDelete,
  ui,
  defaultOpen = true,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const childFolders = Object.keys(node.children || {}).sort();
  const files = [...(node.files || [])].sort((a, b) => a.name.localeCompare(b.name));
  const pl = 8 + depth * 12;

  return (
    <>
      <button
        type="button"
        className={rowBase}
        style={{ paddingLeft: pl }}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[#858585]">
          {open ? <ChevronDown size={14} strokeWidth={1.5} /> : <ChevronRight size={14} strokeWidth={1.5} />}
        </span>
        <span className="truncate">{node.name}</span>
      </button>
      {open
        ? childFolders.map((key) => (
            <TreeFolder
              key={`${node.name}/${key}`}
              node={node.children[key]}
              depth={depth + 1}
              activePath={activePath}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              ui={ui}
            />
          ))
        : null}
      {open
        ? files.map((file) => (
            <FileTreeItem
              key={file.path}
              file={file}
              activePath={activePath}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              paddingLeft={pl + 16}
              ui={ui}
            />
          ))
        : null}
    </>
  );
}

export default function BrainVscodeTree({
  paths = [],
  activePath,
  onSelectPath,
  projectTitle = "PROJECT",
  onUploadFiles,
  onUploadFolder,
  onCreateFile,
  onRenameFile,
  onDeleteFile,
  ui = (x) => x,
}) {
  const tree = useMemo(() => buildPathTree(paths), [paths]);
  const rootFiles = [...(tree.files || [])].sort((a, b) => a.name.localeCompare(b.name));
  const rootFolders = Object.keys(tree.children || {}).sort();
  const [rootOpen, setRootOpen] = useState(true);
  const rootLabel = String(projectTitle || "PROJECT").toUpperCase();
  const [creatingFile, setCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("novo-arquivo.js");
  const newFileInputRef = useRef(null);

  const submitNewFile = () => {
    const name = newFileName.trim();
    if (!name) {
      setCreatingFile(false);
      return;
    }
    onCreateFile?.(name);
    setCreatingFile(false);
    setNewFileName("novo-arquivo.js");
  };

  const startCreateFile = () => {
    setNewFileName("novo-arquivo.js");
    setCreatingFile(true);
    requestAnimationFrame(() => newFileInputRef.current?.focus());
  };

  return (
    <div className="brain-vscode-explorer flex h-full min-h-0 shrink-0 flex-col border-r border-[var(--ide-border-strong)] bg-[var(--ide-surface-muted)] font-[Inter,Segoe_UI,system-ui,sans-serif]">
      <div className="brain-vscode-explorer__head">
        <span className="brain-vscode-explorer__title">Explorer</span>
        <div className="brain-vscode-explorer__actions">
          <button
            type="button"
            className="brain-vscode-explorer__action"
            title={ui("Enviar arquivos")}
            onClick={onUploadFiles}
          >
            <Upload size={14} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="brain-vscode-explorer__action"
            title={ui("Importar pasta")}
            onClick={onUploadFolder}
          >
            <FolderPlus size={14} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="brain-vscode-explorer__action"
            title={ui("Novo arquivo")}
            onClick={startCreateFile}
          >
            <FilePlus2 size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="brain-vscode-explorer__tree min-h-0 flex-1 overflow-auto px-1 pb-3">
        {creatingFile ? (
          <div className="brain-vscode-explorer__new-file">
            <input
              ref={newFileInputRef}
              type="text"
              className="brain-vscode-explorer__new-file-input"
              value={newFileName}
              placeholder={ui("Nome do arquivo")}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitNewFile();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setCreatingFile(false);
                }
              }}
            />
            <button
              type="button"
              className="brain-vscode-explorer__new-file-btn"
              onClick={submitNewFile}
            >
              OK
            </button>
            <button
              type="button"
              className="brain-vscode-explorer__new-file-btn brain-vscode-explorer__new-file-btn--ghost"
              onClick={() => setCreatingFile(false)}
            >
              {ui("Cancelar")}
            </button>
          </div>
        ) : null}
        <button
          type="button"
          className={`${rowBase} font-medium`}
          style={{ paddingLeft: 8 }}
          onClick={() => setRootOpen((v) => !v)}
        >
          <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[var(--ide-text-muted)]">
            {rootOpen ? <ChevronDown size={14} strokeWidth={1.5} /> : <ChevronRight size={14} strokeWidth={1.5} />}
          </span>
          <span className="truncate uppercase tracking-[0.02em]">{rootLabel}</span>
        </button>

        {rootOpen ? (
          <>
            {rootFolders.map((key) => (
              <TreeFolder
                key={key}
                node={tree.children[key]}
                depth={0}
                activePath={activePath}
                onSelect={onSelectPath}
                onRename={onRenameFile}
                onDelete={onDeleteFile}
                ui={ui}
              />
            ))}
            {rootFiles.map((file) => (
              <FileTreeItem
                key={file.path}
                file={file}
                activePath={activePath}
                onSelect={onSelectPath}
                onRename={onRenameFile}
                onDelete={onDeleteFile}
                paddingLeft={24}
                ui={ui}
              />
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}

export function BrainVscodeEditor({
  openTabs = [],
  activePath,
  value,
  onChange,
  onSelectTab,
  onCloseTab,
  isDark = false,
  showRun = false,
  onRun,
  runLabel = "Run",
}) {
  const segments = String(activePath || "").split("/").filter(Boolean);
  const fileName = segments.pop() || "untitled";
  const tabs = openTabs.length ? openTabs : activePath ? [activePath] : [];

  const tabName = (path) => String(path || "").split("/").pop() || "untitled";

  return (
    <div className="brain-vscode-editor flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--ide-bg)]">
      <div className="brain-vscode-editor__tabs flex h-[35px] shrink-0 items-stretch overflow-x-auto bg-[var(--ide-surface-muted)]">
        {tabs.map((tabPath) => {
          const name = tabName(tabPath);
          const isActive = tabPath === activePath;
          return (
            <div
              key={tabPath}
              role="tab"
              tabIndex={0}
              aria-selected={isActive}
              className={`brain-vscode-editor__tab${isActive ? " brain-vscode-editor__tab--active" : ""}`}
              onClick={() => onSelectTab?.(tabPath)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectTab?.(tabPath);
                }
              }}
            >
              <FileTypeIcon name={name} size={14} />
              <span>{name}</span>
              <button
                type="button"
                className="brain-vscode-editor__tab-close"
                title="Fechar"
                aria-label={`Fechar ${name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab?.(tabPath);
                }}
              >
                <X size={12} strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-0.5 border-b border-[var(--ide-border-strong)] bg-[var(--ide-bg)] px-3 py-1 text-[12px] text-[var(--ide-text-secondary,#52525b)]">
        {segments.length ? (
          <>
            {segments.map((seg) => (
              <React.Fragment key={seg}>
                <button
                  type="button"
                  className="rounded px-1 transition-colors hover:bg-[var(--ide-hover)] hover:text-[var(--ide-text)]"
                >
                  {seg}
                </button>
                <ChevronRight size={11} className="text-[var(--ide-text-muted)]" />
              </React.Fragment>
            ))}
          </>
        ) : null}
        <span className="inline-flex items-center gap-1 text-[var(--ide-text)]">
          <FileTypeIcon name={fileName} size={13} />
          {fileName}
        </span>
      </div>

      <div className="brain-vscode-editor__body flex min-h-0 min-w-0 flex-1 flex-col">
        <BrainVscodeCodePane
          path={activePath}
          value={value}
          onChange={onChange}
          isDark={isDark}
          showRun={showRun}
          onRun={onRun}
          runLabel={runLabel}
        />
      </div>
    </div>
  );
}