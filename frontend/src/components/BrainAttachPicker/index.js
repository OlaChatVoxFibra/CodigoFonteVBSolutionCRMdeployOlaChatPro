/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { createPortal } from "react-dom";
import { FileText, Image, Mic, Video } from "lucide-react";
import { anchorPopoverStyle, useAnchorRect } from "../../hooks/useBrainAnchorPopover";
import s from "../../pages/AiBrain/brainSubClassNames";

export const BRAIN_ATTACH_TYPES = [
  {
    id: "image",
    label: "Imagem",
    icon: Image,
    accept: "image/*",
  },
  {
    id: "video",
    label: "Vídeo",
    icon: Video,
    accept: "video/*",
  },
  {
    id: "audio",
    label: "Áudio",
    icon: Mic,
    accept: "audio/*",
  },
  {
    id: "document",
    label: "Documento",
    icon: FileText,
    accept:
      ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.json,.xml,.zip,.rar,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
];

export default function BrainAttachPicker({ open, anchorEl, onClose, onPickType }) {
  const rect = useAnchorRect(anchorEl, open);

  const handlePick = (type) => {
    onPickType?.(type.accept);
    onClose?.();
  };

  if (!open) return null;

  return createPortal(
    <>
      <div className="brain-menu__overlay brain-menu__overlay--dim" onClick={onClose} aria-hidden />
      {rect ? (
        <div
          className={`brain-menu__panel ${s.menuPanel}`}
          style={anchorPopoverStyle(rect, { minWidth: 196 })}
        >
          {BRAIN_ATTACH_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                type="button"
                className={s.menuRow}
                onClick={() => handlePick(type)}
              >
                <span className={s.menuRowIcon}>
                  <Icon size={16} strokeWidth={1.75} />
                </span>
                {type.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </>,
    document.body
  );
}
