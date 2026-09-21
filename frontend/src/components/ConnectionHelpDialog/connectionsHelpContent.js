/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** Guias passo a passo — hub Integrações e wizard WhatsApp */

export const CONNECTION_GUIDES = [
  {
    id: "overview",
    label: "Visão geral",
    accent: "#007aff",
    tagline: "Como navegar no hub de integrações",
    steps: [
      {
        title: "Abra Integrações",
        desc: "Menu lateral → Integrações. Cada card representa um canal ou módulo.",
      },
      {
        title: "Administrar um canal",
        desc: 'Clique em "Administrar →" no card para listar, criar ou editar conexões daquele tipo.',
      },
      {
        title: "Prepare as filas",
        desc: "Em Filas & Chatbot, crie ao menos uma fila antes de conectar canais de mensagem.",
      },
      {
        title: "Leia o status no card",
        desc: "O indicador e a contagem mostram se já existe conexão ativa. Cards com tag Em breve ainda não podem ser configurados.",
      },
      {
        title: "Provedores de IA",
        desc: "Open IA (GPT), Claude (Anthropic), Gemini (Google) e Grok (xAI) configuram a API Key no hub; agentes ficam em Agente IA.",
      },
      {
        title: "API & MCP do CRM",
        desc: "Card API & MCP CRM gera credenciais da sua organização para extrair leads, atividades e tickets via REST ou MCP (Claude Code, Cursor, Zapier, Make).",
      },
      {
        title: "MCPs e produtividade",
        desc: "Figma, Google Drive, Google Sheets, Google Calendário, GitHub e Notion podem ser configurados em Integrações. Ative os chips MCP no Brain.AI para o assistente usar essas ferramentas.",
      },
      {
        title: "CRMs e importação",
        desc: "HubSpot, ClickUp e Pipedrive conectam via OAuth. Use Importar em Leads, Atividades, Projetos etc. para trazer dados do CRM externo para o VBSolution.",
      },
      {
        title: "Supabase e IDE Build",
        desc: "Conecte Supabase via OAuth para o Brain.AI IDE Build publicar código no Postgres, auth e storage da organização — sem copiar credenciais manualmente.",
      },
      {
        title: "Brain · IDE Build",
        desc: "No Brain.AI, o ícone de código no topo abre o painel Projeto de código: editor, preview ao vivo, abrir pasta local e exportar PDF pelo navegador — estilo Lovable/Cursor.",
      },
    ],
    tip: "Open IA, Claude e Gemini podem ficar ativos ao mesmo tempo. No Brain.AI, escolha o modelo por mensagem; cada agente usa o modelo definido no editor.",
  },
  {
    id: "whatsapp-web",
    label: "WhatsApp Web",
    accent: "#25D366",
    tagline: "QR Code — ideal para começar rápido",
    steps: [
      {
        title: "Configure as filas",
        desc: "Filas & Chatbot → Filas. Crie listas e vincule-as na etapa Filas da conexão.",
      },
      {
        title: "Nova conexão Web",
        desc: "Card WhatsApp Web → Administrar → Nova conexão. Nome, grupos e importar histórico, se precisar.",
      },
      {
        title: "Escaneie o QR Code",
        desc: "No celular: WhatsApp → Dispositivos conectados → Conectar. Aponte para o QR na tela.",
      },
      {
        title: "Aguarde Conectado",
        desc: 'Status "CONNECTED" indica que o canal está pronto para receber mensagens.',
      },
      {
        title: "Mensagens e fluxos (opcional)",
        desc: "Boas-vindas, despedida, NPS e fluxos automáticos podem ser definidos na criação ou depois.",
      },
    ],
    tip: "Sessão Web é renovada automaticamente a cada 1 hora para evitar quedas.",
  },
  {
    id: "whatsapp-oficial",
    label: "WhatsApp API",
    accent: "#25D366",
    tagline: "Meta Cloud API — templates e escala",
    steps: [
      {
        title: "Configure as filas",
        desc: "Mesmo fluxo do Web: filas criadas em Filas & Chatbot antes de vincular.",
      },
      {
        title: "Conta Meta Business",
        desc: "Conta em business.facebook.com com WhatsApp Business API ativo no app Meta.",
      },
      {
        title: "Colete os IDs",
        desc: "Phone Number ID, WABA ID, Business ID e token permanente no Meta Developers.",
      },
      {
        title: "Crie a conexão oficial",
        desc: "Card WhatsApp API Oficial → Administrar → Nova. Preencha credenciais e salve.",
      },
      {
        title: "Webhook na Meta",
        desc: "Configure o callback URL e verifique o token no painel Meta. Templates exigem aprovação.",
      },
      {
        title: "Funcionalidades exclusivas API Oficial",
        desc: "Após conectar: sincronize templates, use campanhas com template Meta, botões/enquetes (lista) no ticket, e acompanhe quality rating na lista de conexões.",
      },
      {
        title: "Janela de 24 horas",
        desc: "Dentro de 24h após mensagem do cliente: texto livre. Fora disso ou primeiro contato: apenas templates aprovados. O chip no ticket mostra o tempo restante.",
      },
    ],
    tip: "Documentação oficial:",
    tipLink: "https://developers.facebook.com/docs/whatsapp/cloud-api",
    tipLinkLabel: "Meta Cloud API",
  },
  {
    id: "telegram-bot",
    label: "Telegram",
    accent: "#0088cc",
    tagline: "Bot API — clientes falam com seu @bot",
    steps: [
      {
        title: "Crie o bot no BotFather",
        desc: "No Telegram, abra @BotFather → /newbot → copie o token de acesso.",
      },
      {
        title: "Abra o canal no hub",
        desc: "Card Telegram → Administrar → Nova conexão.",
      },
      {
        title: "Token e identidade",
        desc: "Cole o token, teste a conexão e defina nome interno, cor e mensagem de boas-vindas.",
      },
      {
        title: "Filas e agente IA",
        desc: "Selecione filas de atendimento e, se quiser, um agente IA padrão.",
      },
      {
        title: "Webhook ou polling",
        desc: "Use a URL de webhook exibida no painel ou deixe o sistema em modo polling, conforme orientação salva.",
      },
    ],
    tip: "Mensagens enviadas ao @bot do Telegram viram tickets automaticamente.",
  },
  {
    id: "telegram-oficial",
    label: "Telegram Oficial",
    accent: "#229ED9",
    tagline: "MTProto — conta real, não é bot",
    steps: [
      {
        title: "App em my.telegram.org",
        desc: "Crie um aplicativo em my.telegram.org/apps e anote api_id e api_hash.",
      },
      {
        title: "Nova conexão MTProto",
        desc: "Card Telegram Oficial → Administrar → Nova conexão.",
      },
      {
        title: "Credenciais e telefone",
        desc: "Informe api_id, api_hash e o número da conta (formato internacional).",
      },
      {
        title: "Login SMS / app",
        desc: "Solicite o código, cole o recebido no Telegram e confirme senha 2FA, se existir.",
      },
      {
        title: "Sessão ativa",
        desc: "Após conectado, mensagens recebidas na conta logada entram como tickets.",
      },
    ],
    tip: "Use o número de telefone da conta, não o @username, para autenticar.",
  },
  {
    id: "sms",
    label: "SMS",
    accent: "#2563eb",
    tagline: "Vonage ou Twilio — inbound por webhook",
    steps: [
      {
        title: "Conta no provedor",
        desc: "Tenha número SMS ativo na Vonage ou Twilio com API Key e Secret (ou SID/Token Twilio).",
      },
      {
        title: "Nova conexão SMS",
        desc: "Card SMS → Administrar → Nova. Escolha provedor e nome interno.",
      },
      {
        title: "Credenciais e remetente",
        desc: "Preencha número remetente (From), chaves API e salve a conexão.",
      },
      {
        title: "Webhook inbound",
        desc: "Copie a URL gerada no painel e configure no console Vonage/Twilio para mensagens recebidas.",
      },
      {
        title: "Teste envio e recebimento",
        desc: "Use o teste no formulário e confira se tickets são criados ao receber SMS.",
      },
    ],
    tip: "A URL do webhook é copiada automaticamente após salvar, quando disponível.",
  },
  {
    id: "facebook",
    label: "Facebook",
    accent: "#1877F2",
    tagline: "Messenger e páginas Meta",
    steps: [
      {
        title: "Página Facebook",
        desc: "É necessária uma Página vinculada à empresa (facebook.com/pages).",
      },
      {
        title: "Administrar Facebook",
        desc: "Card Facebook → Administrar → Conectar com Facebook.",
      },
      {
        title: "Login e permissões",
        desc: "Autorize o app Meta e selecione as páginas que deseja atender.",
      },
      {
        title: "Vincule filas",
        desc: "Na conexão criada, associe filas e mensagens automáticas, se aplicável.",
      },
      {
        title: "Messenger ativo",
        desc: "Com status conectado, mensagens do Messenger viram tickets na plataforma.",
      },
    ],
    tip: "Instagram Business usa a mesma base de login Meta quando vinculado à página.",
  },
  {
    id: "instagram",
    label: "Instagram",
    accent: "#E1306C",
    tagline: "Direct e comentários — conta Business",
    steps: [
      {
        title: "Conta Business",
        desc: "Perfil Instagram Business vinculado a uma Página do Facebook.",
      },
      {
        title: "Administrar Instagram",
        desc: "Card Instagram → Administrar → Conectar com Facebook (fluxo Meta).",
      },
      {
        title: "Autorize a página",
        desc: "Selecione a página que gerencia o Instagram desejado.",
      },
      {
        title: "Filas e automações",
        desc: "Configure filas, boas-vindas e agente IA na conexão, como nos outros canais.",
      },
      {
        title: "Direct e comentários",
        desc: "Mensagens Direct e interações elegíveis entram no fluxo de atendimento.",
      },
    ],
    tip: "Sem Página Facebook vinculada, a conexão Instagram não será concluída.",
  },
  {
    id: "email",
    label: "E-mail",
    accent: "#EA4335",
    tagline: "Gmail · Outlook — módulo dedicado",
    external: true,
    steps: [
      {
        title: "Abrir o módulo",
        desc: 'No hub, clique em "Abrir módulo →" no card E-mail ou use o menu E-mail.',
      },
      {
        title: "Conectar caixa",
        desc: "Siga o assistente para vincular Gmail ou Outlook com OAuth seguro.",
      },
      {
        title: "Templates e campanhas",
        desc: "Crie modelos, listas e agendamentos no mesmo módulo.",
      },
      {
        title: "Envio e histórico",
        desc: "Dispare campanhas e acompanhe status de entrega na caixa integrada.",
      },
    ],
    tip: "E-mail não aparece na lista de Integrações — é gerenciado no módulo próprio.",
  },
  {
    id: "openai",
    label: "Open IA",
    accent: "#10a37f",
    tagline: "OpenAI — agentes de IA no atendimento (Brain.AI usa infraestrutura interna)",
    steps: [
      {
        title: "Escopo desta integração",
        desc: "A API Key cadastrada aqui é exclusiva para Agentes de IA (WhatsApp, Telegram, automações). O Brain.AI não usa esta chave — opera com infraestrutura interna da VBSolution e cobrança via créditos Brain (Stripe).",
      },
      {
        title: "Abra o card Open IA",
        desc: 'Integrações → card Open IA → "Administrar →". Se ainda não houver chave, use Criar conexão.',
      },
      {
        title: "API Key OpenAI",
        desc: "Gere em platform.openai.com/api-keys (formato sk-...). A chave só é exibida uma vez — copie na hora.",
      },
      {
        title: "Salvar integração",
        desc: "Ative a integração, defina escopo (Pessoal, Equipe ou Global) e clique em Salvar integração.",
      },
      {
        title: "Modelo por agente",
        desc: "O modelo GPT é escolhido em Agente IA → criar/editar agente → aba Integração do editor.",
      },
      {
        title: "Vincule aos canais",
        desc: "Em Integrações → WhatsApp ou Telegram, selecione o agente GPT na etapa de filas / IA.",
      },
    ],
    tip: "Documentação OpenAI:",
    tipLink: "https://platform.openai.com/api-keys",
    tipLinkLabel: "API Keys",
  },
  {
    id: "vbsolution-api",
    label: "API & MCP CRM",
    accent: "#6366f1",
    tagline: "Exporte dados da sua organização via REST API ou MCP",
    steps: [
      {
        title: "Abra API & MCP",
        desc: "Integrações → card API & MCP CRM → Abrir, ou Menu lateral → Mais → API & MCP.",
      },
      {
        title: "Gere a API Key",
        desc: 'Clique em Nova API Key. Defina nome e escopos. Copie a chave na hora — ela não será exibida novamente.',
      },
      {
        title: "REST API",
        desc: "Use a Base URL com Authorization: Bearer <key> ou X-API-Key. Endpoints: contatos, leads, atividades, tickets, dashboard.",
      },
      {
        title: "MCP — Claude / Cursor",
        desc: "Copie o JSON MCP da página API & MCP e adicione nas configurações do assistente (Claude Desktop, Cursor ou VS Code). Pacote @vbsolution/crm-mcp — substitua a API Key e use a URL de produção Railway.",
      },
      {
        title: "Zapier / Make / n8n",
        desc: "Módulo HTTP com a mesma API Key. Automatize exportação de leads e sincronização de dados do CRM.",
      },
      {
        title: "Segurança",
        desc: "A chave acessa somente dados da sua organização. Revogue e gere nova se houver vazamento.",
      },
    ],
    tip: "Cada organização tem credenciais isoladas — não compartilhe chaves entre contas diferentes.",
  },
  {
    id: "claude",
    label: "Claude",
    accent: "#D97757",
    tagline: "Anthropic — agentes de IA no atendimento (Brain.AI usa infraestrutura interna)",
    steps: [
      {
        title: "Escopo desta integração",
        desc: "A API Key Anthropic aqui alimenta apenas os Agentes de IA Claude no atendimento. O Brain.AI utiliza chaves internas da plataforma — não é necessário configurar chave nesta tela para conversar no Brain.",
      },
      {
        title: "Abra o card Claude",
        desc: 'Integrações → card Claude → "Administrar →". Se ainda não houver chave, use Criar conexão.',
      },
      {
        title: "API Key Anthropic",
        desc: "Gere em console.anthropic.com → Settings → API Keys (formato sk-ant-...). A chave só é exibida uma vez — copie na hora.",
      },
      {
        title: "Créditos e conta",
        desc: "Contas novas precisam de saldo em Plans & Billing na Anthropic. Sem créditos, as chamadas falham mesmo com chave válida.",
      },
      {
        title: "Salvar integração",
        desc: "Ative Claude, defina escopo (Pessoal, Equipe ou Global) e clique em Salvar integração. O painel à direita confirma se a chave está configurada.",
      },
      {
        title: "Modelo por agente",
        desc: "O modelo Claude (Sonnet, Opus, Haiku…) é escolhido em Agente IA → criar/editar agente Claude → aba Integração do editor — não nesta tela de Conexões.",
      },
      {
        title: "Agentes e testes",
        desc: "Crie agentes Claude em Agente IA → Agentes (botão + → Anthropic Claude). O teste de conversa fica na aba Teste do editor do agente.",
      },
      {
        title: "Vincule aos canais",
        desc: "Em Integrações → WhatsApp ou Telegram, selecione o agente Claude na etapa de filas / IA. O Brain.AI usa infraestrutura própria da VBSolution, independente desta chave.",
      },
    ],
    tip: "Documentação Anthropic:",
    tipLink: "https://console.anthropic.com/settings/keys",
    tipLinkLabel: "API Keys e billing",
  },
  {
    id: "gemini",
    label: "Gemini",
    accent: "#4285F4",
    tagline: "Google Gemini — agentes de IA no atendimento (Brain.AI usa infraestrutura interna)",
    steps: [
      {
        title: "Escopo desta integração",
        desc: "A API Key Gemini é usada pelos Agentes de IA no atendimento e fluxos. O Brain.AI opera com chaves internas da VBSolution — o consumo é debitado dos créditos Brain, sem necessidade de chave nesta conexão.",
      },
      {
        title: "Abra o card Gemini",
        desc: 'Integrações → card Gemini → "Administrar →". Se ainda não houver chave, use Criar conexão.',
      },
      {
        title: "API Key no Google AI Studio",
        desc: "Acesse aistudio.google.com → Get API key (ou API Keys). Crie a chave no projeto Google Cloud; copie e cole no campo API Key da integração para os agentes de atendimento da sua organização.",
      },
      {
        title: "Cota e faturamento",
        desc: "Confira uso e limites em Usage & Billing no AI Studio. Projetos novos podem exigir billing ativo no Google Cloud para modelos avançados e geração de imagem.",
      },
      {
        title: "Salvar integração",
        desc: 'Ative a integração, escolha o modelo padrão (Flash, Pro, Nano Banana para imagens), escopo e parâmetros. Clique em Salvar integração. Use "Testar conexão" na aba Integração para validar a chave.',
      },
      {
        title: "Modelo por agente",
        desc: "O modelo Gemini é escolhido em Agente IA → criar/editar agente → aba Integração do editor. No Brain.AI, os modelos Gemini são selecionados no seletor interno — sem usar esta chave.",
      },
      {
        title: "Recursos disponíveis",
        desc: "Chat multimodal (texto, imagem, áudio e PDF nos testes), geração de imagem com Nano Banana no Brain, tools CRM no Brain (leads, tickets, campanhas) e agentes no WhatsApp com roteiro e regras — mesmo padrão Claude/OpenAI.",
      },
      {
        title: "Vincule aos canais",
        desc: "Em Integrações → WhatsApp ou Telegram, selecione o agente Gemini na etapa de filas / IA quando o modelo do agente for Google Gemini.",
      },
    ],
    tip: "Documentação e chave de API:",
    tipLink: "https://aistudio.google.com/apikey",
    tipLinkLabel: "Google AI Studio — API Keys",
  },
  {
    id: "grok",
    label: "Grok",
    accent: "#1C1C1C",
    tagline: "xAI Grok — agentes no atendimento e modelos no Brain.AI",
    steps: [
      {
        title: "O que esta integração faz",
        desc: "A API Key da xAI alimenta Agentes de IA com modelos Grok nos canais (WhatsApp, Telegram etc.). No Brain.AI, você também seleciona modelos Grok; a chave da organização pode ser usada se a plataforma não tiver BRAIN_PLATFORM_XAI_API_KEY.",
      },
      {
        title: "Abra o card Grok",
        desc: 'Integrações → card Grok → "Administrar →". Se ainda não houver chave, use Criar conexão.',
      },
      {
        title: "API Key no console xAI",
        desc: "Acesse console.x.ai, faça login, gere uma API Key (geralmente começa com xai-) e cole no campo API Key da integração.",
      },
      {
        title: "Salvar e ativar",
        desc: 'Ative "Grok ativo", escolha o escopo (Pessoal / Equipe / Global) e Salvar. A chave fica criptografada por organização.',
      },
      {
        title: "Usar no Agente IA (tickets)",
        desc: "Em Agente IA (/prompts), escolha um modelo Grok (ex.: Grok 4.1 Fast) na aba Integração, salve o agente e vincule-o à conexão WhatsApp/Telegram. O agente responde tickets com a API xAI.",
      },
      {
        title: "Usar no Brain.AI",
        desc: "No Brain.AI, abra o seletor de modelos → Grok (xAI) → escolha o modelo e converse. O consumo debitado dos créditos Brain.",
      },
    ],
    tip: "Console xAI (API Keys):",
    tipLink: "https://console.x.ai/",
    tipLinkLabel: "console.x.ai",
  },
  {
    id: "figma",
    label: "Figma",
    accent: "#A259FF",
    tagline: "MCP de design — protótipos, componentes e handoff no Brain",
    steps: [
      {
        title: "Abra Integrações → Figma",
        desc: 'Card Figma → "Administrar →". Gere um Personal Access Token em figma.com → Settings → Security → Personal access tokens.',
      },
      {
        title: "Salvar integração",
        desc: "Cole o token, ative a integração, defina escopo (Pessoal, Equipe ou Global) e clique em Salvar integração.",
      },
      {
        title: "Ativar MCP no Brain",
        desc: "Brain.AI → aba MCP → marque Figma (e Google Drive, se for usar handoff). Salve a seleção na sessão.",
      },
      {
        title: "Protótipos navegáveis",
        desc: "Peça telas ou fluxos: o Brain gera HTML interativo (preview e download). PNG/PDF pelo servidor exigem Chrome no backend; use Exportar PDF (navegador) no modal.",
      },
      {
        title: "Levar pro Figma",
        desc: "Ao pedir para subir no Figma, o Brain publica HTML + guia no Google Drive (a API do Figma não cria arquivos .fig automaticamente). Siga os passos do modal e importe no seu time/projeto Figma.",
      },
      {
        title: "Arquivos existentes",
        desc: "Com link ou file key, o Brain lista páginas, componentes, variáveis, comentários e pode abrir protótipo navegável já publicado no Figma.",
      },
    ],
    tip: "Plano gratuito do Figma pode limitar novos projetos no time — use o projeto existente da equipe quando necessário.",
  },
  {
    id: "google-workspace",
    label: "Google Workspace",
    accent: "#4285F4",
    tagline: "Drive, Sheets e Calendário — MCP no Brain",
    steps: [
      {
        title: "Google Drive",
        desc: "Integrações → Google Drive → Administrar → conectar conta Google (OAuth). O Brain lista pastas/arquivos e pode enviar anexos ou pacotes (ex.: handoff Figma).",
      },
      {
        title: "Google Sheets",
        desc: "Integrações → Google Sheets → OAuth. Leitura e escrita de planilhas para leads, relatórios e dados operacionais.",
      },
      {
        title: "Google Calendário",
        desc: "Integrações → Google Calendário → OAuth. Consulta eventos e alinha agendamentos com a agenda real da empresa.",
      },
      {
        title: "MCP no Brain",
        desc: "Brain.AI → MCP → habilite Drive, Sheets e/ou Calendário conforme a tarefa. Exportações do Brain (planilhas, HTML) podem ir para o Drive quando conectado.",
      },
    ],
    tip: "Cada serviço Google é um card separado no hub; conecte apenas os que sua equipe usará no dia a dia.",
  },
  {
    id: "github",
    label: "GitHub",
    accent: "#181717",
    tagline: "Issues, pull requests e repositórios no Brain",
    steps: [
      {
        title: "Abra Integrações → GitHub",
        desc: 'Card GitHub → "Administrar →". Conecte com OAuth GitHub ou informe um Personal Access Token.',
      },
      {
        title: "Autorize a organização",
        desc: "No popup OAuth, autorize o acesso aos repositórios da organização. Tokens ficam criptografados por workspace.",
      },
      {
        title: "Ativar MCP no Brain",
        desc: "Brain.AI → aba MCP → marque GitHub. O assistente pode consultar issues, PRs e código vinculado.",
      },
      {
        title: "Suporte e bugs",
        desc: "Peça contexto de repositórios, abra issues ou revise pull requests direto no chat do Brain.",
      },
    ],
    tip: "Documentação GitHub OAuth:",
    tipLink: "https://docs.github.com/en/apps/oauth-apps",
    tipLinkLabel: "OAuth Apps",
  },
  {
    id: "hubspot",
    label: "HubSpot",
    accent: "#FF7A59",
    tagline: "MCP CRM — importe leads, contatos, atividades e agenda",
    steps: [
      {
        title: "Conecte com OAuth",
        desc: 'Integrações → HubSpot → "Conectar conta HubSpot". Autorize o portal da organização no popup.',
      },
      {
        title: "O que importa",
        desc: "Contatos, deals (leads), tarefas e eventos de agenda do HubSpot para Leads, Empresas, Atividades e Calendário no VBSolution.",
      },
      {
        title: "Como importar",
        desc: 'Abra o módulo desejado (Leads, Atividades, etc.) e clique em Importar. A importação respeita a página em que você está e roda na hora via API.',
      },
      {
        title: "Isolamento",
        desc: "Cada organização usa a própria conta HubSpot. Tokens renovam automaticamente e ficam criptografados.",
      },
    ],
    tip: "HubSpot não importa projetos nem inventário — use ClickUp para tarefas e listas como projetos.",
  },
  {
    id: "clickup",
    label: "ClickUp",
    accent: "#7B68EE",
    tagline: "MCP CRM — importe atividades e projetos (listas/spaces)",
    steps: [
      {
        title: "Conecte com OAuth",
        desc: 'Integrações → ClickUp → "Conectar conta ClickUp". Team ID e permissões são detectados na autorização.',
      },
      {
        title: "O que importa",
        desc: "Tarefas viram Atividades; listas dentro de folders/spaces viram Projetos no VBSolution.",
      },
      {
        title: "Como importar",
        desc: 'Em Atividades ou Projetos, clique em Importar. Itens excluídos no VBSolution não voltam na reimportação.',
      },
      {
        title: "Complemento",
        desc: "ClickUp não tem leads nem contatos CRM — combine com HubSpot ou Pipedrive para pipeline comercial.",
      },
    ],
    tip: "Ideal para equipes que operam entrega e tarefas no workspace ClickUp.",
  },
  {
    id: "pipedrive",
    label: "Pipedrive",
    accent: "#017737",
    tagline: "MCP CRM — importe leads, contatos, atividades, projetos e agenda",
    steps: [
      {
        title: "Criar app no Marketplace",
        desc: 'Acesse developers.pipedrive.com → Marketplace → Create an app → OAuth. Anote Client ID e Client Secret.',
      },
      {
        title: "Callback OAuth",
        desc: "No Pipedrive Marketplace cadastre a callback do backend: https://vbsolutioncrmdeploy-production.up.railway.app/pipedrive/oauth/callback (só 1 URL permitida).",
      },
      {
        title: "Variáveis Railway",
        desc: "PIPEDRIVE_OAUTH_CLIENT_ID, PIPEDRIVE_OAUTH_CLIENT_SECRET, PIPEDRIVE_OAUTH_REDIRECT_URI (callback Railway), INTEGRATION_TOKEN_ENCRYPTION_SECRET e INTEGRATION_OAUTH_STATE_SECRET (mesmo valor do .env local).",
      },
      {
        title: "Conecte no CRM",
        desc: 'Integrações → Pipedrive → "Conectar conta Pipedrive". Popup OAuth autoriza a conta comercial da organização.',
      },
      {
        title: "O que importa",
        desc: "Deals, funis, contatos, atividades e projetos (add-on Projects) do Pipedrive para Leads, Empresas, Atividades e Projetos no VBSolution.",
      },
      {
        title: "Como importar",
        desc: 'Use Importar em cada módulo correspondente. A importação é imediata via API direta do Pipedrive.',
      },
    ],
    tip: "Teste em vbsolution.com.br (Integrações → Pipedrive). No Railway: PIPEDRIVE_OAUTH_* + INTEGRATION_OAUTH_STATE_SECRET + INTEGRATION_TOKEN_ENCRYPTION_SECRET + deploy do backend atualizado.",
  },
  {
    id: "notion",
    label: "Notion",
    accent: "#000000",
    tagline: "MCP — bases, páginas, atividades e wikis para o Brain e CRM",
    steps: [
      {
        title: "Conecte com OAuth",
        desc: 'Integrações → Notion → "Conectar conta Notion". Autorize o workspace e selecione páginas/bases compartilhadas.',
      },
      {
        title: "O que importa",
        desc: "Páginas, wikis e bases para conhecimento dos agentes IA; atividades/tarefas das bases Notion para o módulo Atividades.",
      },
      {
        title: "Somente importação",
        desc: "Notion → VBSolution. Use Importar em Atividades para tarefas das bases, ou em outros módulos para conhecimento. Complementa HubSpot, ClickUp ou Pipedrive.",
      },
      {
        title: "MCP no Brain",
        desc: "Com Notion conectado, agentes consultam documentação indexada e bases compartilhadas para enriquecer decisões em todos os módulos CRM.",
      },
    ],
    tip: "Notion é import-only. Credenciais OAuth: notion.so/my-integrations → integração pública → aba Configuration.",
  },
  {
    id: "supabase",
    label: "Supabase",
    accent: "#3ECF8E",
    tagline: "Brain.AI IDE Build · OAuth · Postgres",
    steps: [
      {
        title: "Conecte com OAuth",
        desc: 'Integrações → Supabase → "Conectar conta Supabase". Autorize os projetos da organização via Supabase Management API.',
      },
      {
        title: "Brain.AI IDE Build",
        desc: "Principal uso: Brain.AI → IDE Build → Conecte ao Supabase. Publique telas e código gerados pelo Brain no Postgres, auth e storage — sem copiar credenciais.",
      },
      {
        title: "Mirror CRM (opcional)",
        desc: "Além do IDE Build, permite mirror opcional do CRM na tabela vb_crm_mirror para consulta de dados operacionais.",
      },
      {
        title: "Após conectar",
        desc: "O sistema lista projetos autorizados e obtém API keys. Tokens criptografados e isolados por workspace.",
      },
    ],
    tip: "Configure OAuth Apps no Supabase Dashboard com o callback do backend Railway.",
  },
  {
    id: "brain-ide",
    label: "Brain · IDE",
    accent: "#8B5CF6",
    tagline: "Projeto de código — editor, preview e pasta local",
    steps: [
      {
        title: "Abrir o painel",
        desc: "Brain.AI → ícone </> (Projeto de código) no topo do chat, ao lado de Nova conversa e biblioteca de anexos.",
      },
      {
        title: "Abrir pasta ou novo projeto",
        desc: "Use Abrir pasta para importar arquivos do computador, ou Novo para resetar o sandbox. Arquivos ficam salvos no navegador (localStorage) por usuário.",
      },
      {
        title: "Codificar com o Brain",
        desc: "Peça telas ou sistemas no chat: arquivos aparecem como chips na conversa (tempo real). Clique para ver o código; use \"Abrir no IDE Build\" para editar. O painel não abre sozinho.",
      },
      {
        title: "Editor e preview",
        desc: "Abas Editor e Preview: edite arquivos na árvore à esquerda; o iframe mostra o resultado em tempo real (HTML/CSS/JS injetados no preview).",
      },
      {
        title: "Exportar PDF",
        desc: "PDF (navegador) usa a impressão do sistema — funciona em Chrome, Edge, Firefox e Safari sem depender do servidor.",
      },
      {
        title: "Supabase no IDE Build",
        desc: "Com Supabase conectado em Integrações, use Conecte ao Supabase no IDE Build para publicar o sandbox direto no Postgres, auth e storage da organização.",
      },
      {
        title: "Figma + código",
        desc: "Combine MCP Figma (design) com IDE Build (implementação): protótipo visual no chat, depois peça para gerar o código no sandbox.",
      },
    ],
    tip: "O IDE Build não substitui o repositório da sua equipe — é um sandbox rápido dentro do Brain para protótipos e MVPs.",
  },
  {
    id: "coming-soon",
    label: "Em breve",
    accent: "#6b7280",
    comingSoon: true,
    tagline: "Cards ainda não liberados para configuração",
    steps: [
      {
        title: "LinkedIn",
        desc: "Messaging API do LinkedIn para DMs e contexto no Brain — card cinza com tag Em breve.",
      },
    ],
    tip: "HubSpot, ClickUp, Pipedrive, Notion, Supabase, GitHub, Figma, Google Workspace e os provedores de IA (Open IA, Claude, Gemini) já estão disponíveis para configurar.",
  },
];

