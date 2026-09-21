/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** Conteúdo completo dos modais de ajuda — Agentes IA */

export const PROMPTS_HUB_HELP = {
  title: "Agentes IA — guia completo",
  intro:
    "Respostas automáticas no WhatsApp com GPT (OpenAI), Claude (Anthropic) ou Gemini (Google). As API Keys são cadastradas uma vez em Integrações; neste módulo você cria os agentes e os vincula ao canal.",
  sections: [
    {
      title: "Fluxo em 5 passos",
      bullets: [
        "Integrações → cadastre a API Key do provedor (Open IA, Claude ou Gemini)",
        "Agentes IA → + → crie um agente GPT, Anthropic Claude ou com modelo Gemini",
        "No editor → aba Integração → escolha o modelo do provedor",
        "Integrações → WhatsApp / Telegram → vincule o agente na conexão",
        "Teste: aba Teste (Claude) ou ticket real na fila (GPT / Gemini)",
      ],
      tip: "Os três provedores podem estar ativos ao mesmo tempo. Cada agente usa apenas o modelo escolhido no editor.",
    },
    {
      title: "Integrações — OpenAI (GPT)",
      brandKey: "openai",
      body: "Credencial global da empresa — a API Key não é colada no editor do agente.",
      bullets: [
        "Integrações → card Open IA → Administrar (ou Criar conexão)",
        "Cole a chave sk-... gerada em platform.openai.com/api-keys",
        "Ative a integração e salve",
        "Escopo (Pessoal, Equipe ou Global) e parâmetros globais ficam nesta tela",
      ],
      tip: "Chave: platform.openai.com/api-keys",
    },
    {
      title: "Integrações — Claude (Anthropic)",
      brandKey: "claude",
      body: "Uma chave sk-ant-... por conta, compartilhada por todos os agentes Claude. O modelo é escolhido depois, na aba Integração de cada agente.",
      bullets: [
        "console.anthropic.com → Settings → API Keys → Create Key",
        "Copie a chave (sk-ant-...) na hora — ela só aparece uma vez",
        "Conta nova: Plans & Billing → adicione créditos",
        "Integrações → card Claude → Administrar → cole a chave, ative e salve",
      ],
      tip: "API Keys: console.anthropic.com/settings/keys · Créditos: console.anthropic.com/settings/billing",
    },
    {
      title: "Integrações — Gemini (Google)",
      brandKey: "gemini",
      body: "API Key do Google AI Studio, compartilhada por agentes Gemini e disponível no Brain.AI.",
      bullets: [
        "aistudio.google.com → Get API key / API Keys",
        "Integrações → card Gemini → Administrar → cole a chave e salve",
        "Use Testar conexão na aba Integração para validar",
        "Confira cota e billing no Google AI Studio para modelos avançados",
      ],
      tip: "Chave: aistudio.google.com/apikey",
    },
    {
      title: "Integrações MCP (hub)",
      body: "Figma e Google Workspace já podem ser configurados; use os chips MCP no Brain.AI.",
      bullets: [
        "Figma — Personal Access Token em Integrações → Figma",
        "Google Drive, Sheets e Calendário — OAuth em cada card do hub",
        "Brain · IDE Build — ícone de código no Brain para sandbox com preview",
        "Em breve no hub: LinkedIn, Notion e GitHub",
      ],
    },
    {
      title: "Aba Agentes — lista e criação",
      body: "GPT, Claude e Gemini na mesma lista (ícone do provedor em cada cartão). Podem coexistir na mesma empresa.",
      bullets: [
        "+ Criar agente → editor GPT (modelos OpenAI ou Gemini no seletor)",
        "+ Importar JSON → schema exportado do editor GPT",
        "+ Criar agente com Anthropic Claude → editor com Regras, Roteiro, Ações, FAQ e Base",
        "Integração (no editor): um modelo por agente — grupos OpenAI, Anthropic Claude e Gemini",
        "Editar / excluir: ícones no cartão",
      ],
    },
    {
      title: "Conteúdo do editor (GPT, Claude e Gemini)",
      body: "Mesma estrutura nos provedores; só muda o modelo na aba Integração.",
      bullets: [
        "Regras gerais: tom, limites e contexto permanente",
        "Roteiro: etapas (--- ou # ETAPA); / mídia, * variáveis",
        "Ações: gatilhos inteligentes (salve o agente antes de configurar)",
        "FAQ e Base de conhecimento: respostas e documentos de apoio",
        "Integração: modelo, fila padrão e cor do cartão",
      ],
      tip: "Claude inclui aba Teste para simular a conversa antes do WhatsApp.",
    },
  ],
};

