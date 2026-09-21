/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { ListAlt, Palette, Link, Message } from "@material-ui/icons";

/** Documentação completa — Filas & Chatbot */

export const QUEUES_QUICK_STEPS = [
  {
    icon: ListAlt,
    color: "#5856d6",
    title: "Criar fila",
    desc: 'Filas & Chatbot → "+" → nome, cor e saudação.',
  },
  {
    icon: Link,
    color: "#007aff",
    title: "Vincular conexão",
    desc: "No wizard da conexão, etapa Filas, marque as listas.",
  },
  {
    icon: Palette,
    color: "#ff9500",
    title: "Usuários",
    desc: "Defina quem atende cada fila no modal da fila.",
  },
  {
    icon: Message,
    color: "#25D366",
    title: "Automação",
    desc: "Integração, agente IA ou chatbot na mesma fila.",
  },
];

export const QUEUES_HELP = {
  title: "Filas e Chatbot — guia completo",
  intro:
    "Filas (listas) organizam o atendimento: cada ticket pertence a uma fila. Chatbots, integrações e agentes IA são vinculados por fila ou conexão.",
  sections: [
    {
      title: "Página Filas & Chatbot",
      body: "Duas áreas principais na mesma tela.",
      bullets: [
        "Aba Filas: criar e editar listas de atendimento",
        "Aba Chatbot / opções: fluxos e automações conforme plano",
        "Botão ?: este guia",
        "Botão +: abre modal de nova fila",
      ],
    },
    {
      title: "Modal — Nova / Editar fila",
      bullets: [
        "Nome: ex. Vendas, Suporte, Financeiro",
        "Cor: identificação na lista de tickets",
        "Ordem: posição na seleção de filas",
        "Mensagem de saudação: enviada ao entrar na fila (opcional)",
        "Mensagem de encerramento: ao finalizar ticket (opcional)",
        "Integração: Dialogflow, Typebot, n8n, Flow Builder (se habilitado)",
        "Agente IA: vincule um agente criado em Agentes IA",
        "Usuários: quem pode ver/atender tickets desta fila",
      ],
    },
    {
      title: "Vincular fila à conexão WhatsApp",
      body: "Sem vínculo, mensagens podem não gerar tickets na fila certa.",
      bullets: [
        "Conexões → criar ou editar conexão → etapa Filas do wizard",
        "Marque todas as filas que aquele número atende",
        "Uma conexão pode atender várias filas",
        "Distribuição: tickets entram na fila conforme regra (menu, palavra-chave, padrão)",
      ],
    },
    {
      title: "NPS e mensagens automáticas",
      body: "Configurados no wizard da conexão (etapas opcionais após filas).",
      bullets: [
        "Boas-vindas: primeira mensagem ao novo contato",
        "Despedida: ao encerrar atendimento",
        "NPS: pesquisa de satisfação após fechar ticket",
        "Use Pular se não quiser configurar na hora",
      ],
    },
    {
      title: "Fluxo do ticket na fila",
      bullets: [
        "Cliente envia mensagem → ticket criado ou reaberto",
        "Ticket aparece na fila para atendentes autorizados",
        "Atendente assume → conversa no painel Atendimentos",
        "Encerra → NPS/disparos conforme conexão",
      ],
      tip: "Crie ao menos uma fila antes de conectar o WhatsApp. Use o ? em Conexões para o passo a passo do wizard.",
    },
  ],
};
