/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useCallback, useEffect, useState } from "react";

const DEFAULT_SKILLS = [
  {
    id: "crm-assistant",
    name: "Assistente CRM",
    description:
      "Guia criação de leads, tickets, campanhas e atividades no VBSolution com processos da equipe.",
    trigger: "Automático",
    content: `# Assistente CRM

Use este skill quando o usuário pedir ajuda com CRM, leads, tickets ou campanhas.

## Processo
1. Confirme o módulo (leads, tickets, campanhas, inventário).
2. Colete dados essenciais antes de criar registros.
3. Sugira próximos passos após cada ação.`,
    enabled: true,
    addedBy: "VBSolution",
  },
];

function storageKey(userId) {
  return `brain-ai-skills:${userId || "guest"}`;
}

function readStored(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [...DEFAULT_SKILLS];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : [...DEFAULT_SKILLS];
  } catch {
    return [...DEFAULT_SKILLS];
  }
}

function normalizeSkill(skill) {
  return {
    id: String(skill.id || `skill-${Date.now()}`),
    name: String(skill.name || "Nova habilidade").slice(0, 80),
    description: String(skill.description || "").slice(0, 500),
    trigger: skill.trigger || "Automático",
    content: String(skill.content || "").slice(0, 8000),
    enabled: skill.enabled !== false,
    addedBy: skill.addedBy || "Você",
  };
}

export default function useBrainSkills(userId) {
  const [skills, setSkillsState] = useState(() => readStored(userId));

  useEffect(() => {
    setSkillsState(readStored(userId));
  }, [userId]);

  const persist = useCallback(
    (next) => {
      setSkillsState(next);
      try {
        localStorage.setItem(storageKey(userId), JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [userId]
  );

  const addSkill = useCallback(
    (partial = {}) => {
      const skill = normalizeSkill({
        id: `skill-${Date.now()}`,
        name: "Nova habilidade",
        description: "",
        content: "# Nova habilidade\n\nDescreva o processo, normas e conhecimento que o Brain deve seguir.",
        ...partial,
      });
      persist([skill, ...readStored(userId)]);
      return skill;
    },
    [persist, userId]
  );

  const updateSkill = useCallback(
    (id, patch) => {
      const next = readStored(userId).map((s) =>
        s.id === id ? normalizeSkill({ ...s, ...patch }) : s
      );
      persist(next);
    },
    [persist, userId]
  );

  const removeSkill = useCallback(
    (id) => {
      persist(readStored(userId).filter((s) => s.id !== id));
    },
    [persist, userId]
  );

  const toggleSkill = useCallback(
    (id) => {
      const next = readStored(userId).map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
      );
      persist(next);
    },
    [persist, userId]
  );

  return { skills, addSkill, updateSkill, removeSkill, toggleSkill };
}
