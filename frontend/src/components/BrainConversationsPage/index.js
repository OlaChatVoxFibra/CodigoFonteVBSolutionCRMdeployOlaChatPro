/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { Spinner } from "../ui/spinner";
import s from "../../pages/AiBrain/brainSubClassNames";

function formatRelativeDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMin = Math.floor((now - d) / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function BrainConversationsPage({
  conversations = [],
  loading = false,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  ui = (x) => x,
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => String(c.title || "").toLowerCase().includes(q));
  }, [conversations, search]);

  return (
    <div className={s.root}>
      <div className={s.innerWide}>
        <div className={s.header}>
          <button type="button" className={s.btnDark} onClick={onNewChat}>
            <Plus size={14} />
            {ui("Novo bate-papo")}
          </button>
        </div>
        <div className={s.searchWrap}>
          <Search size={16} className={s.searchIcon} />
          <input
            className={s.searchInput}
            placeholder={ui("Pesquisar chats...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          {search ? (
            <button type="button" className={s.clearBtn} onClick={() => setSearch("")}>
              <X size={14} />
            </button>
          ) : null}
        </div>
        <div className={s.list}>
          {loading ? (
            <div className={s.loading}>
              <Spinner size={22} />
            </div>
          ) : null}
          {!loading && filtered.length === 0 ? (
            <div className={s.empty}>
              {search.trim() ? ui("Nenhuma conversa encontrada.") : ui("Nenhuma conversa neste projeto ainda.")}
            </div>
          ) : null}
          {!loading &&
            filtered.map((conv) => (
              <div
                key={conv.id}
                className={`${s.row} ${activeConversationId === conv.id ? s.rowActive : ""}`}
                onClick={() => onSelectConversation?.(conv.id)}
              >
                <span className={s.rowTitle}>{conv.title || ui("Conversa sem título")}</span>
                <span className={s.rowDate}>{formatRelativeDate(conv.updatedAt)}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