export const PROMPTS_EDITOR_HELP = {
  title: "Editor do agente — guia completo",
  intro:
    "Configure um agente individual: personalidade, roteiro, conhecimento e automações. A API Key do provedor fica em Integrações (Open IA, Claude ou Gemini).",
  sections: [
    {
      title: "Aba Regras gerais",
      body: "Instruções permanentes para o modelo — manual do atendente virtual.",
      bullets: [
        "Tom de voz (formal, informal)",
        "Produtos/serviços que pode mencionar",
        "O que nunca deve dizer",
        "Anexos: arquivos de referência",
      ],
    },
    {
      title: "Aba Roteiro",
      body: "Script conversacional em etapas. O agente tenta seguir a ordem.",
      bullets: [
        "Nova etapa: linha --- ou # ETAPA / # PASSO 1",
        "RESPOSTA: próximo passo quando cliente confirma",
        "/ abre seletor de mídia no roteiro",
        "* insere variáveis do sistema",
        "F1 ou Ctrl+?: ajuda e briefing para colar no ChatGPT",
        "? no canto: guia do roteiro",
      ],
    },
    {
      title: "Aba Ações",
      body: "Gatilhos: quando o cliente diz X, executar automação (tag, fila, mensagem, etc.).",
      bullets: [
        "Ativar ação na lista",
        "Frases gatilho + interpretação semântica",
        "Prompts extras: ideias de intenção do cliente",
      ],
    },
    {
      title: "Aba FAQ",
      body: "Perguntas e respostas frequentes — respostas curtas e diretas.",
      bullets: ["Pergunta", "Resposta ideal", "Usado quando cliente pergunta algo similar"],
    },
    {
      title: "Aba Base de conhecimento",
      body: "Textos longos, PDFs ou conteúdo colado para consulta da IA.",
      bullets: ["Upload de arquivos", "Complementa o roteiro com fatos detalhados"],
    },
    {
      title: "Aba Integração",
      body: "Modelo de IA deste agente e vínculos operacionais.",
      bullets: [
        "Modelo: grupo OpenAI, Anthropic Claude ou Gemini no seletor",
        "Sem chave salva? O link leva a Integrações → Open IA, Claude ou Gemini",
        "Fila padrão: tickets novos nesta fila usam este agente",
        "Cor do cartão na lista de agentes",
      ],
    },
    {
      title: "IA Prompts (tickets e Brain)",
      body: "Assistente de texto no composer — ícone de varinha mágica ao lado dos anexos.",
      bullets: [
        "Corrigir gramática e ortografia do rascunho",
        "Traduzir mensagem",
        "Prompt customizado para reescrever conforme instrução",
        "No Brain.AI: mesmo recurso no campo Pergunte algo ao Brain",
      ],
    },
    {
      title: "Salvar e testar",
      bullets: [
        "Salvar: persiste no servidor",
        "Teste com ticket real na fila vinculada (ou aba Teste no Claude)",
        "Ajuste o roteiro conforme as respostas da IA",
      ],
      tip: "Roteiro claro e etapas curtas funcionam melhor que um bloco único enorme.",
    },
  ],
};

/** Ajuda do editor fullscreen de agentes Claude (multi-agente Anthropic). */
export const ANTHROPIC_AGENT_EDITOR_HELP = {
  title: "Agente Claude — guia",
  intro:
    "Editor Anthropic com a mesma estrutura do agente GPT. Usa a API Key global de Integrações e o modelo definido na aba Integração.",
  sections: [
    {
      title: "Antes de começar",
      brandKey: "claude",
      bullets: [
        "API Key sk-ant-... em Integrações → Claude → Administrar",
        "Integração Claude ativa (toggle na mesma tela)",
        "Créditos na conta (console.anthropic.com/settings/billing)",
      ],
    },
    {
      title: "Abas do editor",
      bullets: [
        "Regras Gerais: instruções permanentes",
        "Roteiro: fluxo em etapas (---, # ETAPA, / mídia, * variáveis)",
        "Ações: configure após o primeiro Salvar",
        "FAQ e Base de Conhecimento",
        "Integração: modelo Claude (Fable 5, Sonnet, Haiku, Opus…)",
        "Teste: simula mensagem com o mesmo contexto do WhatsApp",
      ],
    },
    {
      title: "Publicar no canal",
      bullets: [
        "Integração: nome, papel, modelo e fila padrão",
        "Não é necessário API Key por agente — usa a chave de Integrações",
        "Integrações → WhatsApp: selecione este agente",
      ],
    },
  ],
};
