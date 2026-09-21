/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * ACTION_PRESET_DEFS (PR 16)
 *
 * Catálogo server-side de presets de ações inteligentes. Cada preset traz
 * defaults para `agentTriggerPatterns` (gatilho na fala do agente) e
 * `userTriggerPatterns` (gatilho na resposta do cliente).
 *
 * Usado tanto pelo IntentTriggerEngine (PR 12) quanto pelo frontend (aba Ações).
 */

export interface ActionPresetDef {
  slug: string;
  name: string;
  type: string;
  icon?: string;
  description?: string;
  /** Mensagem padrão ao cliente após executar a ação (ex.: transferência) */
  responseMessage?: string;
  /** Texto orientador para a IA ao conduzir esta automação (variables.agentSpeechPrompt) */
  agentSpeechPrompt?: string;
  agentTriggerPatterns: string[];
  userTriggerPatterns: string[];
  intentSlotSchema?: Array<{ name: string; type: string; required?: boolean; label?: string }>;
}

export const ACTION_PRESET_DEFS: ActionPresetDef[] = [
  {
    slug: "agendamento",
    name: "Agendamento",
    type: "agendamento",
    icon: "Calendar",
    description: "Agenda uma reunião / visita / consulta na agenda do agente.",
    agentSpeechPrompt:
      "Gostaria de realizar um agendamento? Vou consultar a agenda para ver a disponibilidade e, em seguida, confirmar o horário com você.",
    agentTriggerPatterns: [
      "gostaria de realizar um agendamento",
      "gostaria de agendar",
      "quer agendar",
      "podemos marcar",
      "qual o melhor dia",
      "qual o melhor horário",
      "me passe o dia e horário",
      "vamos agendar",
      "posso reservar um horário",
      "quer marcar uma visita",
      "qual data funciona melhor",
      "me diga uma data",
      "tem algum horário de preferência",
      "posso confirmar sua agenda",
      "vou registrar seu horário"
    ],
    userTriggerPatterns: [
      "quero agendar",
      "preciso agendar",
      "gostaria de agendar",
      "pode agendar",
      "marcar horário",
      "amanhã",
      "depois de amanhã",
      "semana que vem",
      "próxima semana",
      "dia 1",
      "às 10h",
      "horário",
      "hoje",
      "segunda",
      "terça",
      "quarta",
      "quinta",
      "sexta",
      "de manhã",
      "à tarde",
      "noite",
      "15/05",
      "amanha as 10",
      "pode ser amanhã"
    ],
    intentSlotSchema: [
      { name: "date", type: "datetime", required: true, label: "Data e horário" }
    ]
  },
  {
    slug: "transferirchamado",
    name: "Transferir chamado",
    type: "transferir",
    icon: "ArrowRightLeft",
    description: "Transfere o atendimento para um humano.",
    responseMessage:
      "Você foi transferido para um atendente humano. Em instantes alguém da nossa equipe continuará o atendimento.",
    agentSpeechPrompt:
      "Entendi. Vou transferir você agora para um de nossos especialistas que continuará o atendimento.",
    agentTriggerPatterns: [
      "vou te transferir",
      "passar para um atendente",
      "encaminhar para um atendente",
      "atendente humano",
      "vou direcionar para o time",
      "vou passar para o setor responsável",
      "um consultor vai te atender",
      "vou chamar um especialista",
      "vou encaminhar seu atendimento",
      "vou transferir seu chamado",
      "nosso time humano continua"
    ],
    userTriggerPatterns: [
      "gostaria de falar com um atendente",
      "quero falar com atendente humano",
      "quero suporte humano",
      "transferir atendimento",
      "me transfere para um atendente",
      "pode transferir para humano",
      "falar com humano",
      "chama um atendente",
      "preciso de atendente humano",
      "encaminhar para atendente"
    ]
  },
  {
    slug: "criarlead",
    name: "Criar lead",
    type: "criar_lead",
    icon: "UserPlus",
    description: "Registra um novo lead no CRM com dados do cliente.",
    agentSpeechPrompt:
      "Que ótimo saber do seu interesse! Posso registrar seus dados para nossa equipe entrar em contato?",
    agentTriggerPatterns: [
      "me passe seu nome",
      "me passa seu e-mail",
      "qual seu telefone",
      "me informe seus dados",
      "me diga seu contato",
      "qual seu melhor e-mail",
      "qual número para contato",
      "vou registrar seu cadastro",
      "me envie nome e telefone",
      "preciso dos seus dados"
    ],
    userTriggerPatterns: [
      "tenho interesse",
      "gostaria de uma demonstração",
      "quero conhecer a plataforma",
      "@",
      "nome:",
      "telefone:",
      "whats:",
      "email",
      "e-mail",
      "meu nome",
      "meu telefone",
      "contato",
      "celular",
      "gmail.com",
      "hotmail.com"
    ],
    intentSlotSchema: [
      { name: "name", type: "string", required: true, label: "Nome" },
      { name: "email", type: "string", required: false, label: "E-mail" },
      { name: "phone", type: "string", required: true, label: "Telefone" },
      { name: "company", type: "string", required: false, label: "Empresa" },
      { name: "city", type: "string", required: false, label: "Cidade" },
      { name: "interest", type: "string", required: false, label: "Interesse" },
      { name: "responsibleId", type: "number", required: false, label: "Responsável" },
      { name: "description", type: "string", required: false, label: "Observações" }
    ]
  },
  {
    slug: "criaratividade",
    name: "Criar atividade",
    type: "criar_atividade",
    icon: "Settings",
    description: "Cria uma atividade interna vinculada ao contexto do atendimento.",
    agentSpeechPrompt:
      "Vou registrar um lembrete interno para nossa equipe dar continuidade ao que conversamos.",
    agentTriggerPatterns: [
      "vou registrar uma atividade",
      "vou criar uma atividade",
      "vou deixar essa tarefa registrada",
      "vou anotar para o responsável",
      "vou criar um lembrete",
      "vou abrir uma tarefa",
      "vou registrar esse acompanhamento",
      "vou deixar isso como pendência"
    ],
    userTriggerPatterns: [
      "cria uma atividade",
      "registra isso",
      "anota aí",
      "deixa registrado",
      "cria uma tarefa",
      "faz um lembrete",
      "me lembra",
      "acompanhar depois"
    ],
    intentSlotSchema: [
      { name: "title", type: "string", required: false, label: "Título" },
      { name: "description", type: "string", required: false, label: "Descrição" },
      { name: "date", type: "datetime", required: false, label: "Data" },
      { name: "userId", type: "number", required: false, label: "Responsável" }
    ]
  },
  {
    slug: "criarcontato",
    name: "Criar contato",
    type: "criar_contato",
    icon: "UserPlus",
    description: "Cria ou atualiza o contato usando dados coletados na conversa.",
    agentSpeechPrompt:
      "Para mantermos seu cadastro atualizado, pode me informar seu nome completo e o melhor telefone?",
    agentTriggerPatterns: [
      "vou registrar seu contato",
      "vou criar seu contato",
      "vou atualizar seu contato",
      "me passe nome e telefone",
      "me informe seus dados de contato",
      "vou salvar seus dados de contato",
      "vou deixar seu contato cadastrado",
      "qual nome e telefone para contato"
    ],
    userTriggerPatterns: [
      "meu nome",
      "telefone",
      "whatsapp",
      "contato",
      "celular",
      "email",
      "e-mail",
      "@",
      "pode cadastrar",
      "salva meu contato"
    ],
    intentSlotSchema: [
      { name: "name", type: "string", required: true, label: "Nome" },
      { name: "phone", type: "string", required: true, label: "Telefone" },
      { name: "email", type: "string", required: false, label: "E-mail" },
      { name: "company", type: "string", required: false, label: "Empresa" },
      { name: "city", type: "string", required: false, label: "Cidade" }
    ]
  },
  {
    slug: "enviarlink",
    name: "Enviar link",
    type: "enviar_link",
    icon: "Link2",
    description: "Envia um link relevante (catálogo, formulário, agenda).",
    agentSpeechPrompt: "Claro! Segue o {{nome}} para você acessar: {{url}}",
    agentTriggerPatterns: [
      "segue o link",
      "vou te enviar o link",
      "aqui está o link",
      "acesse por aqui",
      "vou mandar o formulário",
      "vou enviar o catálogo",
      "segue nosso catálogo",
      "segue o formulário",
      "link de pagamento",
      "link para cadastro"
    ],
    userTriggerPatterns: [
      "manda o link",
      "envia o link",
      "qual o link",
      "pode enviar",
      "me manda",
      "manda pra mim",
      "quero o link",
      "envia pra mim",
      "onde acesso",
      "tem link"
    ]
  },
  {
    slug: "consultaragenda",
    name: "Consultar agenda",
    type: "consultar_agenda",
    icon: "CalendarSearch",
    description: "Verifica disponibilidade na agenda.",
    agentTriggerPatterns: [
      "vou verificar a agenda",
      "deixa eu conferir a disponibilidade",
      "vou checar",
      "vou consultar horários",
      "vou ver disponibilidade",
      "vou conferir os horários",
      "deixa eu validar na agenda",
      "vou confirmar se temos horário"
    ],
    userTriggerPatterns: [
      "tem disponibilidade",
      "tem horário",
      "qual o próximo horário",
      "tem vaga",
      "qual data tem",
      "quando pode",
      "que horas tem",
      "tem amanhã",
      "tem hoje"
    ]
  },
  {
    slug: "consultarprodutos",
    name: "Consultar produtos",
    type: "consultar_produtos",
    icon: "Package",
    description: "Lista produtos/serviços disponíveis.",
    agentTriggerPatterns: [
      "temos os seguintes produtos",
      "vou te mostrar nosso catálogo",
      "vou listar as opções",
      "segue nosso catálogo",
      "temos essas opções",
      "vou consultar os produtos",
      "vou verificar no estoque"
    ],
    userTriggerPatterns: [
      "quais produtos",
      "tem catálogo",
      "o que vocês vendem",
      "quais opções",
      "me mostra",
      "tem disponível",
      "tem estoque",
      "quero ver produtos"
    ]
  },
  {
    slug: "passarpreco",
    name: "Passar preço",
    type: "preco",
    icon: "DollarSign",
    description: "Envia o preço de um produto/serviço.",
    agentTriggerPatterns: [
      "o valor é",
      "o preço fica",
      "o investimento é",
      "fica por",
      "o custo é",
      "o plano custa",
      "o pacote fica",
      "posso te passar valores"
    ],
    userTriggerPatterns: [
      "qual o preço",
      "quanto custa",
      "qual o valor",
      "tem valor",
      "me passa preço",
      "quanto fica",
      "valor?",
      "preço?",
      "orçamento"
    ]
  },
  {
    slug: "consultarestoque",
    name: "Consultar estoque",
    type: "consultar_estoque",
    icon: "Boxes",
    description: "Informa disponibilidade e quantidade em estoque.",
    agentTriggerPatterns: [
      "vou verificar o estoque",
      "deixa eu conferir a disponibilidade",
      "vou checar se ainda tem",
      "vou ver quantas unidades temos"
    ],
    userTriggerPatterns: [
      "tem disponível",
      "ainda tem",
      "tem em estoque",
      "quantas unidades",
      "tem unidade",
      "está disponível",
      "tem no estoque"
    ]
  },
  {
    slug: "enviarlinkproduto",
    name: "Enviar link do produto",
    type: "enviar_link_produto",
    icon: "Link",
    description: "Envia o link de compra do produto.",
    agentTriggerPatterns: [
      "segue o link de compra",
      "vou te enviar o link do produto",
      "pode comprar por este link",
      "aqui está o link para comprar"
    ],
    userTriggerPatterns: [
      "manda o link",
      "envia o link de compra",
      "quero o link",
      "link para comprar",
      "onde compro",
      "como compro"
    ]
  },
  {
    slug: "registrarintencaocompra",
    name: "Registrar intenção de compra",
    type: "registrar_intencao_compra",
    icon: "ShoppingCart",
    description: "Registra interesse de compra no ticket (não baixa estoque).",
    agentTriggerPatterns: [
      "vou registrar seu interesse",
      "vou anotar que você quer comprar",
      "podemos seguir com a compra",
      "vou deixar sua intenção registrada"
    ],
    userTriggerPatterns: [
      "quero comprar",
      "quero esse",
      "vou levar",
      "pode fechar",
      "quero adquirir",
      "me interessa comprar"
    ]
  }
];

export function findActionPresetBySlug(slug: string): ActionPresetDef | null {
  const s = String(slug || "").toLowerCase();
  return ACTION_PRESET_DEFS.find((p) => p.slug.toLowerCase() === s) || null;
}
