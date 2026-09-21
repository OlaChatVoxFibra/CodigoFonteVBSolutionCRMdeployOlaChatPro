/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState } from "react";
import { Check, FolderKanban, Plus, Sparkles, X } from "lucide-react";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
} from "../ui/dialog";
import { Input } from "../ui/input";
import s from "../../pages/AiBrain/brainSubClassNames";

export default function BrainProjectPicker({
  open,
  onClose,
  projects,
  activeProjectId,
  onSelect,
  onCreate,
}) {
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    const title = newTitle.trim();
    if (!title) {
      toast.error("Informe o nome do projeto.");
      return;
    }
    setCreating(true);
    try {
      await onCreate({ title });
      setNewTitle("");
      toast.success("Projeto criado.");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Erro ao criar projeto.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose?.()}>
      <DialogContent className="max-w-lg" showClose={false}>
        <DialogHeader>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2 className={s.dialogTitle}>
                <Sparkles size={18} />
                Projetos Brain.AI
              </h2>
              <p className={s.dialogLead}>
                Cada projeto Brain tem conversas próprias e pode ter vários projetos IDE Build (apps,
                MVPs, features).
              </p>
            </div>
            <button type="button" className="brain-voice__icon-btn" onClick={onClose} aria-label="Fechar">
              <X size={16} />
            </button>
          </div>
        </DialogHeader>
        <DialogBody>
          <div className={`${s.grid} ${s.grid2}`} style={{ maxHeight: "min(52vh, 420px)", overflowY: "auto" }}>
            {(projects || []).map((p) => {
              const active = p.id === activeProjectId;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`${s.card} ${active ? s.cardActive : ""}`}
                  onClick={() => {
                    onSelect(p.id);
                    onClose();
                  }}
                >
                  <div className={s.cardTop}>
                    <div className={s.cardBrand}>
                      <span
                        className={s.cardIcon}
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: p.accentColor || "#78716c",
                          border: "none",
                        }}
                      />
                      <span className={s.cardTitle}>{p.title}</span>
                    </div>
                    {active ? <Check size={14} /> : null}
                  </div>
                  <div className={s.cardMeta}>
                    {p.conversationCount ?? 0} conversa(s) · IDE Build e código próprios
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--brain-border)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                fontWeight: 600,
                color: "var(--brain-text-secondary)",
                marginBottom: 8,
              }}
            >
              <FolderKanban size={13} />
              Novo projeto
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: App de login, Landing VB…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
                className="flex-1"
              />
              <button
                type="button"
                className={s.btnPrimary}
                onClick={handleCreate}
                disabled={creating}
                style={{ whiteSpace: "nowrap" }}
              >
                <Plus size={14} />
                Criar
              </button>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
