/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import TelegramIcon from "@mui/icons-material/Telegram";
import Textsms from "@material-ui/icons/Textsms";
import VpnKey from "@material-ui/icons/VpnKey";
import LinkIcon from "@material-ui/icons/Link";
import CheckCircleOutline from "@material-ui/icons/CheckCircleOutline";
import AccountCircle from "@material-ui/icons/AccountCircle";
import PhoneAndroid from "@material-ui/icons/PhoneAndroid";
import WhatsApp from "@material-ui/icons/WhatsApp";
import CropFree from "@material-ui/icons/CropFree";
import Settings from "@material-ui/icons/Settings";
import Queue from "@material-ui/icons/Queue";

export const TELEGRAM_CONNECTION_STEPS = [
  {
    title: "Criar o bot no BotFather",
    desc: "No Telegram, abra o BotFather e use /newbot. Escolha um nome e um @username único para o bot da sua empresa.",
    icon: TelegramIcon,
    color: "#0088cc",
    links: [
      { label: "Abrir @BotFather", href: "https://t.me/BotFather" },
      {
        label: "Documentação oficial",
        href: "https://core.telegram.org/bots#6-botfather",
      },
    ],
  },
  {
    title: "Copiar o Bot Token",
    desc: "O BotFather envia um token no formato 123456789:AA.... Copie e guarde em local seguro — ele é a senha da API do seu bot.",
    icon: VpnKey,
    color: "#0088cc",
    links: [
      {
        label: "Bot API — autenticação",
        href: "https://core.telegram.org/bots/api#authorizing-your-bot",
      },
    ],
  },
  {
    title: "Vincular sua conta pessoal",
    desc: "Abra o seu bot no Telegram e envie /start. Sem isso o bot não pode enviar mensagens para você. Anote o Chat ID da sua conta.",
    icon: AccountCircle,
    color: "#0088cc",
    links: [
      { label: "Descobrir meu Chat ID", href: "https://t.me/userinfobot" },
      { label: "Abrir @userinfobot", href: "https://t.me/userinfobot" },
    ],
  },
  {
    title: "Preencher conta e token aqui",
    desc: "Cole o @ do bot, o Bot Token e o Chat ID da sua conta nos campos abaixo. O webhook será configurado automaticamente ao salvar.",
    icon: LinkIcon,
    color: "#0088cc",
    links: [
      {
        label: "setWebhook (referência)",
        href: "https://core.telegram.org/bots/api#setwebhook",
      },
    ],
  },
  {
    title: "Testar e salvar",
    desc: "Clique em Testar conexão para validar o token e enviar uma mensagem de teste. Depois Salvar — toda a organização poderá usar esta conexão.",
    icon: CheckCircleOutline,
    color: "#2e7d32",
    links: [],
  },
];

export const TELEGRAM_OFICIAL_CONNECTION_STEPS = [
  {
    title: "Criar app em my.telegram.org",
    desc: "Acesse my.telegram.org/apps com o mesmo número que usará na conexão. Anote api_id e api_hash — são obrigatórios para MTProto (conta real).",
    icon: TelegramIcon,
    color: "#0088cc",
    links: [
      { label: "my.telegram.org/apps", href: "https://my.telegram.org/apps" },
      {
        label: "Documentação MTProto",
        href: "https://core.telegram.org/api",
      },
    ],
  },
  {
    title: "Informar número e credenciais",
    desc: "Preencha api_id, api_hash e o telefone com DDI (ex.: +5511999999999). Salve a conexão antes de solicitar o código.",
    icon: PhoneAndroid,
    color: "#0088cc",
    links: [],
  },
  {
    title: "Confirmar login (SMS / app)",
    desc: "Clique em Enviar código. O Telegram envia o código por SMS ou notificação no app oficial. Cole o código e, se tiver 2FA, a senha.",
    icon: VpnKey,
    color: "#0088cc",
    links: [],
  },
  {
    title: "Sessão ativa (userbot)",
    desc: "Após conectar, mensagens recebidas pela conta real viram tickets — incluindo chats privados que a conta enxerga, conforme limites do Telegram.",
    icon: CheckCircleOutline,
    color: "#2e7d32",
    links: [
      {
        label: "GramJS (Node)",
        href: "https://gram.js.org/",
      },
    ],
  },
];

