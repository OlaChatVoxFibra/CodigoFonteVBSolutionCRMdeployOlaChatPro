/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useHistory } from "react-router-dom";
import useBrainCredits from "../../hooks/useBrainCredits";
import useUserProfileImageUrl from "../../hooks/useUserProfileImageUrl";
import { formatBrainCredits } from "../../config/pricingCatalog";
import { getBackendUrl } from "../../config";
import { anchorPopoverStyle, useAnchorRect } from "../../hooks/useBrainAnchorPopover";
import b from "../../pages/AiBrain/brainClassNames";

function planLabel(user, creditsStatus) {
  const addon = creditsStatus?.brainAddonPlan;
  if (addon) return String(addon).toUpperCase();
  const rec = user?.company?.recurrence;
  if (rec === "freemium" || !rec) return "FREE";
  return String(rec).toUpperCase();
}

function profileName(user) {
  if (user?.name) return user.name;
  if (user?.company?.name) return user.company.name;
  return "Meu perfil";
}

function orgInitial(user) {
  const name = user?.name || user?.company?.name || "B";
  return name.charAt(0).toUpperCase();
}

export default function BrainOrgMenu({
  user,
  refreshKey = 0,
  onOpenPlans,
  brandTitle = "Brain.IA",
  isDark = false,
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const history = useHistory();
  const profileUrl = useUserProfileImageUrl();
  const fallbackAvatarUrl = `${getBackendUrl()}/public/app/noimage.png`;
  const { balance, quota, status, loading } = useBrainCredits(refreshKey);
  const rect = useAnchorRect(triggerRef.current, open);
  const displayName = profileName(user);

  const pct = quota > 0 ? Math.min(100, Math.round((balance / quota) * 100)) : 0;

  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <>
            <div className="brain-menu__overlay" onClick={close} aria-hidden />
            <div
              className={`brain-org-menu__panel brain-org-menu__panel--portal brain-org-menu__panel--open${
                isDark ? " brain-org-menu__panel--dark" : ""
              }`}
              role="menu"
              style={anchorPopoverStyle(rect, { minWidth: 232, offset: 4 })}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="brain-org-menu__back"
                onClick={() => {
                  close();
                  history.push("/");
                }}
              >
                <ChevronLeft size={12} />
                Dashboard
              </button>

              <div className="brain-org-menu__identity">
                <span className="brain-org-menu__avatar" aria-hidden>
                  {profileUrl ? (
                    <img
                      src={profileUrl}
                      alt=""
                      className="brain-org-menu__avatar-img"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = fallbackAvatarUrl;
                      }}
                    />
                  ) : (
                    orgInitial(user)
                  )}
                </span>
                <div className="brain-org-menu__identity-text">
                  <div className="brain-org-menu__identity-row">
                    <span className="brain-org-menu__org-name">{displayName}</span>
                    <span className="brain-org-menu__plan-badge">{planLabel(user, status)}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="brain-org-menu__credits-card"
                onClick={() => {
                  close();
                  onOpenPlans?.();
                }}
              >
                <div className="brain-org-menu__credits-head">
                  <span>Créditos</span>
                  <span className="brain-org-menu__credits-value">
                    {loading ? "…" : formatBrainCredits(balance)}
                    <ChevronRight size={12} />
                  </span>
                </div>
                <div className="brain-org-menu__credits-bar" aria-hidden>
                  <span className="brain-org-menu__credits-fill" style={{ width: `${pct}%` }} />
                </div>
              </button>
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <div className="brain-org-menu">
      <button
        ref={triggerRef}
        type="button"
        className="brain-org-menu__trigger"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className={b.brandGradient}>{brandTitle}</span>
        <ChevronDown
          size={12}
          className={`brain-org-menu__chevron${open ? " brain-org-menu__chevron--open" : ""}`}
        />
      </button>
      {panel}
    </div>
  );
}
