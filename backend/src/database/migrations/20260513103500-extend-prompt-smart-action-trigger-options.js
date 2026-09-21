"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


const PRESETS = [
  {
    slugs: ["agendamento", "agendar", "marcarhorario", "marcar_horario"],
    types: ["agendamento"],
    agent: [
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
    user: [
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
    ]
  },
  {
    slugs: ["transferirchamado", "transferiratendimento", "transferir_chamado"],
    types: ["transferir", "transfer"],
    agent: [
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
    user: [
      "sim",
      "pode transferir",
      "ok",
      "quero falar com atendente",
      "pode sim",
      "tudo bem",
      "confirmo",
      "quero atendente",
      "falar com humano",
      "me transfere",
      "pode passar",
      "chama atendente"
    ]
  },
  {
    slugs: ["criarlead", "criar_lead"],
    types: ["criar_lead"],
    agent: [
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
    user: ["@", "nome:", "telefone:", "whats:", "email", "e-mail", "meu nome", "meu telefone", "contato", "celular", "gmail.com", "hotmail.com"]
  },
  {
    slugs: ["enviarlink", "enviar_link"],
    types: ["enviar_link"],
    agent: ["segue o link", "vou te enviar o link", "aqui está o link", "acesse por aqui", "vou mandar o formulário", "vou enviar o catálogo", "segue nosso catálogo", "segue o formulário", "link de pagamento", "link para cadastro"],
    user: ["manda o link", "envia o link", "qual o link", "pode enviar", "me manda", "manda pra mim", "quero o link", "envia pra mim", "onde acesso", "tem link"]
  },
  {
    slugs: ["consultaragenda", "verificaragenda"],
    types: ["consultar_agenda"],
    agent: ["vou verificar a agenda", "deixa eu conferir a disponibilidade", "vou checar", "vou consultar horários", "vou ver disponibilidade", "vou conferir os horários", "deixa eu validar na agenda", "vou confirmar se temos horário"],
    user: ["tem disponibilidade", "tem horário", "qual o próximo horário", "tem vaga", "qual data tem", "quando pode", "que horas tem", "tem amanhã", "tem hoje"]
  },
  {
    slugs: ["consultarprodutos"],
    types: ["consultar_produtos"],
    agent: ["temos os seguintes produtos", "vou te mostrar nosso catálogo", "vou listar as opções", "segue nosso catálogo", "temos essas opções", "vou consultar os produtos", "vou verificar no estoque"],
    user: ["quais produtos", "tem catálogo", "o que vocês vendem", "quais opções", "me mostra", "tem disponível", "tem estoque", "quero ver produtos"]
  },
  {
    slugs: ["passarpreco", "preco"],
    types: ["preco"],
    agent: ["o valor é", "o preço fica", "o investimento é", "fica por", "o custo é", "o plano custa", "o pacote fica", "posso te passar valores"],
    user: ["qual o preço", "quanto custa", "qual o valor", "tem valor", "me passa preço", "quanto fica", "valor?", "preço?", "orçamento"]
  },
  {
    slugs: ["criaratividade"],
    types: ["ticket"],
    agent: ["vou registrar uma atividade", "abrir uma tarefa", "registrar no sistema", "vou criar uma tarefa", "vou anotar no atendimento", "vou deixar registrado"],
    user: ["ok", "pode registrar", "combinado", "pode anotar", "registra", "confirmado"]
  }
];

function normalizeList(value) {
  const arr = Array.isArray(value) ? value : [];
  return arr.map((item) => String(item || "").trim()).filter(Boolean);
}

function mergeList(current, extra) {
  return [...normalizeList(current), ...normalizeList(extra)].filter(
    (item, index, arr) => arr.findIndex((x) => x.toLowerCase() === item.toLowerCase()) === index
  );
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable("PromptSmartActions").catch(() => null);
    if (!table || !table.agentTriggerPatterns || !table.userTriggerPatterns) return;

    const rows = await queryInterface.sequelize.query(
      `SELECT id, slug, type, "agentTriggerPatterns", "userTriggerPatterns"
       FROM "PromptSmartActions"`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    for (const row of rows) {
      const slug = String(row.slug || "").toLowerCase();
      const type = String(row.type || "").toLowerCase();
      const preset = PRESETS.find((p) => p.slugs.includes(slug) || p.types.includes(type));
      if (!preset) continue;
      await queryInterface.sequelize.query(
        `UPDATE "PromptSmartActions"
         SET "enabled" = COALESCE("enabled", TRUE),
             "agentTriggerPatterns" = CAST(:agent AS jsonb),
             "userTriggerPatterns" = CAST(:user AS jsonb),
             "updatedAt" = NOW()
         WHERE id = :id`,
        {
          replacements: {
            id: row.id,
            agent: JSON.stringify(mergeList(row.agentTriggerPatterns, preset.agent)),
            user: JSON.stringify(mergeList(row.userTriggerPatterns, preset.user))
          }
        }
      );
    }
  },

  down: async () => {
    // No-op: não remover gatilhos que o usuário pode ter aceitado/editado.
  }
};