export const getSmsConnectionSteps = (provider = "vonage") => {
  const isTwilio = provider === "twilio";

  if (isTwilio) {
    return [
      {
        title: "Criar conta Twilio",
        desc: "Cadastre-se na Twilio e verifique seu número. Você precisará de um número SMS habilitado para enviar mensagens.",
        icon: Textsms,
        color: "#1976d2",
        links: [
          { label: "Console Twilio", href: "https://console.twilio.com/" },
          { label: "Comprar número SMS", href: "https://console.twilio.com/us1/develop/phone-numbers/manage/search" },
        ],
      },
      {
        title: "Obter Account SID e Auth Token",
        desc: "No dashboard Twilio, copie o Account SID e o Auth Token (ou gere um novo token em API keys).",
        icon: VpnKey,
        color: "#1976d2",
        links: [
          { label: "Account Info", href: "https://console.twilio.com/" },
          { label: "API Keys", href: "https://console.twilio.com/us1/account/keys-credentials/api-keys" },
        ],
      },
      {
        title: "Configurar número remetente (From)",
        desc: "Use o número Twilio em formato E.164 (ex.: +5511999999999). Esse será o remetente das mensagens e campanhas.",
        icon: PhoneAndroid,
        color: "#1976d2",
        links: [
          {
            label: "Números ativos",
            href: "https://console.twilio.com/us1/develop/phone-numbers/manage/incoming",
          },
        ],
      },
      {
        title: "Webhook inbound (opcional)",
        desc: "Após salvar, copie a URL do webhook exibida e configure no Twilio em Messaging → seu número → A MESSAGE COMES IN.",
        icon: LinkIcon,
        color: "#1976d2",
        links: [
          {
            label: "Docs webhook Twilio",
            href: "https://www.twilio.com/docs/messaging/guides/webhook-request",
          },
        ],
      },
      {
        title: "Testar e salvar",
        desc: "Preencha os campos abaixo, teste a conexão e salve. A conexão fica disponível para toda a empresa.",
        icon: CheckCircleOutline,
        color: "#2e7d32",
        links: [],
      },
    ];
  }

  return [
    {
      title: "Criar conta Vonage",
      desc: "Acesse o dashboard Vonage e crie um projeto de API. Ative SMS no projeto para enviar e receber mensagens.",
      icon: Textsms,
      color: "#1976d2",
      links: [
        { label: "Dashboard Vonage", href: "https://dashboard.nexmo.com/" },
        { label: "Criar API Key", href: "https://dashboard.nexmo.com/getting-started-guide" },
      ],
    },
    {
      title: "Obter API Key e API Secret",
      desc: "Em Settings → API credentials, copie a API Key e a API Secret. Mantenha a secret em local seguro.",
      icon: VpnKey,
      color: "#1976d2",
      links: [
        {
          label: "API credentials",
          href: "https://dashboard.nexmo.com/settings",
        },
        {
          label: "SDK Node (referência)",
          href: "https://github.com/Vonage/vonage-node-sdk",
        },
      ],
    },
    {
      title: "Configurar remetente (From)",
      desc: "Use um número Vonage comprado (+E.164) ou um sender alfanumérico (até 11 letras, ex.: VBSolution).",
      icon: PhoneAndroid,
      color: "#1976d2",
      links: [
        {
          label: "Comprar número",
          href: "https://dashboard.nexmo.com/buy-numbers",
        },
        {
          label: "Alphanumeric sender",
          href: "https://developer.vonage.com/messaging/sms/guides/custom-sender-id",
        },
      ],
    },
    {
      title: "Webhook inbound SMS",
      desc: "Após salvar, copie a URL do webhook e configure no painel Vonage (ou deixe o sistema registrar quando aplicável).",
      icon: LinkIcon,
      color: "#1976d2",
      links: [
        {
          label: "Inbound SMS Vonage",
          href: "https://developer.vonage.com/messaging/sms/guides/inbound-sms",
        },
      ],
    },
    {
      title: "Testar e salvar",
      desc: "Preencha os campos, valide com Testar conexão e salve. Toda a organização poderá usar esta conexão SMS.",
      icon: CheckCircleOutline,
      color: "#2e7d32",
      links: [],
    },
  ];
};

