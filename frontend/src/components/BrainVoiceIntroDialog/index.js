/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { AudioLines, Key, Mic, Cpu, Volume2, Info } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "../ui/dialog";
import s from "../../pages/AiBrain/brainSubClassNames";

const REQUIREMENTS = [
  {
    icon: Key,
    title: "API Key OpenAI conectada",
    hint: "Integrações → Open IA. Necessária para transcrever sua fala (Whisper).",
  },
  {
    icon: Cpu,
    title: "Modelo de IA configurado",
    hint: "OpenAI (GPT) ou Anthropic (Claude), conforme o modelo selecionado no Brain.",
  },
  {
    icon: Mic,
    title: "Microfone permitido",
    hint: "Autorize o acesso no navegador. Recomendado: Chrome ou Edge.",
  },
  {
    icon: Volume2,
    title: "Resposta em voz",
    hint: "O Brain fala pela voz do sistema. Verifique o volume do dispositivo.",
  },
];

export default function BrainVoiceIntroDialog({ open, onClose, onContinue }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose?.()}>
      <DialogContent className="max-w-md" showClose={false}>
        <DialogHeader>
          <h2 className={s.dialogTitle}>
            <AudioLines size={18} />
            Conversa por voz Jarvis
          </h2>
          <p className={s.dialogLead}>
            Assistente em tempo real: o Brain ouve, executa ações no CRM e responde em áudio — como
            uma conversa natural. Esta função é independente do microfone do campo de texto.
          </p>
        </DialogHeader>
        <DialogBody>
          <div className="brain-sub__notice">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 8,
              }}
            >
              <Info size={13} />
              Requisitos para utilizar
            </div>
            {REQUIREMENTS.map((req) => (
              <div key={req.title} className="brain-sub__req-item">
                <div className="brain-sub__req-icon">
                  <req.icon size={14} />
                </div>
                <div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.45 }}>{req.title}</div>
                  <div style={{ fontSize: 11, color: "var(--brain-text-secondary)", marginTop: 2 }}>
                    {req.hint}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "var(--brain-text-secondary)", lineHeight: 1.45 }}>
            Sem a API Key OpenAI, não é possível transcrever sua fala. O chat por texto e demais
            recursos do Brain continuam disponíveis normalmente.
          </p>
        </DialogBody>
        <DialogFooter>
          <button type="button" className={s.btnGhost} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className={s.btnPrimary}
            onClick={() => {
              onContinue();
              onClose();
            }}
          >
            Entendi, iniciar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
