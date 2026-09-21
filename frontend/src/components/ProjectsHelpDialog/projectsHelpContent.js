/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { AddCircleOutline, FolderOpen, Link, ViewWeek } from "@material-ui/icons";

export const PROJECTS_HELP = {
  title: "Projetos — guia completo",
  intro:
    "Agrupe atividades e empresas em projetos com prazo, responsável e status. Mesmas visões de Atividades: lista, calendário, kanban e dashboard.",
  sections: [
    {
      title: "Como criar um projeto",
      bullets: [
        "1. Botão + ou Novo projeto na página",
        "2. Drawer lateral abre à direita",
        "3. Preencha nome e demais campos → Salvar",
      ],
    },
    {
      title: "Drawer — Novo / Editar projeto (campos)",
      bullets: [
        "Nome *: identificação do projeto",
        "Descrição: escopo, entregas, observações",
        "Status: ativo, pausado ou concluído (conforme opções)",
        "Empresa: vínculo com lead convertido",
        "Responsável: gerente do projeto na equipe",
        "Atividades: selecione tarefas já criadas para vincular",
      ],
    },
    {
      title: "Visões",
      bullets: [
        "Kanban: estágios do projeto (arrastar cards)",
        "Lista e calendário: prazos e responsáveis",
        "Dashboard: progresso agregado",
      ],
    },
    {
      title: "Relação com Atividades",
      body: "Ao criar/editar atividade, escolha o Projeto no dropdown. Projetos reúnem várias atividades para um mesmo cliente ou entrega.",
      tip: "Mantenha um projeto por cliente grande; use atividades para cada passo (reunião, proposta, implantação).",
    },
  ],
};

export const PROJECTS_STEPS = [
  {
    icon: AddCircleOutline,
    color: "#007aff",
    title: "Criar projeto",
    desc: "+ → nome, responsável, empresa → Salvar.",
  },
  {
    icon: Link,
    color: "#5856d6",
    title: "Vincular atividades",
    desc: "No drawer do projeto ou na atividade, associe tarefas existentes.",
  },
  {
    icon: ViewWeek,
    color: "#ff9500",
    title: "Acompanhar no Kanban",
    desc: "Mova o projeto entre estágios conforme entrega.",
  },
  {
    icon: FolderOpen,
    color: "#34c759",
    title: "Detalhar",
    desc: "Clique no card para editar descrição e equipe.",
  },
];