/** Wizard WhatsApp (modal dentro do assistente) — mantido para ConnectionWizardSteps */
export const CONNECTION_QUICK_STEPS = [
  {
    color: "#25D366",
    title: "Filas",
    desc: "Crie filas em Filas & Chatbot antes de conectar.",
  },
  {
    color: "#25D366",
    title: "Dados básicos",
    desc: "Nome, grupos e histórico (Web) ou IDs Meta (API Oficial).",
  },
  {
    color: "#1877F2",
    title: "Conectar",
    desc: "QR no celular (Web) ou webhook + token na Meta (API).",
  },
  {
    color: "#5856d6",
    title: "Filas e IA",
    desc: "Vincule filas; opcional: agente IA e mensagens automáticas.",
  },
];

export const CONNECTIONS_WIZARD_HELP = {
  intro:
    "O assistente em etapas abre ao criar ou editar uma conexão WhatsApp. Os demais canais usam formulários dedicados em Administrar → Nova conexão.",
  sections: [
    {
      title: "Etapa 1 — Básico",
      bullets: [
        "Nome interno da conexão",
        "Web: grupos, importar histórico, tutorial QR",
        "API: Phone Number ID, WABA ID, Business ID, token permanente",
      ],
    },
    {
      title: "Etapa 2 — Filas e agente IA",
      bullets: [
        "Selecione filas atendidas por este número",
        "Agente IA opcional para respostas automáticas",
      ],
    },
    {
      title: "Etapas 3 a 5 — Mensagens (opcional)",
      bullets: [
        "Boas-vindas, despedida e pesquisa NPS",
        "Pode pular e configurar depois",
      ],
    },
  ],
};