export const WHATSAPP_WEB_CONNECTION_STEPS = [
  {
    title: "Nome e cor da conexão",
    desc: "Defina um nome interno e a cor que identifica esta linha nos tickets e filas.",
    icon: Settings,
    color: "#25D366",
    links: [],
  },
  {
    title: "Escanear QR Code",
    desc: "No celular, abra WhatsApp → Aparelhos conectados → Conectar aparelho e leia o QR exibido na tela.",
    icon: CropFree,
    color: "#25D366",
    links: [
      {
        label: "Ajuda WhatsApp Web",
        href: "https://faq.whatsapp.com/1317564962315842",
      },
    ],
  },
  {
    title: "Filas e agente IA",
    desc: "Escolha as filas de atendimento e, se quiser, vincule um prompt de IA à conexão.",
    icon: Queue,
    color: "#25D366",
    links: [],
  },
  {
    title: "Mensagens e fluxos",
    desc: "Configure saudação, fora do horário, NPS e fluxos automáticos nos passos seguintes.",
    icon: WhatsApp,
    color: "#128C7E",
    links: [],
  },
  {
    title: "Salvar e conectar",
    desc: "Conclua o assistente e salve. A sessão ficará ativa como WhatsApp Web.",
    icon: CheckCircleOutline,
    color: "#2e7d32",
    links: [],
  },
];

export const WHATSAPP_OFICIAL_CONNECTION_STEPS = [
  {
    title: "Conectar com WhatsApp Business",
    desc: "Use o botão azul na página de conexões (Embedded Signup Meta). Escolha coexistência para manter o app no celular e receber mensagens no CRM.",
    icon: WhatsApp,
    color: "#25D366",
    links: [
      {
        label: "Meta Embedded Signup",
        href: "https://developers.facebook.com/docs/whatsapp/embedded-signup/",
      },
    ],
  },
  {
    title: "Conta Meta Business",
    desc: "Tenha um app na Meta com WhatsApp Cloud API, número verificado e token de acesso.",
    icon: WhatsApp,
    color: "#25D366",
    links: [
      {
        label: "Meta for Developers",
        href: "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started",
      },
    ],
  },
  {
    title: "IDs e token",
    desc: "Informe phone_number_id, WABA ID e token permanente gerados no painel Meta.",
    icon: VpnKey,
    color: "#25D366",
    links: [],
  },
  {
    title: "Webhook",
    desc: "Copie a URL de webhook exibida após salvar e registre no app Meta para receber mensagens.",
    icon: LinkIcon,
    color: "#25D366",
    links: [],
  },
  {
    title: "Filas e templates",
    desc: "Associe filas de atendimento e sincronize templates aprovados pela Meta (ícone sync na conexão ou aba Templates Meta em Campanhas).",
    icon: Queue,
    color: "#128C7E",
    links: [],
  },
  {
    title: "Quality rating e limite",
    desc: "Após salvar ou Reparar conexão, confira os chips Qualidade (GREEN/YELLOW/RED) e Limite de mensagens na lista. Atualize com Sincronizar templates ou Reparar.",
    icon: CheckCircleOutline,
    color: "#128C7E",
    links: [],
  },
  {
    title: "Usar no atendimento",
    desc: "No ticket: chip Janela 24h no cabeçalho; menu + para Templates, Botões/Enquete (lista), mídia e texto (dentro da 24h).",
    icon: WhatsApp,
    color: "#25D366",
    links: [],
  },
  {
    title: "Campanhas com template",
    desc: "Campanhas → conexão API Oficial → selecione template aprovado. Disparo em massa só com template Meta.",
    icon: WhatsApp,
    color: "#25D366",
    links: [],
  },
  {
    title: "Ativar conexão",
    desc: "Salve e valide o status conectado. A API oficial passa a receber e enviar mensagens.",
    icon: CheckCircleOutline,
    color: "#2e7d32",
    links: [],
  },
];

const FACEBOOK_GUIDE_STEPS = [
  {
    title: "Página Meta vinculada",
    desc: "Use uma página Facebook da empresa com permissões de Messenger ativas.",
    icon: LinkIcon,
    color: "#1877F2",
    links: [{ label: "Meta Business", href: "https://business.facebook.com/" }],
  },
  {
    title: "Login Meta",
    desc: "Clique em Conectar e autorize o app com as permissões de mensagens da página.",
    icon: CheckCircleOutline,
    color: "#1877F2",
    links: [],
  },
];

