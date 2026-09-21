/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  AddCircleOutline,
  ViewWeek,
  CalendarToday,
  Settings,
  List as ListIcon,
} from "@material-ui/icons";

export const ACTIVITIES_HELP = {
  title: "Atividades — guia completo",
  intro:
    "CRM de tarefas comerciais: ligações, reuniões, follow-ups. Use lista, calendário, kanban ou dashboard. Botão + ou Nova atividade abre o drawer lateral.",
  sections: [
    {
      title: "Visões da página",
      bullets: [
        "Lista: tabela com título, responsável, prazo e status",
        "Calendário: atividades por dia (arrastar para reagendar se habilitado)",
        "Kanban: colunas = estágios do pipeline de atividades",
        "Dashboard: totais pendentes, concluídas e atrasadas",
      ],
    },
    {
      title: "Como criar uma atividade",
      bullets: [
        "1. Clique em + ou Nova atividade na navbar",
        "2. Drawer Novo Atividade abre à direita",
        "3. Preencha título * e prazo * (mínimo 3 caracteres no título)",
        "4. Salvar: aparece na lista/kanban do estágio padrão",
      ],
    },
    {
      title: "Drawer — Novo / Editar atividade (campos)",
      bullets: [
        "Título *: nome da tarefa (ex.: Ligar para proposta)",
        "Descrição: detalhes, script, links",
        "Tipo: Tarefa, Ligação, E-mail ou Reunião",
        "Prazo *: data limite (campo data)",
        "Responsável: usuário da equipe (busca por nome)",
        "Empresa: lead convertido / empresa do CRM (opcional)",
        "Projeto: vincula a um projeto existente ou Nenhum",
        "Setor: área interna (Vendas, Suporte, etc.)",
        "Cancelar / Salvar no rodapé",
      ],
    },
    {
      title: "Modal de detalhes",
      body: "Clique em uma atividade na lista ou no kanban.",
      bullets: [
        "Resumo: título, status, responsável, datas",
        "Editar: abre o mesmo drawer em modo edição",
        "Excluir: remove a atividade (confirmação)",
        "Barra de progresso conforme estágio",
      ],
    },
    {
      title: "Kanban de atividades",
      bullets: [
        "Arraste o card entre colunas para mudar estágio",
        "Estágios padrão: Pendente, Em andamento, Concluída (podem variar)",
        "Ícone engrenagem: configurar nomes e ordem dos estágios",
      ],
    },
    {
      title: "Configurar estágios (drawer engrenagem)",
      bullets: [
        "Adicionar estágio: nome e cor",
        "Reordenar: setas para cima/baixo",
        "Excluir estágio vazio (sem atividades)",
        "Salvar: aplica em todo o módulo Atividades",
      ],
    },
    {
      title: "Filtros e busca",
      bullets: [
        "Busca por título na barra da página",
        "Filtro por responsável ou período (quando disponível)",
        "Fullscreen: expande o kanban para tela cheia",
      ],
    },
    {
      title: "Vínculos",
      body: "Atividades podem nascer de um lead (botão no formulário de lead) ou ser criadas aqui e associadas a projeto/empresa depois.",
      tip: "Use tipo Reunião para compromissos com hora; Tarefa para to-dos genéricos.",
    },
  ],
};

export const ACTIVITIES_STEPS = [
  {
    icon: AddCircleOutline,
    color: "#007aff",
    title: "Nova atividade",
    desc: "+ → título e prazo → responsável → Salvar.",
  },
  {
    icon: ViewWeek,
    color: "#5856d6",
    title: "Kanban",
    desc: "Arraste cards entre colunas de estágio.",
  },
  {
    icon: CalendarToday,
    color: "#ff9500",
    title: "Calendário",
    desc: "Veja prazos por dia; ideal para planejamento da semana.",
  },
  {
    icon: ListIcon,
    color: "#34c759",
    title: "Lista",
    desc: "Visão em tabela para exportar mentalmente ou buscar rápido.",
  },
  {
    icon: Settings,
    color: "#8e8e93",
    title: "Estágios",
    desc: "Engrenagem no kanban → personalize colunas do pipeline.",
  },
];
