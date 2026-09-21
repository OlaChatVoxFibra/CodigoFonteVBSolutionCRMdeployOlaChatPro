/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Mic, User, UserRound } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "../ui/dialog";
import s from "../../pages/AiBrain/brainSubClassNames";

export default function BrainVoiceGenderDialog({ open, onClose, onSelect }) {
  const handlePick = (gender) => {
    onSelect(gender);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose?.()}>
      <DialogContent className="max-w-md" showClose={false}>
        <DialogHeader>
          <h2 className={s.dialogTitle}>
            <Mic size={18} />
            Conversa por voz
          </h2>
          <p className={s.dialogLead}>
            Escolha a voz do assistente. O Brain responderá em áudio usando a voz do seu sistema
            operacional.
          </p>
        </DialogHeader>
        <DialogBody>
          <div className="brain-sub__notice">
            Requer <strong>API Key OpenAI</strong> em Integrações → Open IA (Whisper) e microfone
            liberado no navegador.
          </div>
          <div className={s.voiceGenderOptions}>
            <button
              type="button"
              className={s.voiceGenderOption}
              onClick={() => handlePick("female")}
            >
              <UserRound size={22} style={{ margin: "0 auto 8px", display: "block" }} />
              <div style={{ fontWeight: 600, fontSize: 14 }}>Voz feminina</div>
              <div style={{ fontSize: 11, color: "var(--brain-text-secondary)", marginTop: 4 }}>
                Voz do sistema · tom claro
              </div>
            </button>
            <button
              type="button"
              className={s.voiceGenderOption}
              onClick={() => handlePick("male")}
            >
              <User size={22} style={{ margin: "0 auto 8px", display: "block" }} />
              <div style={{ fontWeight: 600, fontSize: 14 }}>Voz masculina</div>
              <div style={{ fontSize: 11, color: "var(--brain-text-secondary)", marginTop: 4 }}>
                Voz do sistema · tom firme
              </div>
            </button>
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" className={s.btnGhost} onClick={onClose}>
            Cancelar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