const INSTAGRAM_GUIDE_STEPS = [
  {
    title: "Conta Business",
    desc: "O Instagram precisa ser Business/Creator vinculado à página Facebook.",
    icon: LinkIcon,
    color: "#E4405F",
    links: [],
  },
  {
    title: "Autorizar Direct",
    desc: "Conecte via Meta para receber DMs e comentários como tickets.",
    icon: CheckCircleOutline,
    color: "#E4405F",
    links: [],
  },
];

const EMAIL_CONNECTION_STEPS = [
  {
    title: "Servidor SMTP",
    desc: "Informe host, porta e tipo de segurança (TLS/SSL) do provedor — Gmail, Outlook ou servidor próprio.",
    icon: LinkIcon,
    color: "#EA4335",
    links: [
      { label: "Gmail — senha de app", href: "https://support.google.com/accounts/answer/185833" },
    ],
  },
  {
    title: "Credenciais",
    desc: "Use o e-mail completo como usuário e senha de app (Gmail) ou senha do provedor.",
    icon: VpnKey,
    color: "#0078D4",
    links: [],
  },
  {
    title: "Testar e salvar",
    desc: "Teste a conexão antes de salvar. Após configurado, o envio de campanhas usa este SMTP.",
    icon: CheckCircleOutline,
    color: "#2e7d32",
    links: [],
  },
];

const OPENAI_CONNECTION_STEPS = [
  {
    title: "API Key OpenAI",
    desc: "Gere uma chave em platform.openai.com e cole no campo API Key. Mantenha em local seguro.",
    icon: VpnKey,
    color: "#10a37f",
    links: [
      { label: "OpenAI API keys", href: "https://platform.openai.com/api-keys" },
    ],
  },
  {
    title: "Modelo e escopo",
    desc: "Escolha o modelo (ex.: gpt-4o-mini) e o escopo Pessoal, Equipe ou Global para os agentes.",
    icon: Settings,
    color: "#10a37f",
    links: [],
  },
  {
    title: "Salvar integração",
    desc: "Salve para ativar agentes de IA, Brain.AI e automações que usam a OpenAI na plataforma.",
    icon: CheckCircleOutline,
    color: "#2e7d32",
    links: [],
  },
];

const CLAUDE_CONNECTION_STEPS = [
  {
    title: "API Key Anthropic",
    desc: "Gere sk-ant-... em console.anthropic.com → Settings → API Keys. Copie na hora — só aparece uma vez.",
    icon: VpnKey,
    color: "#D97757",
    links: [
      { label: "Anthropic API Keys", href: "https://console.anthropic.com/settings/keys" },
    ],
  },
  {
    title: "Créditos na conta",
    desc: "Contas novas precisam de saldo em Plans & Billing. Sem créditos, as chamadas falham mesmo com chave válida.",
    icon: Settings,
    color: "#D97757",
    links: [
      { label: "Billing Anthropic", href: "https://console.anthropic.com/settings/billing" },
    ],
  },
  {
    title: "Salvar integração",
    desc: "Ative Claude, defina escopo e salve. Modelo por agente fica em Agente IA → aba Integração.",
    icon: CheckCircleOutline,
    color: "#2e7d32",
    links: [],
  },
];

const GEMINI_CONNECTION_STEPS = [
  {
    title: "API Key Google AI Studio",
    desc: "Gere em aistudio.google.com → API Keys. Cole na integração Gemini em Integrações.",
    icon: VpnKey,
    color: "#4285F4",
    links: [
      { label: "Google AI Studio — API Keys", href: "https://aistudio.google.com/apikey" },
    ],
  },
  {
    title: "Modelo padrão e escopo",
    desc: "Escolha Flash, Pro ou modelo de imagem. O modelo por agente pode ser refinado em Agente IA.",
    icon: Settings,
    color: "#4285F4",
    links: [],
  },
  {
    title: "Salvar e testar",
    desc: "Salve a integração e use Testar conexão na aba Integração antes de publicar agentes Gemini.",
    icon: CheckCircleOutline,
    color: "#2e7d32",
    links: [],
  },
];

