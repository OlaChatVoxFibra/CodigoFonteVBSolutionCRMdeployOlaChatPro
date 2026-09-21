/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useLayoutEffect, useState } from "react";

export function useAnchorRect(anchorEl, open) {
  const [rect, setRect] = useState(null);

  useLayoutEffect(() => {
    if (!open || !anchorEl) {
      setRect(null);
      return undefined;
    }

    const update = () => {
      const r = anchorEl.getBoundingClientRect();
      setRect({
        top: r.top,
        left: r.left,
        bottom: r.bottom,
        right: r.right,
        width: r.width,
        height: r.height,
      });
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchorEl, open]);

  return rect;
}

/** Popover below anchor by default (composer menus). */
export function anchorPopoverStyle(
  rect,
  { minWidth = 248, offset = 8, align = "left", placement = "below" } = {}
) {
  if (!rect) return { visibility: "hidden" };
  const left = align === "right" ? rect.right : rect.left;
  const base = {
    position: "fixed",
    left,
    minWidth,
    zIndex: 1299,
    transform: align === "right" ? "translateX(-100%)" : undefined,
  };

  if (placement === "above") {
    return {
      ...base,
      bottom: window.innerHeight - rect.top + offset,
    };
  }

  const top = rect.bottom + offset;
  const maxHeight = Math.max(160, window.innerHeight - top - 12);
  return {
    ...base,
    top,
    maxHeight,
    overflowY: "auto",
  };
}

/** Submenu to the right of a row anchor. */
export function anchorSubmenuStyle(rect, { minWidth = 196, gap = 4, maxHeight = 320 } = {}) {
  if (!rect) return { visibility: "hidden" };
  const viewportMax = Math.max(120, window.innerHeight - 16);
  const panelMax = Math.min(maxHeight, viewportMax);
  const top = Math.min(rect.top, window.innerHeight - panelMax - 8);
  return {
    position: "fixed",
    left: rect.right + gap,
    top: Math.max(8, top),
    minWidth,
    maxHeight: panelMax,
    zIndex: 1300,
    overflowY: "auto",
  };
}
