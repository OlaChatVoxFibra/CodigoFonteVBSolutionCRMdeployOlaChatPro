/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** Tipografia e defaults de UI / fala da IA por tipo de ação inteligente */

export const HELVETICA_STACK =
  '"Helvetica Neue", HelveticaNeue, "SF Pro Text", "Segoe UI", system-ui, -apple-system, sans-serif';

export const ACTION_ICON_STYLES = {
  agendamento: {
    gradient: "linear-gradient(135deg, #6366f1 0%, #22d3ee 100%)",
    glow: "rgba(99,102,241,0.35)",
    iconColor: "#6366f1"
  },
  transferirchamado: {
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
    glow: "rgba(139,92,246,0.32)",
    iconColor: "#8b5cf6"
  },
  enviarlink: {
    gradient: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)",
    glow: "rgba(14,165,233,0.32)",
    iconColor: "#0ea5e9"
  },
  criarlead: {
    gradient: "linear-gradient(135deg, #10b981 0%, #14b8a6 100%)",
    glow: "rgba(16,185,129,0.32)",
    iconColor: "#10b981"
  },
  criarcontato: {
    gradient: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)",
    glow: "rgba(245,158,11,0.32)",
    iconColor: "#f59e0b"
  },
  criaratividade: {
    gradient: "linear-gradient(135deg, #64748b 0%, #94a3b8 100%)",
    glow: "rgba(100,116,139,0.28)",
    iconColor: "#64748b"
  },
  default: {
    gradient: "linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)",
    glow: "rgba(99,102,241,0.28)",
    iconColor: "#6366f1"
  }
};

export function iconStyleForAction(action) {
  const slug = String(action?.slug || action?.type || "").toLowerCase();
  if (slug.includes("agend")) return ACTION_ICON_STYLES.agendamento;
  if (slug.includes("transfer")) return ACTION_ICON_STYLES.transferirchamado;
  if (slug.includes("link")) return ACTION_ICON_STYLES.enviarlink;
  if (slug.includes("lead")) return ACTION_ICON_STYLES.criarlead;
  if (slug.includes("contato")) return ACTION_ICON_STYLES.criarcontato;
  if (slug.includes("atividade") || slug.includes("tarefa")) return ACTION_ICON_STYLES.criaratividade;
  return ACTION_ICON_STYLES.default;
}

/** Texto que a IA deve usar ao conduzir cada automação (salvo em variables.agentSpeechPrompt) */
export const ACTION_SPEECH_DEFAULTS = {
  agendamento: {
    title: "Fala da IA — agendamento",
    hint: "A IA convida o cliente, consulta disponibilidade no calendário e só então confirma e registra o horário.",
    placeholder:
      "Gostaria de realizar um agendamento? Vou verificar a agenda e já te confirmo o melhor horário.",
    confirmLabel: "Confirmação após marcar (opcional)",
    confirmPlaceholder: "Perfeito! Seu horário foi reservado para {{data}}."
  },
  transferirchamado: {
    title: "Fala da IA — transferência",
    hint: "Como o agente avisa que vai encaminhar para um atendente humano.",
    placeholder:
      "Entendi. Vou transferir você agora para um de nossos especialistas que continuará o atendimento.",
    confirmLabel: "Mensagem após transferir (opcional)",
    confirmPlaceholder: "Pronto! Um atendente humano assumirá em instantes."
  },
  enviarlink: {
    title: "Fala da IA — envio de link",
    hint: "Texto ao enviar o link. Use {{nome}} e {{url}} se quiser personalizar.",
    placeholder: "Claro! Segue o {{nome}} para você acessar: {{url}}",
    confirmLabel: null
  },
  criarlead: {
    title: "Fala da IA — interesse / lead",
    hint: "Como a IA reconhece interesse e convida a deixar dados para o CRM.",
    placeholder:
      "Que ótimo saber do seu interesse! Posso registrar seus dados para nossa equipe entrar em contato?",
    confirmLabel: "Após criar o lead (opcional)",
    confirmPlaceholder: "Cadastro recebido! Em breve alguém da equipe falará com você."
  },
  criarcontato: {
    title: "Fala da IA — contato",
    hint: "Como a IA pede nome e telefone para registrar o contato.",
    placeholder:
      "Para mantermos seu cadastro atualizado, pode me informar seu nome completo e o melhor telefone?",
    confirmLabel: null
  },
  criaratividade: {
    title: "Fala da IA — atividade interna",
    hint: "Quando a IA registra um follow-up ou tarefa a partir da conversa.",
    placeholder:
      "Vou registrar um lembrete interno para nossa equipe dar continuidade ao que conversamos.",
    confirmLabel: null
  }
};

export function speechConfigForAction(action) {
  const slug = String(action?.slug || "").toLowerCase();
  const type = String(action?.type || "").toLowerCase();
  if (slug.includes("agend") || type === "agendamento") return ACTION_SPEECH_DEFAULTS.agendamento;
  if (slug.includes("transfer") || type === "transferir") return ACTION_SPEECH_DEFAULTS.transferirchamado;
  if (slug.includes("link") || type === "enviar_link") return ACTION_SPEECH_DEFAULTS.enviarlink;
  if (slug.includes("lead") || type === "criar_lead") return ACTION_SPEECH_DEFAULTS.criarlead;
  if (slug.includes("contato") || type === "criar_contato") return ACTION_SPEECH_DEFAULTS.criarcontato;
  if (slug.includes("atividade") || type === "criar_atividade") return ACTION_SPEECH_DEFAULTS.criaratividade;
  return null;
}

