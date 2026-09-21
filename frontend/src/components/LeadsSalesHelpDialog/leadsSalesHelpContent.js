/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  AddCircleOutline,
  ViewColumn,
  TouchApp,
  CheckCircleOutline,
  FilterList,
} from "@material-ui/icons";

export const LEADS_SALES_HELP = {
  title: "Leads e vendas — guia completo",
  intro:
    "Pipeline comercial em Kanban, lista, calendário e dashboard. Crie oportunidades, acompanhe valores por etapa e feche como ganho ou perdido. Use o botão + (canto inferior direito) ou clique em um card para editar.",
  sections: [
    {
      title: "Visões da página",
      body: "Alterne pelas abas no topo da área principal.",
      bullets: [
        "Quadro: Kanban com colunas por estágio (Novo Lead, Qualificação, Proposta, etc.)",
        "Lista: tabela com busca e ordenação",
        "Calendário: leads/atividades por data",
        "Dashboard: KPIs, gráficos e totais do pipeline",
      ],
    },
    {
      title: "Filtros da barra superior",
      bullets: [
        "Busca: nome do lead, empresa ou telefone",
        "Pipeline: funil customizado (se criou pipelines extras)",
        "Responsável: filtra por vendedor/atendente dono",
        "Contato/Empresa: vínculo com cadastro",
        "Período: data de criação ou atualização",
      ],
    },
    {
      title: "Card no Kanban",
      body: "Cada card é um lead/oportunidade.",
      bullets: [
        "Nome e telefone do cliente",
        "Valor em verde: estimativa ou total dos produtos",
        "Avatar/inicial do responsável",
        "Ícones: marcar ganho (✓), perdido (✗), reagendar (relógio)",
        "Arrastar entre colunas: muda o estágio do funil",
        "Clique no card: abre painel lateral de detalhes/edição",
      ],
    },
    {
      title: "Como criar um lead",
      bullets: [
        "1. Clique no botão + flutuante (azul) no canto inferior direito",
        "2. Abre o drawer Novo lead com assistente em etapas",
        "3. Preencha Pessoais → Produto → Origem → Notas",
        "4. Salvar: o card aparece na coluna do status escolhido",
        "5. Ou vincule contato existente com Buscar existente",
      ],
    },
    {
      title: "Assistente — Etapa Pessoais",
      bullets: [
        "Nome *: obrigatório",
        "Telefone: formato com DDI (máscara +55)",
        "E-mail: contato comercial",
        "Contato: vincula cadastro WhatsApp já existente (opcional)",
        "Empresa: razão social ou nome fantasia",
        "Endereço: CEP, rua, número, bairro, cidade, UF",
      ],
    },
    {
      title: "Assistente — Etapa Produto",
      bullets: [
        "Produtos: selecione itens do Inventário (+) com quantidade",
        "Moeda: Real (R$) ou Dólar ($)",
        "Valor da venda: manual ou soma automática dos produtos",
        "Pipeline: qual funil usar (Padrão ou customizado)",
        "Status: coluna inicial (Novo Lead, Qualificação, etc.)",
        "Responsável: vendedor dono da oportunidade",
        "Prioridade: Baixa, Média, Alta ou Crítica",
        "Site: URL da empresa do lead",
      ],
    },
    {
      title: "Assistente — Etapa Origem",
      bullets: [
        "Canal: WhatsApp, Instagram, Facebook, Google, Site, Indicação, etc.",
        "Usado em relatórios para saber de onde veio o lead",
      ],
    },
    {
      title: "Assistente — Etapa Notas",
      bullets: [
        "Descrição: observações livres da negociação",
        "Tags: Enter para adicionar etiquetas (ex.: urgente, b2b)",
        "Criar atividade: agenda tarefa ligada a este lead",
      ],
    },
    {
      title: "Painel de detalhes (editar lead)",
      body: "Ao clicar no card, abre o mesmo formulário em modo visualização. Ícone de lápis em cada campo libera edição pontual.",
      bullets: [
        "Abas laterais: Resumo, Pessoais, Produto, Origem, Notas",
        "Chat WhatsApp: se houver ticket vinculado ao contato",
        "Salvar alterações no rodapé",
      ],
    },
    {
      title: "Fechar negócio",
      bullets: [
        "Ganho: ícone verde no card ou status Fechado com valor",
        "Perdido: ícone vermelho — lead sai do funil ativo",
        "Valores das colunas somam no topo de cada etapa",
      ],
      tip: "Configure pipelines e estágios em Configurações do módulo (ícone engrenagem) se disponível no seu plano.",
    },
  ],
};

export const LEADS_SALES_STEPS = [
  {
    icon: AddCircleOutline,
    color: "#007aff",
    title: "Criar lead",
    desc: 'Botão + → preencha o assistente (nome, valor, responsável) → Salvar.',
  },
  {
    icon: ViewColumn,
    color: "#5856d6",
    title: "Organizar no quadro",
    desc: "Arraste cards entre colunas conforme a negociação avança.",
  },
  {
    icon: TouchApp,
    color: "#ff9500",
    title: "Editar detalhes",
    desc: "Clique no card → drawer lateral → altere campos e produtos.",
  },
  {
    icon: CheckCircleOutline,
    color: "#34c759",
    title: "Ganho ou perdido",
    desc: "Use os ícones no card ou mova para Fechamento / marque perdido.",
  },
  {
    icon: FilterList,
    color: "#8e8e93",
    title: "Filtrar pipeline",
    desc: "Barra superior: pipeline, responsável, período e busca.",
  },
];