const GROK_CONNECTION_STEPS = [
  {
    title: "O que o Grok faz",
    desc: "A integração xAI Grok alimenta Agentes de IA no atendimento (WhatsApp, Telegram etc.) e modelos no Brain.AI. Use a mesma API Key da organização para ambos quando a plataforma não tiver chave Grok própria.",
    icon: CheckCircleOutline,
    color: "#1C1C1C",
    links: [],
  },
  {
    title: "Conta xAI",
    desc: "Crie ou acesse sua conta em console.x.ai e confirme créditos/billing ativo.",
    icon: VpnKey,
    color: "#1C1C1C",
    links: [{ label: "xAI Console", href: "https://console.x.ai/" }],
  },
  {
    title: "API Key Grok",
    desc: "Gere uma API Key (geralmente começa com xai-), cole em Integrações → Grok → Administrar, ative \"Grok ativo\" e salve.",
    icon: Settings,
    color: "#1C1C1C",
    links: [],
  },
  {
    title: "Agente IA nos tickets",
    desc: "Em Agente IA, escolha um modelo Grok (ex.: Grok 4.1 Fast) na aba Integração, salve o agente e vincule-o à conexão do canal. O agente responde tickets via API xAI.",
    icon: Queue,
    color: "#1C1C1C",
    links: [],
  },
  {
    title: "Brain.AI",
    desc: "No Brain.AI, abra o seletor de modelos → Grok (xAI) → escolha o modelo. O consumo usa créditos Brain.",
    icon: CheckCircleOutline,
    color: "#2e7d32",
    links: [],
  },
];

const GOOGLE_WORKSPACE_CONNECTION_STEPS = [
  {
    title: "Projeto Google Cloud",
    desc: "Crie um projeto e credenciais OAuth 2.0 (tipo Aplicativo da Web) no Google Cloud Console.",
    icon: VpnKey,
    color: "#4285F4",
    links: [
      {
        label: "Google Cloud Console",
        href: "https://console.cloud.google.com/apis/credentials",
      },
    ],
  },
  {
    title: "Conectar conta",
    desc: "Clique em Conectar com Google e autorize a conta logada no navegador (popup OAuth).",
    icon: Settings,
    color: "#4285F4",
    links: [],
  },
  {
    title: "MCP e Brain",
    desc: "Com a conta vinculada, ative o MCP no Brain para Drive, Sheets ou eventos do Calendário.",
    icon: CheckCircleOutline,
    color: "#2e7d32",
    links: [],
  },
];

const LINKEDIN_CONNECTION_STEPS = [
  {
    title: "App LinkedIn Developer",
    desc: "Crie um app em linkedin.com/developers, adicione produtos de Messaging e anote Client ID e Client Secret.",
    icon: VpnKey,
    color: "#0A66C2",
    links: [
      { label: "LinkedIn Developer Apps", href: "https://www.linkedin.com/developers/apps" },
    ],
  },
  {
    title: "OAuth e Access Token",
    desc: "Gere um token com escopos de mensagens (w_member_social, r_messages, w_messages conforme o produto). Cole o Access Token e o URN do remetente.",
    icon: Settings,
    color: "#0A66C2",
    links: [],
  },
  {
    title: "Webhook e agente IA",
    desc: "Salve, copie a URL do webhook para o app LinkedIn e vincule um Prompt para o agente responder DMs automaticamente.",
    icon: CheckCircleOutline,
    color: "#2e7d32",
    links: [],
  },
];

/** Passo a passo lateral (motion) por integração. */
export function getConnectionGuideSteps(integrationKey, options = {}) {
  switch (integrationKey) {
    case "whatsapp-web":
      return WHATSAPP_WEB_CONNECTION_STEPS;
    case "whatsapp-oficial":
      return WHATSAPP_OFICIAL_CONNECTION_STEPS;
    case "linkedin-messaging":
      return LINKEDIN_CONNECTION_STEPS;
    case "google-drive":
    case "google-sheets":
    case "google-calendar":
      return GOOGLE_WORKSPACE_CONNECTION_STEPS;
    case "telegram-bot":
      return TELEGRAM_CONNECTION_STEPS;
    case "telegram-oficial":
      return TELEGRAM_OFICIAL_CONNECTION_STEPS;
    case "sms":
      return getSmsConnectionSteps(options.provider || "vonage");
    case "facebook":
      return FACEBOOK_GUIDE_STEPS;
    case "instagram":
      return INSTAGRAM_GUIDE_STEPS;
    case "email":
      return EMAIL_CONNECTION_STEPS;
    case "openai":
      return OPENAI_CONNECTION_STEPS;
    case "claude":
      return CLAUDE_CONNECTION_STEPS;
    case "gemini":
      return GEMINI_CONNECTION_STEPS;
    case "grok":
      return GROK_CONNECTION_STEPS;
    default:
      return [];
  }
}