/** Sugestões agrupadas (mescladas com presets do servidor na UI) */
export const TRIGGER_GROUP_PRESETS = {
  agendamento: {
    agent: [
      {
        label: "Convite",
        items: [
          "gostaria de realizar um agendamento",
          "gostaria de agendar",
          "podemos marcar",
          "vamos agendar"
        ]
      },
      {
        label: "Coleta de data e hora",
        items: [
          "qual o melhor dia",
          "qual o melhor horário",
          "me passe o dia e horário",
          "qual data funciona melhor",
          "tem algum horário de preferência"
        ]
      },
      {
        label: "Confirmação",
        items: [
          "posso confirmar sua agenda",
          "vou registrar seu horário",
          "posso reservar um horário"
        ]
      }
    ],
    user: [
      {
        label: "Datas relativas",
        items: ["amanhã", "depois de amanhã", "semana que vem", "hoje"]
      },
      {
        label: "Dias da semana",
        items: ["segunda", "terça", "quarta", "quinta", "sexta"]
      },
      {
        label: "Horários",
        items: ["às 10h", "de manhã", "à tarde", "noite", "horário"]
      },
      {
        label: "Confirmação",
        items: ["pode ser", "confirmo", "ok", "sim", "esse horário serve"]
      }
    ]
  },
  transferirchamado: {
    agent: [
      {
        label: "Anúncio de transferência",
        items: [
          "vou te transferir",
          "vou transferir seu chamado",
          "vou encaminhar seu atendimento",
          "um consultor vai te atender"
        ]
      },
      {
        label: "Time humano",
        items: [
          "passar para um atendente",
          "atendente humano",
          "vou chamar um especialista",
          "nosso time humano continua"
        ]
      }
    ],
    user: [
      {
        label: "Pedido explícito",
        items: [
          "gostaria de falar com um atendente",
          "quero suporte humano",
          "falar com humano",
          "transferir atendimento"
        ]
      },
      {
        label: "Confirmação",
        items: ["sim", "pode transferir", "ok", "pode sim", "chama atendente"]
      }
    ]
  },
  enviarlink: {
    agent: [
      {
        label: "Envio",
        items: ["segue o link", "vou te enviar o link", "aqui está o link", "acesse por aqui"]
      },
      {
        label: "Materiais",
        items: [
          "vou mandar o formulário",
          "vou enviar o catálogo",
          "segue nosso catálogo",
          "link de pagamento"
        ]
      }
    ],
    user: [
      {
        label: "Pedido de link",
        items: ["manda o link", "envia o link", "quero o link", "me manda", "onde acesso"]
      }
    ]
  },
  criarlead: {
    agent: [
      {
        label: "Coleta de dados",
        items: [
          "me passe seu nome",
          "qual seu telefone",
          "me informe seus dados",
          "vou registrar seu cadastro"
        ]
      }
    ],
    user: [
      {
        label: "Interesse",
        items: [
          "tenho interesse",
          "gostaria de uma demonstração",
          "quero conhecer a plataforma",
          "quero orçamento"
        ]
      },
      {
        label: "Dados",
        items: ["meu nome", "meu telefone", "email", "celular"]
      }
    ]
  },
  criarcontato: {
    agent: [
      {
        label: "Registro",
        items: [
          "vou registrar seu contato",
          "vou salvar seus dados de contato",
          "qual nome e telefone para contato"
        ]
      }
    ],
    user: [
      {
        label: "Dados / pedido",
        items: ["meu nome", "telefone", "celular", "pode cadastrar", "salva meu contato"]
      }
    ]
  },
  criaratividade: {
    agent: [
      {
        label: "Registro interno",
        items: [
          "vou registrar uma atividade",
          "vou criar um lembrete",
          "vou deixar isso como pendência"
        ]
      }
    ],
    user: [
      {
        label: "Pedido",
        items: ["cria uma atividade", "anota aí", "faz um lembrete", "acompanhar depois"]
      }
    ]
  }
};

export function triggerGroupsForAction(action, side) {
  const slug = String(action?.slug || "").toLowerCase();
  const type = String(action?.type || "").toLowerCase();
  let presetKey = null;
  if (slug.includes("agend") || type === "agendamento") presetKey = "agendamento";
  else if (slug.includes("transfer") || type === "transferir") presetKey = "transferirchamado";
  else if (slug.includes("link") || type === "enviar_link") presetKey = "enviarlink";
  else if (slug.includes("lead") || type === "criar_lead") presetKey = "criarlead";
  else if (slug.includes("contato") || type === "criar_contato") presetKey = "criarcontato";
  else if (slug.includes("atividade") || type === "criar_atividade") presetKey = "criaratividade";
  const groups = presetKey ? TRIGGER_GROUP_PRESETS[presetKey]?.[side] : null;
  return Array.isArray(groups) ? groups : null;
}

export function flattenTriggerGroups(groups) {
  if (!groups?.length) return [];
  return groups.flatMap((g) => g.items || []);
}

export function mergeSuggestionsWithGroups(flatSuggestions, groups) {
  const fromGroups = flattenTriggerGroups(groups);
  const merged = [...fromGroups, ...(flatSuggestions || [])];
  return merged.filter(
    (item, index, arr) =>
      arr.findIndex((x) => String(x).toLowerCase() === String(item).toLowerCase()) === index
  );
}
