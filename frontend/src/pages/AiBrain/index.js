/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useRef, useEffect, useContext, useCallback } from "react";
import ReactDOM from "react-dom";
import b from "./brainClassNames";
import { useIsDarkMode, useMediaQuery } from "../../hooks/useMediaQueryBrain";
import { TooltipProvider } from "../../components/ui/tooltip";
import BrainTooltip from "../../components/BrainTooltip";
import { Sheet, SheetContent } from "../../components/ui/sheet";
import { Badge } from "../../components/ui/badge";
import { Spinner } from "../../components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Send,
  Plus,
  Globe,
  Mic,
  ChevronDown,
  ListTodo,
  Trash2,
  Pencil,
  Check,
  X,
  Zap,
  Users,
  BarChart3,
  Target,
  FileText,
  PanelLeftClose,
  Download,
  FileSpreadsheet,
  FileJson,
  File,
  Presentation,
  Image,
  BookOpen,
  Package,
  MessageSquare,
  Megaphone,
  Mail,
  Tag,
  Palette,
  Sliders,
  Pause,
  Play,
  AudioLines,
  Code2,
  FolderKanban,
  Link2,
  Search,
  Github,
  GraduationCap,
} from "lucide-react";
import { AuthContext } from "../../context/Auth/AuthContext";
import api from "../../services/api";
import useBrainVoiceComposer from "../../hooks/useBrainVoiceComposer";
import useBrainVoiceMode from "../../hooks/useBrainVoiceMode";
import BrainVoicePanel from "../../components/BrainVoicePanel";
import BrainVoiceGenderDialog from "../../components/BrainVoiceGenderDialog";
import BrainVoiceIntroDialog from "../../components/BrainVoiceIntroDialog";
import { GEMINI_BRAIN_MODELS } from "../../providers/gemini/geminiModelCatalog";
import { GROK_BRAIN_MODELS } from "../../providers/grok/grokModelCatalog";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import BrainCodeStudio from "../../components/BrainCodeStudio";
import BrainIdeChatPanel from "../../components/BrainIdeChatPanel";
import BrainIdeComposer from "../../components/BrainIdeComposer";
import BrainLiveCodePanel, {
  buildBrainCodeSnapshot,
  sanitizeBrainAssistantContent
} from "../../components/BrainLiveCodePanel";
import useBrainLiveCode from "../../hooks/useBrainLiveCode";
import { toIdeBuildPayload } from "../../utils/brainGeneratedFileToIde";
import BrainProjectPicker from "../../components/BrainProjectPicker";
import useBrainActiveProject from "../../hooks/useBrainActiveProject";
import { marked } from "marked";
import logoBrainAi from "../../assets/logo_brain_ai.png";
import PageHelpButton from "../../components/PageHelpButton";
import ComposerAiAssist from "../../components/ComposerAiAssist";
import BrainComposerPlusMenu from "../../components/BrainComposerPlusMenu";
import {
  downloadBrainDriveFile,
  driveFileToBrowserFile,
  learnBrainFromUrl,
} from "../../services/brainComposerService";
import BrainMcpCatalogPage from "../../components/BrainMcpCatalogPage";
import BrainConversationsPage from "../../components/BrainConversationsPage";
import BrainProjectsPage from "../../components/BrainProjectsPage";
import BrainPersonalizeHub, {
  BRAIN_PERSONALIZE_SECTIONS,
} from "../../components/BrainPersonalizeHub";
import BrainOrgMenu from "../../components/BrainOrgMenu";
import BrainIdeHome from "../../components/BrainIdeHome";
import BrainCreditsAlert from "../../components/BrainCreditsAlert";
import BrainPlansPage from "../../components/BrainPlansPage";
import useBrainCredits from "../../hooks/useBrainCredits";
import BrainMcpDialog from "../../components/BrainMcpDialog";
import BrainMcpIcon from "../../components/BrainMcpDialog/BrainMcpIcon";
import useBrainMcpSelection from "../../hooks/useBrainMcpSelection";
import useBrainPersonalization from "../../hooks/useBrainPersonalization";
import { getBrainMcpById } from "../../config/brainMcpCatalog";
import useAppTranslation from "../../hooks/useAppTranslation";
import useScheduleTranslateWhen from "../../hooks/useScheduleTranslateWhen";
import { LobeClaudeIcon, LobeGeminiIcon, LobeGrokIcon, LobeOpenAIIcon } from "../../components/LobeBrandIcon";
import { GoogleDriveBrandIcon } from "../../components/BrainMcpDialog/BrainMcpBrandIcons";
import {
  buildBrainPathname,
  isIdeConversation,
  markIdeConversation,
  pickLatestIdeConversationId,
  readBrainUrlState,
  readBrainViewFromUrl,
  readIdeLastConversation,
} from "./brainUrlState";

const AI_MODELS = [
  {
    id: "auto",
    name: "Auto",
    provider: "smart",
    active: true,
    description: "Escolhe o agente mais adequado conforme a complexidade do pedido",
  },
  {
    id: "flash",
    name: "Flash",
    provider: "smart",
    active: true,
    description: "Agentes rápidos para pedidos simples e respostas ágeis",
  },
  { id: "gpt-5.5", name: "GPT-5.5", provider: "openai", active: true, description: "Modelo mais avançado" },
  { id: "gpt-5.5-mini", name: "GPT-5.5 Mini", provider: "openai", active: true, description: "Rápido e poderoso" },
  { id: "gpt-4o", name: "GPT-4o", provider: "openai", active: true, description: "Multimodal inteligente" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", active: true, description: "Rápido e econômico" },
  { id: "o3", name: "O3", provider: "openai", active: true, description: "Raciocínio avançado" },
  { id: "o3-mini", name: "O3 Mini", provider: "openai", active: true, description: "Raciocínio rápido" },
  { id: "o1", name: "O1", provider: "openai", active: true, description: "Raciocínio profundo" },
  { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5", provider: "anthropic", active: true, description: "Recomendado" },
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", provider: "anthropic", active: true, description: "Mais recente" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", provider: "anthropic", active: true, description: "Rápido e econômico" },
  { id: "claude-opus-4-6", name: "Claude Opus 4.6", provider: "anthropic", active: true, description: "Qualidade máxima" },
  { id: "claude-fable-5", name: "Claude Fable 5", provider: "anthropic", active: true, description: "Frontier — 1M contexto" },
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", provider: "anthropic", active: true, description: "Anthropic estável" },
  { id: "claude-3-7-sonnet-latest", name: "Claude 3.7 Sonnet", provider: "anthropic", active: true, description: "Legado (mapeado automaticamente)" },
  ...GEMINI_BRAIN_MODELS,
  ...GROK_BRAIN_MODELS,
];

const BRAIN_PROVIDER_LABELS = {
  smart: "VBSolution",
  openai: "OpenAI",
  anthropic: "Anthropic Claude",
  gemini: "Google Gemini",
  grok: "Grok (xAI)",
};

function brainPlatformKeyIssue(platformKeys, provider) {
  if (!platformKeys) return null;
  // Auto/Flash escolhem internamente entre provedores com chave disponível.
  if (provider === "smart") {
    const anyConfigured =
      platformKeys.openai?.configured ||
      platformKeys.anthropic?.configured ||
      platformKeys.gemini?.configured ||
      platformKeys.grok?.configured;
    return anyConfigured ? null : "missing_platform_key";
  }
  // Grok no Brain aceita chave da organização (Conexões → Grok) além da chave da plataforma.
  if (provider === "grok") return null;
  if (platformKeys[provider]?.configured) return null;
  return "missing_platform_key";
}

function brainPlatformKeyUserMessage(issue, provider) {
  const label =
    provider === "smart"
      ? "Auto/Flash"
      : BRAIN_PROVIDER_LABELS[provider] || provider;
  switch (issue) {
    case "missing_platform_key":
      return (
        `O **Brain.AI** utiliza infraestrutura interna da VBSolution para modelos ${label}. ` +
        "Não é necessário cadastrar API Key em Integrações para conversar aqui — o consumo é debitado dos seus **créditos Brain** (Stripe). " +
        "No momento, a chave da plataforma não está disponível no servidor. Entre em contato com o suporte da VBSolution."
      );
    default:
      return `Não foi possível validar o provedor ${label} no Brain.AI. Tente novamente ou contate o suporte.`;
  }
}

const QUICK_ACTIONS = [
  { icon: Target, title: "Criar lead de venda", prompt: "Quero criar um novo lead de venda. Me pergunte as informações necessárias como nome, produto, origem e prioridade." },
  { icon: Megaphone, title: "Criar campanha", prompt: "Quero criar uma campanha de disparo de mensagens em massa. Me guie passo a passo: qual conexão usar, quais contatos/tag, a mensagem, e quando agendar." },
  { icon: MessageSquare, title: "Enviar Template Meta", prompt: "Quero enviar um Template Meta (WhatsApp API Oficial) via campanha. Oriente: conexão oficial, templates sincronizados APPROVED, destinatários e agendamento ou envio imediato." },
  { icon: Mail, title: "Enviar mensagem", prompt: "Quero enviar uma mensagem. Me pergunte: (1) se é para um ticket em aberto ou um contato, (2) qual conexão/integração usar (WhatsApp, API Oficial, Facebook, Instagram), (3) o destinatário e o texto da mensagem." },
  { icon: Package, title: "Criar produto", prompt: "Quero cadastrar um novo produto no inventário. Me pergunte nome, preço, quantidade e categoria." },
  { icon: MessageSquare, title: "Resposta rápida", prompt: "Quero criar uma nova resposta rápida para usar nos atendimentos. Me pergunte o atalho e o texto da mensagem." },
  { icon: ListTodo, title: "Criar atividade", prompt: "Crie uma nova atividade para hoje com o título 'Follow-up com cliente' do tipo follow_up" },
  { icon: Users, title: "Novo contato", prompt: "Quero criar um novo contato no CRM. Me pergunte os dados necessários." },
  { icon: BarChart3, title: "Análise de dados", prompt: "Me dê uma análise completa dos dados do meu dashboard dos últimos 30 dias com insights e recomendações." },
  { icon: Target, title: "Resumo geral", prompt: "Me dê um resumo completo do meu CRM: total de contatos, tickets abertos, atividades pendentes, leads, oportunidades de venda e projetos." },
  { icon: FileText, title: "Gerar relatório", prompt: "Gere um relatório em PDF com os dados do dashboard dos últimos 30 dias." },
  { icon: Palette, title: "Identidade visual", prompt: "Quero alterar as cores da identidade visual do sistema. Me mostre as opções de cores disponíveis." },
  { icon: Sliders, title: "Configurações", prompt: "Me mostre o estado atual das configurações do sistema." },
  {
    icon: Link2,
    title: "Traga dados de um CRM",
    prompt:
      "Quero puxar um dado de um CRM integrado ao VBSolution. Me pergunte qual CRM está conectado (Pipedrive, HubSpot, ClickUp, Notion) e qual tipo de dado desejo importar (lead, atividade, contato, projeto, etc.). Depois guie-me passo a passo para trazer esse dado para o módulo correto."
  },
];

function ModelProviderIcon({ provider, size = 16, modelId }) {
  if (provider === "smart" || modelId === "auto" || modelId === "flash") {
    return (
      <img
        src={logoBrainAi}
        alt=""
        width={size}
        height={size}
        style={{ objectFit: "contain", flexShrink: 0 }}
      />
    );
  }
  if (provider === "openai") return <LobeOpenAIIcon size={size} />;
  if (provider === "anthropic") return <LobeClaudeIcon size={size} />;
  if (provider === "gemini") return <LobeGeminiIcon size={size} />;
  if (provider === "grok") return <LobeGrokIcon size={size} />;
  return null;
}

const MODEL_PROVIDERS = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic Claude" },
  { id: "gemini", label: "Google Gemini" },
  { id: "grok", label: "Grok (xAI)" },
];

const BRAIN_SMART_MODELS = AI_MODELS.filter((m) => m.provider === "smart");

const ACCENT = "#57534e";
const ACCENT_LIGHT = "#78716c";
const ACCENT_BLUE = "#a8a29e";

const BrainFlower = ({ size = 42 }) => (
  <img
    src={logoBrainAi}
    alt=""
    width={size}
    height={size}
    style={{ objectFit: "contain" }}
  />
);

export { BrainFlower, AI_MODELS, ACCENT, ACCENT_LIGHT, ACCENT_BLUE };

function downloadDataUrl(dataUrl, fileName) {
  if (!dataUrl) return;
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName || "download";
  a.click();
}

function downloadGeneratedFile(file) {
  if (!file) return;
  const { type, title, content, columns, rows, slides, exports } = file;

  if (type === "prototype_package" && Array.isArray(exports) && exports.length) {
    exports.forEach((exp) => {
      if (exp.format === "png" || exp.format === "pdf") {
        downloadDataUrl(exp.content, exp.fileName);
      } else if (exp.format === "svg") {
        const blob = new Blob([exp.content || ""], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = exp.fileName || "tela.svg";
        a.click();
        URL.revokeObjectURL(url);
      }
    });
    const blob = new Blob([content || ""], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "prototipo"}.html`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  if (type === "json") {
    let jsonStr = content;
    try { jsonStr = JSON.stringify(JSON.parse(content), null, 2); } catch { /* ok */ }
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "arquivo"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } else if (type === "excel") {
    let csvContent = "";
    if (columns?.length > 0) csvContent += columns.join(",") + "\n";
    if (rows?.length > 0) {
      rows.forEach(row => {
        csvContent += row.map(cell => `"${String(cell || "").replace(/"/g, '""')}"`).join(",") + "\n";
      });
    } else if (content) { csvContent = content; }
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "arquivo"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } else if (type === "pdf") {
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(`<html><head><title>${title || "Documento"}</title><style>body{font-family:-apple-system,'Segoe UI',sans-serif;padding:40px;max-width:800px;margin:0 auto;color:#1f2937}h1{font-size:20px;font-weight:600;margin-bottom:18px}p{line-height:1.7;margin-bottom:8px}table{width:100%;border-collapse:collapse;margin:14px 0}th,td{padding:6px 10px;border:1px solid #e5e7eb;text-align:left}th{background:#f9fafb;font-weight:600}</style></head><body><h1>${title || "Documento"}</h1>${content ? content.replace(/\n/g, "<br/>") : ""}</body></html>`);
      w.document.close();
      setTimeout(() => w.print(), 500);
    }
  } else if (type === "presentation") {
    const slideList = slides || [];
    let slidesHtml = "";
    slideList.forEach((s, i) => {
      slidesHtml += `<div class="slide"><h2>Slide ${i + 1}: ${s.title || ""}</h2><div class="slide-content">${s.content || ""}</div></div>`;
    });
    if (!slidesHtml && content) slidesHtml = content;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(`<html><head><title>${title || "Apresentação"}</title><style>body{font-family:-apple-system,'Segoe UI',sans-serif;margin:0;padding:0;background:#1a1a2e;color:#fff}.slide{min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:60px;box-sizing:border-box;border-bottom:2px solid rgba(255,255,255,0.1)}h2{font-size:28px;margin-bottom:24px;color:#60a5fa}.slide-content{font-size:18px;line-height:1.8;max-width:800px;text-align:center}@media print{.slide{page-break-after:always;border:none}}</style></head><body>${slidesHtml}</body></html>`);
      w.document.close();
      setTimeout(() => w.print(), 500);
    }
  } else if (type === "image") {
    const svgContent = content || '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><text x="100" y="100" text-anchor="middle">Imagem</text></svg>';
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "imagem"}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  } else if (type === "png") {
    const src = content || "";
    const a = document.createElement("a");
    a.href = src.startsWith("data:") ? src : `data:image/png;base64,${src}`;
    a.download = `${title || "prototipo"}.png`;
    a.click();
  } else if (type === "prototype_html" || type === "prototype_package") {
    const blob = new Blob([content || ""], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "prototipo"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

function exportHtmlAsPdfInBrowser(htmlContent, title) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(htmlContent || "");
  w.document.close();
  w.document.title = title || "Protótipo";
  setTimeout(() => {
    try {
      w.focus();
      w.print();
    } catch {
      /* popup blocked or print unsupported */
    }
  }, 500);
}

function stripUserRawContent(content) {
  return String(content || "")
    .replace(/\n\n📎[\s\S]*$/, "")
    .trim();
}

function applyComposerToolPrefix(text, tool) {
  const t = String(text || "").trim();
  if (!t || !tool) return t;
  if (tool === "searchWeb") {
    return `Use busca na web para responder com fontes atualizadas: ${t}`;
  }
  if (tool === "searchDocs") {
    return `Busque nos documentos, anexos e base de conhecimento disponíveis para responder: ${t}`;
  }
  return t;
}

function applyComposerContextPrefix(text, contexts) {
  const t = String(text || "").trim();
  if (!t || !contexts?.length) return t;
  const parts = [];
  for (const ctx of contexts) {
    if (ctx.type === "github") {
      parts.push(`Use o repositório GitHub ${ctx.label} como contexto principal.`);
    }
    if (ctx.type === "learn") {
      parts.push(`Use o conteúdo aprendido da URL ${ctx.label} como contexto.`);
    }
  }
  if (!parts.length) return t;
  return `${parts.join(" ")}\n\n${t}`;
}

function makeAttachedItem(file, source, label) {
  return {
    id: `${source}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    file,
    source,
    label: label || file.name,
  };
}

function attachItemIcon(source) {
  if (source === "drive") return GoogleDriveBrandIcon;
  if (source === "learn") return GraduationCap;
  return FileText;
}

function composerToolDisplayPrefix(tool) {
  if (tool === "searchWeb") return "🌐 ";
  if (tool === "searchDocs") return "📄 ";
  return "";
}

function attachCodeSnapshotToLastAssistant(prev, snapshot) {
  if (!snapshot || !prev.length) return prev;
  const lastIdx = prev.length - 1;
  const last = prev[lastIdx];
  if (last?.role !== "assistant" || last.codeSnapshot) return prev;
  const updated = [...prev];
  updated[lastIdx] = { ...last, codeSnapshot: snapshot };
  return updated;
}

export default function AiBrain({ embedded = false, onClose, contextSuggestions, pageContext }) {
  const { ui } = useAppTranslation();
  const isDark = useIsDarkMode();
  const isMobile = useMediaQuery("(max-width: 600px)");
  const isXs = useMediaQuery("(max-width: 480px)");
  const shellClass = isDark ? "brain-shell brain-shell--dark" : "brain-shell";
  const { user, socket } = useContext(AuthContext);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [selectedModel, setSelectedModel] = useState("auto");
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [modelPickerPos, setModelPickerPos] = useState(null);
  const modelSelectorBtnRef = useRef(null);
  const [attachedItems, setAttachedItems] = useState([]);
  const [editingConvId, setEditingConvId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [hoveredConvId, setHoveredConvId] = useState(null);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("pt-BR");
  const [sidebarExpanded, setSidebarExpanded] = useState(!embedded && !isMobile);
  const [brainMainView, setBrainMainView] = useState(readBrainViewFromUrl);
  const [creditsRefreshKey, setCreditsRefreshKey] = useState(0);
  const [creditsAlertDismissed, setCreditsAlertDismissed] = useState(false);
  const brainCredits = useBrainCredits(creditsRefreshKey);
  const [generatedFile, setGeneratedFile] = useState(null);
  const [fileModalOpen, setFileModalOpen] = useState(false);
  const [codeStudioIncoming, setCodeStudioIncoming] = useState(null);
  const [conversationAttachments, setConversationAttachments] = useState([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [voicePanelOpen, setVoicePanelOpen] = useState(false);
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(false);
  const [voiceGenderDialogOpen, setVoiceGenderDialogOpen] = useState(false);
  const [voiceIntroDialogOpen, setVoiceIntroDialogOpen] = useState(false);
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [personalizeSection, setPersonalizeSection] = useState(BRAIN_PERSONALIZE_SECTIONS.hub);
  const [ideStudioOpen, setIdeStudioOpen] = useState(false);
  const [ideWorkspaceId, setIdeWorkspaceId] = useState(null);
  const ideComposerRef = useRef(null);
  const initialSessionRestoreRef = useRef(false);
  const prevBrainProjectIdRef = useRef(null);
  const ideStudioSessionRef = useRef(null);
  const ideNewChatRef = useRef(false);
  const loadConversationRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const payment = params.get("payment");
    if (!sessionId && payment !== "success") return;
    if (sessionId) {
      brainCredits.confirmPayment(sessionId).then((result) => {
        if (result?.activated) {
          toast.success("Créditos Brain.AI liberados!");
          setCreditsRefreshKey((k) => k + 1);
        }
      });
    }
    setBrainMainView("plans");
    if (window.history.replaceState) {
      window.history.replaceState({}, "", buildBrainPathname({ view: "plans" }));
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") || params.get("session_id")) return;
    if (!window.history.replaceState) return;
    const next = buildBrainPathname({
      view: brainMainView,
      conversationId: activeConversation?.id,
      studio: ideStudioOpen,
      workspaceId: ideWorkspaceId,
    });
    const current = `${window.location.pathname}${window.location.search}`;
    if (next !== current) {
      window.history.replaceState({}, "", next);
    }
  }, [brainMainView, activeConversation?.id, ideStudioOpen, ideWorkspaceId]);

  useEffect(() => {
    if (embedded) return undefined;
    document.body.classList.add("brain-page-lock");
    return () => {
      document.body.classList.remove("brain-page-lock");
    };
  }, [embedded]);

  useEffect(() => {
    if (brainCredits.isEmpty || brainCredits.isWarning) {
      setCreditsAlertDismissed(false);
    }
  }, [brainCredits.isEmpty, brainCredits.isWarning, brainCredits.balance]);

  useScheduleTranslateWhen(true);
  useScheduleTranslateWhen(
    mcpDialogOpen ||
      brainMainView === "ide" ||
      voicePanelOpen ||
      voiceGenderDialogOpen ||
      voiceIntroDialogOpen ||
      fileModalOpen ||
      projectPickerOpen ||
      libraryOpen ||
      brainMainView === "connectors" ||
      brainMainView === "personalize" ||
      brainMainView === "conversations" ||
      brainMainView === "projects"
  );
  const { selectedMcps, setSelectedMcps } = useBrainMcpSelection(user?.id);
  const setSelectedCrms = () => {};
const { personalization, setPersonalization, resetPersonalization } = useBrainPersonalization(user?.id);
  const personalizationRef = useRef(personalization);
  personalizationRef.current = personalization;
  const {
    projects: brainProjects,
    activeProject: brainActiveProject,
    loading: brainProjectsLoading,
    loadProjects,
    selectProject: selectBrainProject,
    createProject: createBrainProject
  } = useBrainActiveProject(user?.id);
  const liveCode = useBrainLiveCode(socket, user?.id, brainActiveProject?.id);
  const liveCodeRef = useRef(liveCode);
  liveCodeRef.current = liveCode;

  const isStreamingCode =
    liveCode.isActive || Object.keys(liveCode.streamingPaths || {}).length > 0;

  const showLiveCodeStack =
    isStreamingCode ||
    (loading && (liveCode.fileOrder?.length || liveCode.paths?.length));

  const openIdeBuildFromSnapshot = useCallback((snapshot) => {
    if (!snapshot?.files) return;
    const files = Object.entries(snapshot.files).map(([path, content]) => ({ path, content }));
    if (!files.length) return;
    setCodeStudioIncoming({
      title: snapshot.projectTitle || "Projeto de código",
      files,
      openPreview: Boolean(snapshot.files["index.html"]),
      workspaceId: snapshot.workspaceId || undefined
    });
    setIdeWorkspaceId(snapshot.workspaceId || null);
    setIdeStudioOpen(true);
    setBrainMainView("ide");
  }, []);
  const voiceJarvisSessionRef = useRef(false);
  const voiceSendLockRef = useRef(false);
  const chatAbortRef = useRef(null);
  const textareaRef = useRef(null);
  const inputBoxRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const attachBtnRef = useRef(null);
  const [fileAccept, setFileAccept] = useState("");
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [selectedComposerTool, setSelectedComposerTool] = useState(null);
  const [composerContexts, setComposerContexts] = useState([]);
  const conversationsFetchSeq = useRef(0);
  const transcribeVoiceBlob = useCallback(async (blob) => {
    const mimeType = String(blob?.type || "audio/webm").toLowerCase();
    let ext = "webm";
    if (mimeType.includes("mp4") || mimeType.includes("m4a")) ext = "m4a";
    else if (mimeType.includes("ogg")) ext = "ogg";
    else if (mimeType.includes("wav")) ext = "wav";
    else if (mimeType.includes("mpeg") || mimeType.includes("mp3")) ext = "mp3";
    const formData = new FormData();
    formData.append("audio", blob, `jarvis-voice.${ext}`);
    formData.append("language", selectedLanguage);
    const { data } = await api.post("/ai-brain/transcribe-audio", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 90000,
    });
    return String(data?.text || "").trim();
  }, [selectedLanguage]);

  const voiceComposer = useBrainVoiceComposer({
    language: selectedLanguage,
    onTextChange: setMessage,
    transcribeChunk: transcribeVoiceBlob,
  });
  const {
    isRecording: voiceRecording,
    isSaving: voiceSaving,
    isPaused: voicePaused,
    duration: voiceDuration,
    liveText: voiceLiveText,
    formatDuration: formatVoiceDuration,
    isSupported: voiceInputSupported,
    start: startVoiceInput,
    save: saveVoiceInput,
    cancel: cancelVoiceInput,
    pause: pauseVoiceInput,
    resume: resumeVoiceInput,
  } = voiceComposer;

  const fetchConversations = useCallback(async (projectId) => {
    const pid = projectId ?? brainActiveProject?.id;
    if (!pid) {
      setConversations([]);
      setConversationsLoading(false);
      return;
    }
    const seq = ++conversationsFetchSeq.current;
    setConversationsLoading(true);
    try {
      const { data } = await api.get("/ai-brain/conversations", {
        params: { projectId: pid }
      });
      if (seq !== conversationsFetchSeq.current) return;
      setConversations(Array.isArray(data) ? data : []);
    } catch {
      if (seq === conversationsFetchSeq.current) setConversations([]);
    } finally {
      if (seq === conversationsFetchSeq.current) setConversationsLoading(false);
    }
  }, [brainActiveProject?.id]);

  useEffect(() => {
    if (brainProjectsLoading) return;
    const pid = brainActiveProject?.id;
    if (!pid) return;

    if (!initialSessionRestoreRef.current) {
      initialSessionRestoreRef.current = true;
      const { conversationId, studio, workspaceId, view } = readBrainUrlState();
      if (view === "ide" && studio) {
        setIdeStudioOpen(true);
        if (workspaceId) setIdeWorkspaceId(workspaceId);
      }
      fetchConversations(pid);
      const convToLoad =
        conversationId ||
        (view === "ide" && studio ? readIdeLastConversation(pid) : null);
      if (convToLoad && loadConversationRef.current) {
        loadConversationRef.current(convToLoad);
      }
      prevBrainProjectIdRef.current = pid;
      return;
    }

    if (prevBrainProjectIdRef.current !== pid) {
      prevBrainProjectIdRef.current = pid;
      ideStudioSessionRef.current = null;
      setActiveConversation(null);
      setMessages([]);
      setMessage("");
      setConversationAttachments([]);
      fetchConversations(pid);
    }
  }, [brainActiveProject?.id, brainProjectsLoading, fetchConversations]);

  const [platformKeys, setPlatformKeys] = useState(null);

  const fetchBrainPlatformKeys = useCallback(async () => {
    try {
      const { data } = await api.get("/ai-brain/credits/plans");
      setPlatformKeys(data?.platformKeys || null);
      return data?.platformKeys || null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    fetchBrainPlatformKeys();
  }, [fetchBrainPlatformKeys]);

  useEffect(() => {
    if (
      brainMainView === "ide" &&
      ideStudioOpen &&
      activeConversation?.id &&
      brainActiveProject?.id
    ) {
      markIdeConversation(activeConversation.id, brainActiveProject.id);
    }
  }, [brainMainView, ideStudioOpen, activeConversation?.id, brainActiveProject?.id]);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(() => { scrollToBottom(); }, [messages, loading]);

  const loadConversation = useCallback(async (convId) => {
    try {
      const { data } = await api.get(`/ai-brain/conversations/${convId}`);
      if (
        brainActiveProject?.id &&
        data.projectId &&
        Number(data.projectId) !== Number(brainActiveProject.id)
      ) {
        toast.error("Esta conversa pertence a outro projeto.");
        fetchConversations(brainActiveProject.id);
        return;
      }
      setActiveConversation(data);
      const savedModel = String(data.model || "").trim();
      if (savedModel.startsWith("anthropic:")) {
        const claudeId = savedModel.slice("anthropic:".length);
        if (AI_MODELS.some((m) => m.id === claudeId)) setSelectedModel(claudeId);
      } else if (AI_MODELS.some((m) => m.id === savedModel)) {
        setSelectedModel(savedModel);
      }
      setMessages((data.messages || data.AiBrainMessages || []).map((m) => ({
        role: m.role,
        content: m.role === "assistant" ? sanitizeBrainAssistantContent(m.content) : m.content,
        toolCalls: m.toolCalls,
        codeSnapshot: m.codeSnapshot || null,
        createdAt: m.createdAt,
      })));
      if (brainMainView === "ide" || isIdeConversation(convId, brainActiveProject?.id)) {
        markIdeConversation(convId, data.projectId || brainActiveProject?.id);
      }
      if (isMobile) setSidebarOpen(false);
    } catch (err) { toastError(err); }
  }, [brainActiveProject?.id, brainMainView, fetchConversations, isMobile]);

  loadConversationRef.current = loadConversation;

  useEffect(() => {
    if (!ideStudioOpen) {
      ideStudioSessionRef.current = null;
      ideNewChatRef.current = false;
    }
  }, [ideStudioOpen]);

  useEffect(() => {
    if (brainMainView !== "ide" || !ideStudioOpen || brainProjectsLoading || conversationsLoading) {
      return;
    }
    const pid = brainActiveProject?.id;
    if (!pid) return;
    if (ideNewChatRef.current) return;

    const sessionKey = `${pid}:${ideWorkspaceId || 0}`;
    if (ideStudioSessionRef.current === sessionKey) return;

    const latestIdeConvId = pickLatestIdeConversationId(conversations, pid);
    if (!latestIdeConvId) {
      ideStudioSessionRef.current = sessionKey;
      return;
    }

    if (
      activeConversation?.id === latestIdeConvId &&
      messages.length > 0
    ) {
      ideStudioSessionRef.current = sessionKey;
      return;
    }

    void loadConversation(latestIdeConvId).finally(() => {
      ideStudioSessionRef.current = sessionKey;
    });
  }, [
    brainMainView,
    ideStudioOpen,
    brainProjectsLoading,
    conversationsLoading,
    brainActiveProject?.id,
    ideWorkspaceId,
    conversations,
    activeConversation?.id,
    messages.length,
    loadConversation,
  ]);

  const handleNewChat = () => {
    ideNewChatRef.current = true;
    setActiveConversation(null);
    setMessages([]);
    setMessage("");
    setConversationAttachments([]);
    setAttachedItems([]);
    setComposerContexts([]);
  };

  const handleDeleteConversation = async (convId, e) => {
    e?.stopPropagation();
    try {
      await api.delete(`/ai-brain/conversations/${convId}`);
      if (activeConversation?.id === convId) handleNewChat();
      fetchConversations();
      toast.success("Conversa removida.");
    } catch (err) { toastError(err); }
  };

  const handleSaveMcps = useCallback(
    (ids) => {
      setSelectedMcps(ids);
      const crmSet = new Set(["hubspot", "pipedrive", "clickup"]);
      setSelectedCrms(ids.filter((id) => crmSet.has(id)));
    },
    [setSelectedMcps, setSelectedCrms]
  );

  const handleFileAttach = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      setAttachedItems((prev) => [
        ...prev,
        ...files.map((file) => makeAttachedItem(file, "local")),
      ]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const closeAttachMenu = useCallback(() => {
    setAttachMenuOpen(false);
  }, []);

  const handleAttachMenuOpen = useCallback(
    (e) => {
      e.stopPropagation();
      if (attachMenuOpen) {
        closeAttachMenu();
        return;
      }
      attachBtnRef.current = e.currentTarget;
      setAttachMenuOpen(true);
    },
    [attachMenuOpen, closeAttachMenu]
  );

  useEffect(() => {
    closeAttachMenu();
  }, [activeConversation?.id, closeAttachMenu]);

  const handlePickAttachType = (accept) => {
    setFileAccept(accept);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const handleScreenshotCapture = useCallback(async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      toast.error("Captura de tela não suportada neste navegador.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" },
        audio: false,
      });
      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          video.play().then(resolve).catch(reject);
        };
        video.onerror = reject;
      });
      await new Promise((r) => setTimeout(r, 120));
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);
      stream.getTracks().forEach((track) => track.stop());
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("empty");
      const file = new File([blob], `captura-tela-${Date.now()}.png`, { type: "image/png" });
      setAttachedItems((prev) => [...prev, makeAttachedItem(file, "screenshot")]);
      toast.success("Captura de tela anexada.");
    } catch (err) {
      if (err?.name !== "NotAllowedError") {
        toast.error("Não foi possível capturar a tela.");
      }
    }
  }, []);

  const handleGithubRepoSelect = useCallback(
    (repo) => {
      const fullName = repo?.fullName || repo?.name;
      if (!fullName) return;
      setComposerContexts((prev) => [
        ...prev.filter((c) => c.type !== "github"),
        { type: "github", id: fullName, label: fullName, data: repo },
      ]);
      if (!selectedMcps.includes("github")) {
        setSelectedMcps([...selectedMcps, "github"]);
      }
      toast.success(`Repositório ${fullName} adicionado ao contexto.`);
    },
    [selectedMcps, setSelectedMcps]
  );

  const handleLearnUrl = useCallback(async (url) => {
    const data = await learnBrainFromUrl(url);
    const safeHost = (() => {
      try {
        return new URL(url).hostname.replace(/[^a-z0-9.-]/gi, "-");
      } catch {
        return "url";
      }
    })();
    const fileName = `aprendizado-${safeHost}.txt`;
    const header = `URL: ${data.url}\nTítulo: ${data.title}\n\n---\n\n`;
    const file = new File([header + data.content], fileName, { type: "text/plain" });
    setAttachedItems((prev) => [...prev, makeAttachedItem(file, "learn", data.title || url)]);
    toast.success("Conteúdo da URL adicionado para aprendizado em contexto.");
  }, []);

  const handleDriveFileSelect = useCallback(async (fileMeta) => {
    const payload = await downloadBrainDriveFile(fileMeta.id);
    const file = driveFileToBrowserFile(payload);
    if (!file) {
      toast.error("Não foi possível anexar este arquivo do Drive.");
      return;
    }
    setAttachedItems((prev) => [
      ...prev,
      makeAttachedItem(file, "drive", fileMeta.name),
    ]);
    toast.success(`${fileMeta.name} anexado do Google Drive.`);
  }, []);

  const handleSelectProjectFromMenu = useCallback(
    async (projectId) => {
      await selectBrainProject(projectId);
      await loadProjects();
      const project = brainProjects.find((p) => p.id === projectId);
      toast.success(`Projeto "${project?.title || "selecionado"}" ativo.`);
    },
    [selectBrainProject, loadProjects, brainProjects]
  );

  const handleCreateProjectFromMenu = useCallback(
    async (payload) => {
      const created = await createBrainProject(payload);
      await loadProjects();
      toast.success("Projeto criado e selecionado.");
      return created;
    },
    [createBrainProject, loadProjects]
  );

  const removeComposerContext = (id) => {
    setComposerContexts((prev) => prev.filter((c) => c.id !== id));
  };
  const handleRemoveAttachedItem = (id) => {
    setAttachedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleRenameConversation = async (convId) => {
    if (!editingTitle.trim()) { setEditingConvId(null); return; }
    try {
      await api.put(`/ai-brain/conversations/${convId}`, { title: editingTitle.trim() });
      fetchConversations();
      if (activeConversation?.id === convId) setActiveConversation((prev) => ({ ...prev, title: editingTitle.trim() }));
      toast.success("Renomeada.");
    } catch (err) { toastError(err); }
    setEditingConvId(null);
  };

  const startRenameConversation = (conv, e) => {
    e?.stopPropagation();
    setEditingConvId(conv.id);
    setEditingTitle(conv.title || "");
  };

  const cancelRenameConversation = (e) => {
    e?.stopPropagation();
    setEditingConvId(null);
    setEditingTitle("");
  };

  const appendBrainAssistantMessage = (content) => {
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content, createdAt: new Date() },
    ]);
  };

  const appendIntegrationBlockReply = (userText, assistantText) => {
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userText.trim(), createdAt: new Date() },
      { role: "assistant", content: assistantText, createdAt: new Date() },
    ]);
    setMessage("");
  };

  const validateModelBeforeSend = async (modelMeta) => {
    const provider = modelMeta?.provider || "openai";
    const keys = platformKeys || (await fetchBrainPlatformKeys());
    const issue = brainPlatformKeyIssue(keys, provider);
    if (!issue) return { ok: true };
    const message = brainPlatformKeyUserMessage(issue, provider);
    return { ok: false, message };
  };

  const handleSelectModel = async (modelId) => {
    const modelMeta = AI_MODELS.find((m) => m.id === modelId);
    setSelectedModel(modelId);
    setModelPickerOpen(false);
    setModelPickerPos(null);
    if (!modelMeta?.provider) return;
    const keys = platformKeys || (await fetchBrainPlatformKeys());
    const issue = brainPlatformKeyIssue(keys, modelMeta.provider);
    if (!issue) return;
    appendBrainAssistantMessage(
      `Você selecionou **${modelMeta.name}**. ${brainPlatformKeyUserMessage(issue, modelMeta.provider)}`
    );
  };

  const sendBrainMessage = useCallback(async (text, options = {}) => {
    const rawMsg = String(text || "").trim();
    const activeTool = options.tool ?? selectedComposerTool;
    const baseMsg = rawMsg || (attachedItems.length > 0 ? "Analise os arquivos anexados." : "");
    const withContext = applyComposerContextPrefix(baseMsg, composerContexts);
    const msg = applyComposerToolPrefix(withContext, activeTool);
    const isVoice = !!options.voice;
    const isJarvis = !!options.jarvis;
    if (!rawMsg && attachedItems.length === 0) return { ok: false, response: "" };
    if (loading && !isVoice) return { ok: false, response: "" };
    const activeProjectId = brainActiveProject?.id;
    if (isVoice && voiceSendLockRef.current) {
      return { ok: false, response: "" };
    }

    const modelMeta = AI_MODELS.find((m) => m.id === selectedModel) || AI_MODELS[0];
    const gate = await validateModelBeforeSend(modelMeta);
    if (!gate.ok) {
      if (isVoice) {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: msg, createdAt: new Date() },
          { role: "assistant", content: gate.message, createdAt: new Date() },
        ]);
        return { ok: false, response: gate.message };
      }
      appendIntegrationBlockReply(rawMsg, gate.message);
      return { ok: false, response: gate.message };
    }

    const fileNames = attachedItems.map((item) => item.file.name);
    const userDisplay =
      `${composerToolDisplayPrefix(activeTool)}${rawMsg || (fileNames.length > 0 ? "Arquivos anexados" : "")}` +
      (fileNames.length > 0 ? `\n\n📎 ${fileNames.join(", ")}` : "");
    setMessages((prev) => {
      const snap = buildBrainCodeSnapshot(liveCodeRef.current);
      const withSnap = attachCodeSnapshotToLastAssistant(prev, snap);
      return [
        ...withSnap,
        { role: "user", content: userDisplay, rawText: rawMsg, createdAt: new Date() },
      ];
    });
    setMessage("");
    setSelectedComposerTool(null);
    setComposerContexts([]);
    liveCode.reset();
    setLoading(true);
    if (isVoice) voiceSendLockRef.current = true;
    if (textareaRef.current) textareaRef.current.style.height = "36px";
    if (chatAbortRef.current) chatAbortRef.current.abort();
    const controller = new AbortController();
    chatAbortRef.current = controller;
    try {
      const formData = new FormData();
      formData.append("message", msg);
      const convId =
        isJarvis && voiceJarvisSessionRef.current
          ? null
          : activeConversation?.id;
      if (convId) formData.append("conversationId", convId);
      else if (!activeProjectId) {
        toast.error("Selecione um projeto Brain antes de iniciar uma conversa.");
        setLoading(false);
        return { ok: false, response: "Projeto não selecionado." };
      }
      if (isJarvis && voiceJarvisSessionRef.current) {
        voiceJarvisSessionRef.current = false;
      }
      formData.append("model", selectedModel);
      formData.append("language", selectedLanguage);
      if (isVoice) formData.append("voiceMode", "1");
      if (selectedMcps.length) {
        formData.append("mcpConnections", JSON.stringify(selectedMcps));
      }
      if (activeProjectId) {
        formData.append("projectId", String(activeProjectId));
      }
      formData.append("personalization", JSON.stringify(personalizationRef.current));
      attachedItems.forEach((item) => formData.append("medias", item.file));
      const { data } = await api.post("/ai-brain/chat", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
        signal: controller.signal,
      });
      if (fileNames.length > 0) {
        setConversationAttachments((prev) => [
          ...prev,
          ...attachedItems.map((item) => ({
            source: "user",
            name: item.file.name,
            type: item.file.type || "unknown",
            size: item.file.size,
            date: new Date(),
            file: item.file,
          })),
        ]);
      }
      setAttachedItems([]);
      const assistantText = sanitizeBrainAssistantContent(data.response || "");
      const codeSnapshot =
        data.codeSnapshot || buildBrainCodeSnapshot(liveCodeRef.current);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: assistantText,
          toolCalls: data.toolsUsed,
          codeSnapshot,
          createdAt: new Date(),
        },
      ]);
      if (codeSnapshot) liveCode.reset();
      if (data.generatedFile) {
        const gf = data.generatedFile;
        const idePayload = toIdeBuildPayload(gf);
        if (idePayload) {
          setCodeStudioIncoming(idePayload);
          setGeneratedFile(gf);
        } else if (gf.type === "figma_handoff") {
          setGeneratedFile(gf);
          setFileModalOpen(true);
          toast.success(
            "Pacote salvo no Google Drive. Siga o guia para importar no Figma (a API não cria o arquivo automaticamente)."
          );
        } else {
          setGeneratedFile(gf);
          setFileModalOpen(true);
        }
        setConversationAttachments((prev) => [
          ...prev,
          {
            source: "brain",
            name: gf.title || "Arquivo",
            type: gf.type,
            date: new Date(),
            fileData: gf,
          },
        ]);
      }
      setActiveConversation((prev) => ({
        ...(prev || {}),
        id: data.conversationId,
      }));
      if (brainMainView === "ide" && ideStudioOpen && activeProjectId) {
        markIdeConversation(data.conversationId, activeProjectId);
      }
      fetchConversations(activeProjectId);
      setCreditsRefreshKey((k) => k + 1);
      return { ok: true, response: assistantText };
    } catch (err) {
      const canceled =
        err?.code === "ERR_CANCELED" ||
        err?.name === "CanceledError" ||
        err?.message === "canceled";
      if (canceled) {
        const codeSnapshot = buildBrainCodeSnapshot(liveCodeRef.current);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Geração interrompida. Envie uma nova mensagem quando quiser.",
            codeSnapshot,
            createdAt: new Date(),
          },
        ]);
        if (codeSnapshot) liveCode.reset();
        return { ok: false, response: "cancelled" };
      }
      const serverMsg =
        err?.response?.data?.error || err?.response?.data?.message || "";
      if (err?.response?.status === 402) {
        setBrainMainView("plans");
      }
      const displayMsg = serverMsg || "Erro ao processar. Tente novamente.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: displayMsg, createdAt: new Date() },
      ]);
      return { ok: false, response: displayMsg };
    } finally {
      if (chatAbortRef.current === controller) chatAbortRef.current = null;
      setLoading(false);
      if (isVoice) voiceSendLockRef.current = false;
    }
  }, [
    loading,
    selectedModel,
    activeConversation,
    selectedLanguage,
    attachedItems,
    selectedComposerTool,
    composerContexts,
    selectedMcps,
    fetchConversations,
    brainActiveProject?.id,
    liveCode,
    personalization,
  ]);

  const handleStopGeneration = useCallback(() => {
    chatAbortRef.current?.abort();
    setLoading(false);
  }, []);

  const startJarvisVoiceSession = useCallback(() => {
    setActiveConversation(null);
    setMessages([]);
    setMessage("");
    setConversationAttachments([]);
    voiceJarvisSessionRef.current = true;
  }, []);

  const handleSend = async (text) => {
    const payload = text || message;
    if (!String(payload || "").trim() && attachedItems.length === 0) return;
    await sendBrainMessage(payload);
  };

  const brainVoiceMode = useBrainVoiceMode({
    language: selectedLanguage,
    sendMessage: sendBrainMessage,
    transcribeChunk: transcribeVoiceBlob,
    onSessionStart: startJarvisVoiceSession,
    enabled: voiceModeEnabled,
  });

  const {
    gender: voiceGender,
    setGender: setVoiceGender,
    phase: voicePhase,
    liveTranscript: voiceLiveTranscript,
    lastSpoken: voiceLastSpoken,
    error: voiceError,
    isSupported: voiceConversationSupported,
    startVoiceMode,
    stopVoiceMode,
    unlockSpeechSynthesis,
  } = brainVoiceMode;

  const closeVoiceConversation = useCallback(() => {
    setVoiceModeEnabled(false);
    setVoicePanelOpen(false);
    voiceJarvisSessionRef.current = false;
    stopVoiceMode();
  }, [stopVoiceMode]);

  const openVoiceConversation = useCallback(() => {
    if (!voiceConversationSupported) {
      toast.error("Conversa Jarvis requer microfone e API OpenAI (Whisper) em Integrações.");
      return;
    }
    if (voiceRecording || voiceSaving) {
      toast.error("Encerre o ditado por voz antes de iniciar a conversa.");
      return;
    }
    unlockSpeechSynthesis();
    setVoiceModeEnabled(true);
    setVoicePanelOpen(true);
    startVoiceMode();
  }, [
    voiceConversationSupported,
    voiceRecording,
    voiceSaving,
    startVoiceMode,
    unlockSpeechSynthesis,
  ]);

  const proceedAfterVoiceIntro = useCallback(() => {
    if (!voiceGender) {
      setVoiceGenderDialogOpen(true);
      return;
    }
    openVoiceConversation();
  }, [voiceGender, openVoiceConversation]);

  const handleVoiceModeToggle = () => {
    unlockSpeechSynthesis();
    if (voicePanelOpen) {
      closeVoiceConversation();
      return;
    }
    if (!voiceConversationSupported) {
      toast.error("Conversa Jarvis requer microfone e API OpenAI (Whisper) em Integrações.");
      return;
    }
    setVoiceIntroDialogOpen(true);
  };

  const handleVoiceGenderSelect = (selected) => {
    setVoiceGender(selected);
    if (!voiceConversationSupported) {
      toast.error("Conversa Jarvis requer microfone e API OpenAI (Whisper) em Integrações.");
      return;
    }
    unlockSpeechSynthesis();
    setVoiceModeEnabled(true);
    setVoicePanelOpen(true);
    startVoiceMode(selected);
  };

  const handleChangeVoiceGender = () => {
    closeVoiceConversation();
    setVoiceGenderDialogOpen(true);
  };

  const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const handleTextareaInput = () => {
    const el = textareaRef.current;
    if (el) { el.style.height = "36px"; el.style.height = Math.min(el.scrollHeight, 160) + "px"; }
  };

  const focusComposer = () => {
    setTimeout(() => {
      const el =
        brainMainView === "ide" && ideStudioOpen
          ? ideComposerRef.current
          : textareaRef.current;
      if (!el) return;
      el.focus();
      el.selectionStart = el.selectionEnd = el.value.length;
      if (brainMainView !== "ide" || !ideStudioOpen) handleTextareaInput();
      else {
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
      }
    }, 0);
  };

  const handleEditUserMessage = useCallback((index) => {
    const target = messages[index];
    if (!target || target.role !== "user") return;
    const raw = target.rawText || stripUserRawContent(target.content);
    setMessages((prev) => prev.slice(0, index));
    setMessage(raw);
    focusComposer();
  }, [messages]);

  useEffect(() => {
    if (voiceRecording || voiceLiveText) handleTextareaInput();
  }, [message, voiceRecording, voiceLiveText]);

  const handleVoiceMicClick = async () => {
    if (!voiceInputSupported) {
      toast.error("Ditado por voz em tempo real requer Chrome ou Edge com microfone.");
      return;
    }
    if (voiceSaving) return;
    if (voiceRecording) {
      cancelVoiceInput();
      return;
    }
    try {
      await startVoiceInput(message);
      focusComposer();
    } catch (err) {
      toastError(err);
    }
  };

  const handleSaveVoiceRecording = async () => {
    if (!voiceRecording || voiceSaving) return;
    try {
      const finalMessage = await saveVoiceInput();
      if (!String(finalMessage || "").trim()) {
        toast.error("Nenhuma fala detectada. Tente novamente mais perto do microfone.");
      }
      focusComposer();
    } catch (err) {
      toastError(err);
    }
  };

  const handlePauseVoiceRecording = () => {
    if (!voiceRecording || voiceSaving) return;
    if (voicePaused) {
      resumeVoiceInput();
      return;
    }
    pauseVoiceInput();
  };

  const handleCancelVoiceRecording = () => {
    if (!voiceRecording || voiceSaving) return;
    cancelVoiceInput();
    focusComposer();
  };

  const selectedModelObj = AI_MODELS.find((m) => m.id === selectedModel) || AI_MODELS[0];
  const toolNameMap = {
    create_activity: "Atividade", create_contact: "Contato", create_lead: "Lead",
    create_lead_sale: "Lead Venda", search_products: "Produtos",
    list_lead_sales: "Leads Vendas", list_users: "Usuários",
    get_organization_info: "Organização", list_pipelines: "Pipelines",
    get_dashboard_data: "Dashboard", list_activities: "Atividades", list_contacts: "Contatos",
    list_tickets: "Tickets", list_leads: "Leads", list_projects: "Projetos",
    crm_summary: "Resumo", generate_file: "Arquivo",
    create_connection: "Conexão", list_connections: "Conexões",
    create_product: "Produto", create_quick_message: "Resposta Rápida",
    list_tags: "Tags", list_queues: "Filas", list_contact_lists: "Listas",
    create_campaign: "Campanha", send_message: "Mensagem Enviada",
    update_visual_identity: "Identidade Visual", update_settings: "Configurações",
    get_settings: "Config. Consultadas",
    code_sandbox_write_files: "IDE Build",
    code_sandbox_write_file: "IDE Build",
    supabase_create_table: "Supabase DDL",
    supabase_execute_sql: "Supabase SQL",
    supabase_list_tables: "Supabase",
    render_figma_navigable_prototype: "Protótipo Figma",
  };
  const LANGUAGES = [
    { code: "pt-BR", label: "Português" },
    { code: "en", label: "English" },
    { code: "es", label: "Español" },
  ];
  const getFileIcon = (type) => {
    switch (type) {
      case "pdf": return <FileText size={14} />;
      case "excel": return <FileSpreadsheet size={14} />;
      case "json": return <FileJson size={14} />;
      case "presentation": return <Presentation size={14} />;
      case "image":
      case "png":
      case "prototype_html":
      case "prototype_package":
      case "figma_prototype":
      case "figma_handoff": return <Palette size={14} />;
      case "code_workspace": return <Code2 size={14} />;
      default: return <File size={14} />;
    }
  };

  const openBrainIde = async () => {
    if (brainActiveProject?.id) {
      await selectBrainProject(brainActiveProject.id);
    }
    setIdeStudioOpen(false);
    setIdeWorkspaceId(null);
    setBrainMainView("ide");
  };

  const openIdeStudio = useCallback(async ({ projectId, workspaceId }) => {
    if (projectId && projectId !== brainActiveProject?.id) {
      await selectBrainProject(projectId);
      await loadProjects();
    }
    ideStudioSessionRef.current = null;
    ideNewChatRef.current = false;
    setIdeWorkspaceId(workspaceId || null);
    setIdeStudioOpen(true);
  }, [brainActiveProject?.id, selectBrainProject, loadProjects]);

  const closeBrainIde = useCallback(() => {
    setBrainMainView("chat");
    setCodeStudioIncoming(null);
    setIdeStudioOpen(false);
    setIdeWorkspaceId(null);
  }, []);

  const backToIdeHome = useCallback(() => {
    setIdeStudioOpen(false);
    setIdeWorkspaceId(null);
  }, []);

  const openPersonalize = useCallback((section = BRAIN_PERSONALIZE_SECTIONS.hub) => {
    setPersonalizeSection(section);
    setBrainMainView("personalize");
  }, []);

  const closeModelPicker = useCallback(() => {
    setModelPickerOpen(false);
    setModelPickerPos(null);
  }, []);

  const positionModelPicker = useCallback((btnEl, { forceAbove = false, compact = false } = {}) => {
    if (!btnEl) return;
    const rect = btnEl.getBoundingClientRect();
    const gap = 6;
    const viewportPad = 10;
    const dropdownWidth = compact ? 220 : 280;
    const preferredMax = compact ? 260 : 320;
    const minHeight = compact ? 120 : 160;

    const spaceBelow = window.innerHeight - rect.bottom - viewportPad;
    const spaceAbove = rect.top - viewportPad;
    const openAbove =
      forceAbove ||
      spaceBelow < minHeight ||
      (spaceBelow < preferredMax && spaceAbove > spaceBelow);

    const available = openAbove ? spaceAbove : spaceBelow;
    const maxHeight = Math.min(preferredMax, Math.max(minHeight, available - gap));

    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - viewportPad) {
      left = window.innerWidth - dropdownWidth - viewportPad;
    }
    left = Math.max(viewportPad, left);

    setModelPickerPos({
      top: openAbove ? rect.top - gap : rect.bottom + gap,
      left,
      maxHeight,
      placement: openAbove ? "above" : "below",
      compact,
    });
    setModelPickerOpen(true);
  }, []);

  const handleModelSelectorClick = useCallback((e) => {
    e.stopPropagation();
    if (modelPickerOpen) {
      closeModelPicker();
      return;
    }
    const ideComposer = brainMainView === "ide" && ideStudioOpen;
    positionModelPicker(e.currentTarget, { forceAbove: ideComposer, compact: ideComposer });
  }, [modelPickerOpen, closeModelPicker, positionModelPicker, brainMainView, ideStudioOpen]);

  useEffect(() => {
    if (!modelPickerOpen) return undefined;
    const onPointerDown = (ev) => {
      if (modelSelectorBtnRef.current?.contains(ev.target)) return;
      const dropdown = document.getElementById("brain-model-picker-dropdown");
      if (dropdown?.contains(ev.target)) return;
      closeModelPicker();
    };
    const onReposition = () => {
      if (modelSelectorBtnRef.current) {
        positionModelPicker(modelSelectorBtnRef.current);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [modelPickerOpen, closeModelPicker, positionModelPicker]);

  const renderModelPickerMenu = () => (
    <>
      <div className={`${b.modelPickerSection} brain-shell__model-picker-smart`}>
        <div className={b.modelPickerProviderRow}>
          <ModelProviderIcon provider="smart" size={16} />
          <span className={b.modelPickerProviderLabel}>VBSolution</span>
        </div>
        {BRAIN_SMART_MODELS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`${b.modelPickerItem} ${selectedModel === m.id ? b.modelPickerItemActive : ""}`}
            onClick={() => { if (m.active !== false) handleSelectModel(m.id); }}
            disabled={m.active === false}
            style={m.active === false ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
          >
            <ModelProviderIcon provider="smart" modelId={m.id} size={16} />
            <div className={b.modelPickerItemBody}>
              <div className={b.modelPickerItemName}>{m.name}</div>
              {m.description ? (
                <div className={b.modelPickerItemDesc}>{m.description}</div>
              ) : null}
            </div>
            {selectedModel === m.id ? <Check size={14} color={ACCENT} /> : null}
          </button>
        ))}
      </div>
      <div className="brain-shell__model-picker-providers">
        {MODEL_PROVIDERS.map((provider, providerIndex) => (
          <React.Fragment key={provider.id}>
            {providerIndex > 0 ? <div className={b.modelPickerDivider} /> : null}
            <div className={b.modelPickerSection}>
              <div className={b.modelPickerProviderRow}>
                <ModelProviderIcon provider={provider.id} size={16} />
                <span className={b.modelPickerProviderLabel}>{provider.label}</span>
              </div>
              {AI_MODELS.filter((m) => m.provider === provider.id).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`${b.modelPickerItem} ${selectedModel === m.id ? b.modelPickerItemActive : ""}`}
                  onClick={() => { if (m.active !== false) handleSelectModel(m.id); }}
                  disabled={m.active === false}
                  style={m.active === false ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
                >
                  <ModelProviderIcon provider={provider.id} modelId={m.id} size={14} />
                  <div className={b.modelPickerItemBody}>
                    <div className={b.modelPickerItemName}>{m.name}</div>
                    {m.description ? (
                      <div className={b.modelPickerItemDesc}>{m.description}</div>
                    ) : null}
                  </div>
                  {selectedModel === m.id ? <Check size={14} color={ACCENT} /> : null}
                </button>
              ))}
            </div>
          </React.Fragment>
        ))}
      </div>
    </>
  );

  // Seletor de modelo: dropdown via portal (position fixed abaixo do botão)
  const renderInputBox = (isBottom = false) => (
    <div className={b.inputContainer} style={isBottom ? { marginBottom: 0, maxWidth: 600 } : {}}>
      <div className={b.composerShell}>
        <div className={b.inputBox} ref={inputBoxRef}>
          {(selectedComposerTool || composerContexts.length > 0 || attachedItems.length > 0) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingBottom: 4 }}>
              {selectedComposerTool ? (
                <button
                  type="button"
                  className={b.toolChip}
                  onClick={() => setSelectedComposerTool(null)}
                >
                  {selectedComposerTool === "searchWeb" ? <Globe size={10} /> : <BookOpen size={10} />}
                  {selectedComposerTool === "searchWeb" ? ui("Buscar na web") : ui("Buscar em documentos")}
                  <X size={10} />
                </button>
              ) : null}
              {attachedItems.map((item) => {
                const Icon = attachItemIcon(item.source);
                const label = item.label || item.file.name;
                const shortLabel = label.length > 22 ? `${label.slice(0, 19)}…` : label;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={b.toolChip}
                    onClick={() => handleRemoveAttachedItem(item.id)}
                  >
                    {item.source === "drive" ? (
                      <GoogleDriveBrandIcon size={10} />
                    ) : (
                      <Icon size={10} />
                    )}
                    {shortLabel}
                    <X size={10} />
                  </button>
                );
              })}
              {composerContexts.map((ctx) => {
                const Icon = ctx.type === "github" ? Github : GraduationCap;
                const shortLabel =
                  ctx.label.length > 22 ? `${ctx.label.slice(0, 19)}…` : ctx.label;
                return (
                  <button
                    key={`${ctx.type}-${ctx.id}`}
                    type="button"
                    className={b.toolChip}
                    onClick={() => removeComposerContext(ctx.id)}
                  >
                    <Icon size={10} />
                    {shortLabel}
                    <X size={10} />
                  </button>
                );
              })}
            </div>
          )}
          {voiceRecording && (
            <div className={b.voiceRecordingBar}>
              <span className={b.voiceRecordingDot} />
              <span>{voicePaused ? "Pausado" : "Gravando"} {formatVoiceDuration(voiceDuration)}</span>
              <BrainTooltip title={voicePaused ? "Retomar" : "Pausar"}>
                <button type="button" className={b.voiceIconBtn} onClick={handlePauseVoiceRecording} disabled={voiceSaving}>
                  {voicePaused ? <Play size={11} /> : <Pause size={11} />}
                </button>
              </BrainTooltip>
              <BrainTooltip title="Salvar">
                <button type="button" className={`${b.voiceIconBtn} ${b.voiceIconBtnSave}`} onClick={handleSaveVoiceRecording} disabled={voiceSaving}>
                  {voiceSaving ? <Spinner size={10} className="text-green-500" /> : <Check size={11} />}
                </button>
              </BrainTooltip>
              <BrainTooltip title="Cancelar">
                <button type="button" className={`${b.voiceIconBtn} ${b.voiceIconBtnCancel}`} onClick={handleCancelVoiceRecording} disabled={voiceSaving}>
                  <X size={11} />
                </button>
              </BrainTooltip>
            </div>
          )}
          <textarea ref={textareaRef} className={b.textArea}
            placeholder={
              voiceRecording
                ? ui("Falando… o texto aparece aqui em tempo real")
                : ideStudioOpen
                  ? ui("Ask Brain.AI...")
                  : ui("Pergunte algo ao Brain...")
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)} onKeyDown={handleKeyDown}
            onInput={handleTextareaInput} rows={1} disabled={voiceSaving}
          />
          <div className={b.inputFooter}>
            <div className={b.inputFooterLeft}>
              <BrainTooltip title="Anexar">
                <button
                  ref={attachBtnRef}
                  type="button"
                  className={b.iconBtn}
                  onClick={handleAttachMenuOpen}
                  disabled={voiceRecording || voiceSaving}
                >
                  <Plus size={13} />
                </button>
              </BrainTooltip>
              <div style={{ display: "flex", alignItems: "center" }}>
                <BrainTooltip title="Conectores">
                  <button
                    type="button"
                    className={b.iconBtn}
                    onClick={() => setMcpDialogOpen(true)}
                    disabled={voiceRecording || voiceSaving}
                    style={{ position: "relative" }}
                  >
                    <Link2 size={13} />
                    {selectedMcps.length > 0 && <span className={b.connectorDot} />}
                  </button>
                </BrainTooltip>
                {selectedMcps.length > 0 && (
                  <div className={b.connectorIconsRow}>
                    {selectedMcps.map((id) => {
                      const item = getBrainMcpById(id);
                      if (!item) return null;
                      return (
                        <BrainTooltip key={id} title={item.name}>
                          <button
                            type="button"
                            className={b.connectorIconBtn}
                            onClick={() => setMcpDialogOpen(true)}
                          >
                            <BrainMcpIcon id={id} size={12} />
                          </button>
                        </BrainTooltip>
                      );
                    })}
                  </div>
                )}
              </div>
              <ComposerAiAssist
                text={message}
                onTextChange={(next) => setMessage(next)}
                disabled={loading || voiceRecording || voiceSaving}
                popoverAnchorRef={inputBoxRef}
                onFocusInput={focusComposer}
                triggerClassName={b.iconBtn}
                iconSize={13}
                useNativeButton
              />
              <div className={b.modelSelectorWrap}>
                <div
                  ref={modelSelectorBtnRef}
                  className={`${b.modelSelector} ${modelPickerOpen ? b.modelSelectorOpen : ""}`}
                  onClick={handleModelSelectorClick}
                >
                  <ModelProviderIcon provider={selectedModelObj.provider} modelId={selectedModelObj.id} size={11} />
                  <span>{selectedModelObj.name}</span>
                  <ChevronDown size={10} style={{ transform: modelPickerOpen ? "rotate(180deg)" : undefined, transition: "transform 0.15s ease" }} />
                </div>
              </div>
            </div>
            <div className={b.inputFooterRight}>
              {voiceInputSupported && (
                <BrainTooltip title={voiceRecording ? "Cancelar ditado" : "Ditado por voz (tempo real)"}>
                  <button
                    type="button"
                    className={`${b.iconBtn} ${voiceRecording ? b.iconBtnRecording : ""}`}
                    onClick={handleVoiceMicClick}
                    disabled={loading || voiceSaving || voicePanelOpen}
                  >
                    <Mic size={12} />
                  </button>
                </BrainTooltip>
              )}
              <DropdownMenu open={languageMenuOpen} onOpenChange={setLanguageMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button type="button" className={b.iconBtn} disabled={voiceRecording} aria-label="Idioma">
                    <Globe size={12} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {LANGUAGES.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      className={b.modelMenuItem}
                      onClick={() => {
                        setSelectedLanguage(lang.code);
                        setLanguageMenuOpen(false);
                      }}
                    >
                      <span>{lang.label}</span>
                      {selectedLanguage === lang.code ? <span style={{ color: ACCENT, fontSize: 13 }}>&#10003;</span> : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {loading ? (
                <BrainTooltip title="Parar geração">
                  <button type="button" className={b.iconBtn} onClick={handleStopGeneration}>
                    <Pause size={12} />
                  </button>
                </BrainTooltip>
              ) : (
                <button className={b.sendBtn} onClick={() => handleSend()} disabled={(!message.trim() && attachedItems.length === 0) || voiceRecording || voiceSaving}>
                  <Send size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const hasMessages = messages.length > 0;
  const quickActionsSource =
    embedded && contextSuggestions?.length > 0 ? contextSuggestions : QUICK_ACTIONS;
  const renderQuickActionButton = (qa, key) => (
    <button
      type="button"
      key={key}
      className={b.quickActionCard}
      onClick={() => handleSend(qa.prompt)}
    >
      <span className={b.quickActionIcon} aria-hidden>
        <qa.icon size={10} />
      </span>
      <span className={b.quickActionTitle}>{ui(qa.title)}</span>
    </button>
  );

  const renderQuickActionsPanel = () => (
    <div className={b.quickActionsGrid}>
      {quickActionsSource.map((qa, i) => renderQuickActionButton(qa, i))}
    </div>
  );

  return (
    <TooltipProvider delayDuration={200}><div className={`${shellClass} ${embedded ? b.rootEmbedded : b.root}`}>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        multiple
        accept={fileAccept || undefined}
        onChange={handleFileAttach}
      />
      <BrainComposerPlusMenu
        open={attachMenuOpen}
        anchorRef={attachBtnRef}
        docked={messages.length > 0 || (brainMainView === "ide" && ideStudioOpen)}
        compact={brainMainView === "ide" && ideStudioOpen}
        onClose={closeAttachMenu}
        onPickAttach={handlePickAttachType}
        onOpenConnectors={() => setMcpDialogOpen(true)}
        selectedWebTool={selectedComposerTool}
        onSelectWebTool={() => setSelectedComposerTool("searchWeb")}
        onSelectDocsTool={() => setSelectedComposerTool("searchDocs")}
        onScreenshot={handleScreenshotCapture}
        projects={brainProjects}
        activeProjectId={brainActiveProject?.id}
        onSelectProject={handleSelectProjectFromMenu}
        onCreateProject={handleCreateProjectFromMenu}
        onGithubRepoSelect={handleGithubRepoSelect}
        onLearnUrl={handleLearnUrl}
        onDriveFileSelect={handleDriveFileSelect}
      />
      {/* Sidebar */}
      {(!embedded || !isXs) && (
        <div className={`${b.sidebar} ${!sidebarExpanded ? b.sidebarCollapsed : ""}`}>
          <div className={b.sidebarHeader}>
            <div className={b.sidebarBrandRow}>
              <button
                type="button"
                className={b.sidebarBrandLogo}
                onClick={() => {
                  if (!sidebarExpanded) setSidebarExpanded(true);
                }}
                aria-label={sidebarExpanded ? "Brain.AI" : ui("Expandir menu")}
              >
                <BrainFlower size={sidebarExpanded ? 28 : 26} />
              </button>
            </div>
            {sidebarExpanded ? (
              <BrainTooltip title={ui("Recolher menu")}>
                <button
                  type="button"
                  className={b.sidebarCollapseBtn}
                  onClick={() => setSidebarExpanded(false)}
                >
                  <PanelLeftClose size={15} />
                </button>
              </BrainTooltip>
            ) : null}
          </div>
          <div className={b.sidebarMenu}>
            <BrainTooltip title={sidebarExpanded ? "" : ui("Nova conversa")} placement="right">
              <button
                type="button"
                className={b.sidebarMenuItem}
                onClick={() => { setBrainMainView("chat"); handleNewChat(); }}
              >
                <Plus size={14} />
                <span className={b.sidebarMenuItemLabel}>{ui("Nova conversa")}</span>
              </button>
            </BrainTooltip>
            {sidebarExpanded ? (
              <>
                <BrainTooltip title="" placement="right">
                  <button
                    type="button"
                    className={`${b.sidebarMenuItem} ${brainMainView === "conversations" ? b.sidebarMenuItemActive : ""}`}
                    onClick={() => setBrainMainView("conversations")}
                  >
                    <Search size={14} />
                    <span className={b.sidebarMenuItemLabel}>{ui("Buscar conversas")}</span>
                  </button>
                </BrainTooltip>
                <BrainTooltip title="" placement="right">
                  <button
                    type="button"
                    className={`${b.sidebarMenuItem} ${brainMainView === "projects" ? b.sidebarMenuItemActive : ""}`}
                    onClick={() => setBrainMainView("projects")}
                  >
                    <FolderKanban size={14} />
                    <span className={b.sidebarMenuItemLabel}>{ui("Projetos")}</span>
                  </button>
                </BrainTooltip>
              </>
            ) : null}
            <BrainTooltip title={sidebarExpanded ? "" : "BrainAI IDE Code"} placement="right">
              <button
                type="button"
                className={`${b.sidebarMenuItem} ${brainMainView === "ide" ? b.sidebarMenuItemActive : ""}`}
                onClick={() => { void openBrainIde(); }}
              >
                <Code2 size={14} />
                <span className={b.sidebarMenuItemLabel}>BrainAI IDE Code</span>
              </button>
            </BrainTooltip>
            <BrainTooltip title={sidebarExpanded ? "" : ui("Conectores e Plugins")} placement="right">
              <button
                type="button"
                className={`${b.sidebarMenuItem} ${brainMainView === "personalize" && (personalizeSection === BRAIN_PERSONALIZE_SECTIONS.mcp || personalizeSection === BRAIN_PERSONALIZE_SECTIONS.mcpCatalog) ? b.sidebarMenuItemActive : ""}`}
                onClick={() => openPersonalize(BRAIN_PERSONALIZE_SECTIONS.mcp)}
              >
                <Link2 size={14} />
                <span className={b.sidebarMenuItemLabel}>{ui("Conectores e Plugins")}</span>
              </button>
            </BrainTooltip>
            <BrainTooltip title={sidebarExpanded ? "" : ui("Personalizar")} placement="right">
              <button
                type="button"
                className={`${b.sidebarMenuItem} ${brainMainView === "personalize" ? b.sidebarMenuItemActive : ""}`}
                onClick={() => openPersonalize(BRAIN_PERSONALIZE_SECTIONS.hub)}
              >
                <Sliders size={14} />
                <span className={b.sidebarMenuItemLabel}>{ui("Personalizar")}</span>
              </button>
            </BrainTooltip>
          </div>
          <div className={b.sidebarRecentSection}>
            <div className={b.sidebarSectionLabel}>{ui("Recentes")}</div>
            <div className={b.sidebarRecentList}>
              {conversationsLoading ? (
                <div className={b.loadingCenter}>
                  <Spinner size={16} />
                </div>
              ) : null}
              {!conversationsLoading && conversations.length === 0 ? (
                <span className={b.sidebarEmpty}>
                  {ui("Nenhuma conversa neste projeto ainda.")}
                </span>
              ) : null}
              {conversations.slice(0, 40).map((conv) => (
                <div
                  key={conv.id}
                  className={`${b.conversationRecentRow} ${activeConversation?.id === conv.id ? b.conversationRecentItemActive : ""}`}
                  onClick={() => {
                    if (editingConvId === conv.id) return;
                    if (isIdeConversation(conv.id, brainActiveProject?.id)) {
                      setBrainMainView("ide");
                      setIdeStudioOpen(true);
                    } else {
                      setBrainMainView("chat");
                    }
                    loadConversation(conv.id);
                  }}
                >
                  {editingConvId === conv.id ? (
                    <>
                      <input
                        className={b.conversationRecentEditInput}
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.stopPropagation();
                            void handleRenameConversation(conv.id);
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            e.stopPropagation();
                            cancelRenameConversation(e);
                          }
                        }}
                        autoFocus
                      />
                      <div className={b.conversationRecentActions} style={{ opacity: 1, pointerEvents: "auto" }}>
                        <BrainTooltip title={ui("Salvar")}>
                          <button
                            type="button"
                            className={b.conversationRecentActionBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleRenameConversation(conv.id);
                            }}
                          >
                            <Check size={11} />
                          </button>
                        </BrainTooltip>
                        <BrainTooltip title={ui("Cancelar")}>
                          <button
                            type="button"
                            className={b.conversationRecentActionBtn}
                            onClick={cancelRenameConversation}
                          >
                            <X size={11} />
                          </button>
                        </BrainTooltip>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className={b.conversationRecentTitle} title={conv.title}>
                        {isIdeConversation(conv.id, brainActiveProject?.id) ? (
                          <Code2
                            size={12}
                            strokeWidth={1.75}
                            className="brain-shell__conversation-ide-icon"
                            aria-hidden
                          />
                        ) : null}
                        <span className="brain-shell__conversation-recent-title-text">
                          {conv.title || ui("Conversa sem título")}
                        </span>
                      </span>
                      <div className={b.conversationRecentActions}>
                        <BrainTooltip title={ui("Renomear")}>
                          <button
                            type="button"
                            className={b.conversationRecentActionBtn}
                            onClick={(e) => startRenameConversation(conv, e)}
                          >
                            <Pencil size={11} />
                          </button>
                        </BrainTooltip>
                        <BrainTooltip title={ui("Excluir")}>
                          <button
                            type="button"
                            className={b.conversationRecentActionBtn}
                            onClick={(e) => handleDeleteConversation(conv.id, e)}
                          >
                            <Trash2 size={11} />
                          </button>
                        </BrainTooltip>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <div
        className={`${b.mainContent}${
          brainMainView === "chat" ? ` ${b.mainContentChat}` : ""
        }${hasMessages && brainMainView === "chat" ? ` ${b.mainContentConversation}` : ""}${
          brainMainView === "plans" ? ` ${b.mainContentPlans}` : ""
        }${brainMainView === "ide" ? ` ${b.mainContentIde}` : ""}${
          voicePanelOpen ? ` ${b.mainContentVoice}` : ""
        }`}
      >
        <BrainVoicePanel
          open={voicePanelOpen}
          phase={voicePhase}
          liveTranscript={voiceLiveTranscript}
          lastSpoken={voiceLastSpoken}
          error={voiceError}
          onClose={closeVoiceConversation}
          onChangeVoice={handleChangeVoiceGender}
        />
        {/* Top bar Brain.IA — oculta no IDE (topbar Lovable + topbar global VB) */}
        {brainMainView !== "ide" ? (
        <div className={b.chatHeader}>
          <div className={b.chatHeaderBrand}>
            <BrainOrgMenu
              user={user}
              refreshKey={creditsRefreshKey}
              onOpenPlans={() => setBrainMainView("plans")}
              brandTitle="Brain.IA"
              isDark={isDark}
            />
            {hasMessages && activeConversation?.title && brainMainView === "chat" ? (
              <span className={b.chatHeaderTitle}> / {activeConversation.title}</span>
            ) : null}
          </div>
          <div className={b.chatHeaderRight}>
            {hasMessages && brainMainView === "chat" ? (
              <div className={b.chatHeaderTools}>
                <span className={b.modelBadge}>{selectedModelObj.name}</span>
                {conversationAttachments.length > 0 && (
                  <BrainTooltip title="Biblioteca de anexos">
                    <button className={b.attachLibraryBtn} onClick={() => setLibraryOpen(true)}>
                      <BookOpen size={13} />
                      <span className={b.attachLibraryBadge}>{conversationAttachments.length}</span>
                    </button>
                  </BrainTooltip>
                )}
                <BrainTooltip title="Nova conversa">
                  <button type="button" className={b.iconBtnPlain} onClick={handleNewChat}>
                    <Plus size={13} />
                  </button>
                </BrainTooltip>
              </div>
            ) : null}
            <div className={b.chatHeaderActionsPlain}>
              {voiceConversationSupported && brainMainView === "chat" && (
                <BrainTooltip title={voicePanelOpen ? "Encerrar conversa por voz" : "Conversa por voz"}>
                  <button
                    type="button"
                    onClick={handleVoiceModeToggle}
                    className={`${b.voiceModeBtn} ${voicePanelOpen ? b.voiceModeBtnActive : ""}`}
                  >
                    <AudioLines size={14} />
                  </button>
                </BrainTooltip>
              )}
              <PageHelpButton
                topic="aiBrain"
                title="Ajuda do Brain.AI"
                buttonClassName={b.helpBtnPlain}
              />
            </div>
          </div>
        </div>
        ) : null}

        {!creditsAlertDismissed &&
        (brainCredits.isEmpty || brainCredits.isWarning) &&
        brainMainView !== "plans" &&
        brainMainView !== "ide" ? (
          <BrainCreditsAlert
            balance={brainCredits.balance}
            quota={brainCredits.quota}
            percentUsed={brainCredits.percentUsed}
            cycleEndsAt={brainCredits.status?.cycleEndsAt}
            onUpgrade={() => setBrainMainView("plans")}
            onDismiss={
              brainCredits.isEmpty
                ? undefined
                : () => setCreditsAlertDismissed(true)
            }
          />
        ) : null}

        {brainMainView === "ide" ? (
          <div className={`${b.idePage}${ideStudioOpen ? "" : ` ${b.idePageHome}`}`}>
            {ideStudioOpen ? (
              <BrainCodeStudio
                embedded
                open
                onClose={closeBrainIde}
                userId={user?.id}
                brainProject={brainActiveProject}
                brainProjects={brainProjects}
                onSelectBrainProject={async (id) => {
                  await selectBrainProject(id);
                  await loadProjects();
                }}
                incomingFiles={codeStudioIncoming?.files}
                incomingTitle={codeStudioIncoming?.title}
                liveSession={liveCode}
                selectedMcps={selectedMcps}
                onToggleMcp={setSelectedMcps}
                preferredWorkspaceId={ideWorkspaceId}
                onActiveWorkspaceChange={setIdeWorkspaceId}
                onBackToCreations={backToIdeHome}
                ideUser={user}
                creditsRefreshKey={creditsRefreshKey}
                onOpenPlans={() => setBrainMainView("plans")}
                ui={ui}
                chatPanel={
                  <BrainIdeChatPanel
                    messages={messages}
                    loading={loading}
                    liveCode={liveCode}
                    showLiveCodeStack={showLiveCodeStack}
                    toolNameMap={toolNameMap}
                    onEditUserMessage={handleEditUserMessage}
                    onOpenIdeBuild={() =>
                      openIdeBuildFromSnapshot(buildBrainCodeSnapshot(liveCode))
                    }
                    ui={ui}
                    composer={
                      <BrainIdeComposer
                        ref={ideComposerRef}
                        value={message}
                        onChange={setMessage}
                        onSend={() => handleSend()}
                        onStop={handleStopGeneration}
                        loading={loading}
                        disabled={voiceRecording || voiceSaving}
                        placeholder="Comece a editar seu projeto"
                        ui={ui}
                        attachBtnRef={attachBtnRef}
                        onAttachClick={handleAttachMenuOpen}
                        modelSelector={
                          <div className={`${b.modelSelectorWrap} brain-ide-composer__model-wrap`}>
                            <div
                              ref={modelSelectorBtnRef}
                              className={`${b.modelSelector} brain-ide-composer__model-selector ${
                                modelPickerOpen ? b.modelSelectorOpen : ""
                              }`}
                              onClick={handleModelSelectorClick}
                            >
                              <ModelProviderIcon provider={selectedModelObj.provider} modelId={selectedModelObj.id} size={11} />
                              <span>{selectedModelObj.name}</span>
                              <ChevronDown
                                size={10}
                                style={{
                                  transform: modelPickerOpen ? "rotate(180deg)" : undefined,
                                  transition: "transform 0.15s ease",
                                }}
                              />
                            </div>
                          </div>
                        }
                        voiceInputSupported={voiceInputSupported}
                        voiceRecording={voiceRecording}
                        onVoiceClick={handleVoiceMicClick}
                        voiceSaving={voiceSaving}
                      />
                    }
                  />
                }
              />
            ) : (
              <BrainIdeHome
                activeProjectId={brainActiveProject?.id}
                onSelectBrainProject={async (id) => {
                  await selectBrainProject(id);
                  await loadProjects();
                }}
                onOpenStudio={(payload) => void openIdeStudio(payload)}
                ui={ui}
              />
            )}
          </div>
        ) : brainMainView === "connectors" ? (
          <BrainMcpCatalogPage
            selectedMcps={selectedMcps}
            onSave={(ids) => {
              handleSaveMcps(ids);
              toast.success(ui("Conectores salvos."));
            }}
            onBack={() => setBrainMainView("chat")}
            ui={ui}
          />
        ) : brainMainView === "personalize" ? (
          <BrainPersonalizeHub
            userId={user?.id}
            initialSection={personalizeSection}
            personalization={personalization}
            onPersist={setPersonalization}
            onSavePersonalization={(next) => {
              setPersonalization(next);
              toast.success(ui("Preferências salvas e aplicadas ao Brain.AI."));
            }}
            onResetPersonalization={() => {
              resetPersonalization();
              toast.info(ui("Preferências restauradas ao padrão."));
            }}
            selectedMcps={selectedMcps}
            onSaveMcps={(ids) => {
              handleSaveMcps(ids);
              toast.success(ui("Conectores salvos."));
            }}
            ui={ui}
          />
        ) : brainMainView === "conversations" ? (
          <BrainConversationsPage
            conversations={conversations}
            loading={conversationsLoading}
            activeConversationId={activeConversation?.id}
            onSelectConversation={(id) => { loadConversation(id); setBrainMainView("chat"); }}
            onNewChat={() => { handleNewChat(); setBrainMainView("chat"); }}
            ui={ui}
          />
        ) : brainMainView === "projects" ? (
          <BrainProjectsPage
            projects={brainProjects}
            activeProjectId={brainActiveProject?.id}
            loading={brainProjectsLoading}
            onSelectProject={async (id) => {
              await selectBrainProject(id);
              await loadProjects();
              setBrainMainView("chat");
            }}
            onCreateProject={() => setProjectPickerOpen(true)}
            ui={ui}
          />
        ) : brainMainView === "plans" ? (
          <BrainPlansPage
            refreshKey={creditsRefreshKey}
            onCreditsUpdated={() => setCreditsRefreshKey((k) => k + 1)}
          />
        ) : !hasMessages ? (
          <div className={b.welcomeContainer}>
            <div className={b.greetingTitle}>
              {ui("Olá")} {user?.name?.split(" ")[0] || ui("usuário")}, {ui("como posso te ajudar?")}
            </div>
            <div className={b.welcomeComposerBlock}>
              {renderInputBox()}
              {renderQuickActionsPanel()}
            </div>
          </div>
        ) : (
          <div className={b.chatContainer}>
            <div className={b.messagesArea}>
              {messages.map((msg, i) => (
                <div key={i} className={`${b.messageRow} ${msg.role === "user" ? b.messageRowUser : b.messageRowAssistant}`}>
                  {msg.role === "assistant" ? (
                    <div className={b.messageLabelAssistant}>Brain</div>
                  ) : null}
                  {msg.role === "assistant" && msg.toolCalls?.length > 0 && (
                    <div style={{ marginBottom: 4 }}>{msg.toolCalls.map((tc, j) => (<span key={j} className={b.toolBadge}><Zap size={8} /> {toolNameMap[tc] || tc}</span>))}</div>
                  )}
                  {msg.role === "user" ? (
                    <div className={b.messageRowUserInner}>
                      <div className={b.messageUserHeader}>
                        <span className={b.messageLabelUser}>Você</span>
                        <div className={b.messageUserActions}>
                          <BrainTooltip title="Editar e reenviar">
                            <button
                              type="button"
                              className={b.messageActionBtn}
                              onClick={() => handleEditUserMessage(i)}
                              disabled={loading}
                            >
                              <Pencil size={11} />
                            </button>
                          </BrainTooltip>
                        </div>
                      </div>
                      <div className={b.messageContentUser}>
                        <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {msg.codeSnapshot ? (
                        <BrainLiveCodePanel
                          liveCode={msg.codeSnapshot}
                          historical
                          onOpenIdeBuild={() => openIdeBuildFromSnapshot(msg.codeSnapshot)}
                        />
                      ) : null}
                      {msg.content ? (
                        <div className={b.messageContentAssistant}>
                          <div dangerouslySetInnerHTML={{ __html: marked.parse(msg.content || "", { breaks: true }) }} />
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              ))}
              {showLiveCodeStack ? (
                <div className={b.messageRow}>
                  <BrainLiveCodePanel
                    liveCode={liveCode}
                    onSelectPath={liveCode.selectPath}
                    onOpenIdeBuild={() =>
                      openIdeBuildFromSnapshot(buildBrainCodeSnapshot(liveCode))
                    }
                  />
                </div>
              ) : null}
              {loading && !showLiveCodeStack ? (
                <div className={`${b.messageRow} ${b.messageRowAssistant}`}>
                  <div className={b.messageLabelAssistant}>Brain</div>
                  <div className={b.workingBar}>
                    <div className={b.typingIndicator} style={{ margin: 0 }}><span /><span /><span /></div>
                  </div>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>
            <div className={`${b.bottomInput}${attachMenuOpen ? ` ${b.bottomInputMenuOpen}` : ""}`}>
              {renderInputBox(true)}
            </div>
          </div>
        )}
      </div>

      <BrainVoiceIntroDialog
        open={voiceIntroDialogOpen}
        onClose={() => setVoiceIntroDialogOpen(false)}
        onContinue={proceedAfterVoiceIntro}
      />

      <BrainVoiceGenderDialog
        open={voiceGenderDialogOpen}
        onClose={() => setVoiceGenderDialogOpen(false)}
        onSelect={handleVoiceGenderSelect}
      />

      <BrainMcpDialog
        open={mcpDialogOpen}
        onClose={() => setMcpDialogOpen(false)}
        selectedMcps={selectedMcps}
        onSave={handleSaveMcps}
      />

      {modelPickerOpen && modelPickerPos
        ? ReactDOM.createPortal(
            <div
              id="brain-model-picker-dropdown"
              className={`${b.modelPickerDropdown}${
                modelPickerPos.compact ? " brain-shell__model-picker--compact" : ""
              }`}
              style={{
                top: modelPickerPos.top,
                left: modelPickerPos.left,
                width: modelPickerPos.compact ? 220 : undefined,
                maxHeight: modelPickerPos.maxHeight || 320,
                transform: modelPickerPos.placement === "above" ? "translateY(-100%)" : undefined,
              }}
            >
              {renderModelPickerMenu()}
            </div>,
            document.body
          )
        : null}

      {/* Menus — idioma via DropdownMenu no composer */}

      {/* File Modal */}
      <Sheet open={fileModalOpen} onOpenChange={setFileModalOpen}>
        <SheetContent side="right" className={b.fileModal} showClose={false}>
        <div className={b.fileModalHeader}>
          <div className={b.fileModalTitle}>
            {generatedFile && getFileIcon(generatedFile.type)}
            {generatedFile?.title || "Arquivo"}
            <Badge size="sm">{generatedFile?.type?.toUpperCase()}</Badge>
          </div>
          <button type="button" className={b.iconBtnPlain} onClick={() => setFileModalOpen(false)}><X size={14} /></button>
        </div>
        <div className={b.fileModalContent}>
          {generatedFile?.type === "json" && <pre className={b.fileModalPre}>{(() => { try { return JSON.stringify(JSON.parse(generatedFile.content), null, 2); } catch { return generatedFile.content || "{}"; } })()}</pre>}
          {generatedFile?.type === "excel" && (
            <div style={{ overflowX: "auto" }}>
              <table className={b.fileModalTable}>
                {generatedFile.columns?.length > 0 && <thead><tr>{generatedFile.columns.map((col, i) => <th key={i}>{col}</th>)}</tr></thead>}
                <tbody>
                  {(generatedFile.rows || []).map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}
                  {(!generatedFile.rows || generatedFile.rows.length === 0) && <tr><td colSpan={generatedFile.columns?.length || 1} className={b.sidebarEmpty}>{generatedFile.content || "Sem dados"}</td></tr>}
                </tbody>
              </table>
            </div>
          )}
          {generatedFile?.type === "pdf" && <div className={b.fileModalPre} style={{ whiteSpace: "pre-wrap" }}>{generatedFile.content || "Documento vazio"}</div>}
          {generatedFile?.type === "presentation" && (
            <div>
              {(generatedFile.slides || []).map((s, i) => (
                <div key={i} style={{ marginBottom: 16, padding: 16, borderRadius: 8, background: isDark ? "rgba(255,255,255,0.03)" : "#f8f9fa", border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb"}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: ACCENT }}>Slide {i + 1}: {s.title}</div>
                  <div style={{ fontSize: 12, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: s.content || "" }} />
                </div>
              ))}
              {(!generatedFile.slides || generatedFile.slides.length === 0) && <div className={b.fileModalPre} style={{ whiteSpace: "pre-wrap" }}>{generatedFile.content || "Apresentação vazia"}</div>}
            </div>
          )}
          {generatedFile?.type === "image" && (
            <div style={{ textAlign: "center", padding: 16 }}>
              <div dangerouslySetInnerHTML={{ __html: generatedFile.content || "" }} style={{ maxWidth: "100%", display: "inline-block" }} />
            </div>
          )}
          {generatedFile?.type === "png" && (
            <div style={{ textAlign: "center", padding: 16 }}>
              <img
                alt={generatedFile.title || "Protótipo"}
                src={
                  String(generatedFile.content || "").startsWith("data:")
                    ? generatedFile.content
                    : `data:image/png;base64,${generatedFile.content || ""}`
                }
                style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
              />
            </div>
          )}
          {(generatedFile?.type === "prototype_html" ||
            generatedFile?.type === "prototype_package") && (
            <div style={{ padding: 8, height: "min(72vh, 720px)" }}>
              <iframe
                title={generatedFile.title || "Protótipo navegável"}
                srcDoc={generatedFile.content || ""}
                sandbox="allow-scripts allow-same-origin"
                style={{ width: "100%", height: "100%", border: "none", borderRadius: 12, background: "#111" }}
              />
            </div>
          )}
          {generatedFile?.type === "prototype_package" &&
            Array.isArray(generatedFile.exports) &&
            generatedFile.exports.length > 0 && (
            <div style={{ padding: "0 12px 12px", display: "flex", flexWrap: "wrap", gap: 8 }}>
              {generatedFile.exports.map((exp) => (
                <button
                  key={`${exp.format}-${exp.fileName}`}
                  type="button"
                  className={b.downloadBtn}
                  onClick={() => {
                    if (exp.format === "png" || exp.format === "pdf") {
                      downloadDataUrl(exp.content, exp.fileName);
                    } else if (exp.format === "svg") {
                      const blob = new Blob([exp.content || ""], { type: "image/svg+xml" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = exp.fileName;
                      a.click();
                      URL.revokeObjectURL(url);
                    }
                  }}
                >
                  <Download size={12} /> {exp.label || exp.fileName}
                </button>
              ))}
            </div>
          )}
          {generatedFile?.type === "figma_handoff" && (
            <div style={{ padding: 16, fontSize: 13, lineHeight: 1.6 }}>
              <p style={{ margin: "0 0 12px" }}>
                O pacote foi preparado para importação manual no Figma (a API não cria arquivos .fig automaticamente).
              </p>
              {generatedFile.driveHtmlLink ? (
                <p style={{ margin: "0 0 8px" }}>
                  <a href={generatedFile.driveHtmlLink} target="_blank" rel="noopener noreferrer">
                    Abrir HTML no Google Drive →
                  </a>
                </p>
              ) : null}
              {generatedFile.driveReadmeLink ? (
                <p style={{ margin: "0 0 8px" }}>
                  <a href={generatedFile.driveReadmeLink} target="_blank" rel="noopener noreferrer">
                    Guia de importação (Drive) →
                  </a>
                </p>
              ) : null}
              {generatedFile.figmaNewFileUrl ? (
                <p style={{ margin: "0 0 12px" }}>
                  <a href={generatedFile.figmaNewFileUrl} target="_blank" rel="noopener noreferrer">
                    Abrir Figma →
                  </a>
                </p>
              ) : null}
              {Array.isArray(generatedFile.steps) && generatedFile.steps.length > 0 ? (
                <ol style={{ margin: 0, paddingLeft: 20 }}>
                  {generatedFile.steps.map((step, i) => (
                    <li key={i} style={{ marginBottom: 6 }}>{step}</li>
                  ))}
                </ol>
              ) : null}
            </div>
          )}
          {generatedFile?.type === "figma_prototype" && (
            <div style={{ padding: 8 }}>
              {generatedFile.embedUrl ? (
                <iframe
                  title={generatedFile.title || "Figma"}
                  src={generatedFile.embedUrl}
                  allowFullScreen
                  style={{ width: "100%", height: "min(68vh, 640px)", border: "none", borderRadius: 12, background: "#111" }}
                />
              ) : null}
              {generatedFile.prototypeUrl ? (
                <div style={{ marginTop: 12, fontSize: 13 }}>
                  <a href={generatedFile.prototypeUrl} target="_blank" rel="noopener noreferrer">
                    Abrir protótipo navegável no Figma →
                  </a>
                </div>
              ) : null}
            </div>
          )}
        </div>
        <div className={b.fileModalFooter}>
          {(generatedFile?.type === "prototype_html" ||
            generatedFile?.type === "prototype_package") && (
            <>
              <button
                type="button"
                className={b.downloadBtn}
                style={{ marginRight: 8 }}
                onClick={() => {
                  const w = window.open("", "_blank");
                  if (w) {
                    w.document.write(generatedFile.content || "");
                    w.document.close();
                  }
                }}
              >
                Abrir em nova aba
              </button>
              <button
                type="button"
                className={b.downloadBtn}
                style={{ marginRight: 8 }}
                onClick={() =>
                  exportHtmlAsPdfInBrowser(
                    generatedFile.content,
                    generatedFile.title
                  )
                }
              >
                Exportar PDF (navegador)
              </button>
            </>
          )}
          <button className={b.downloadBtn} onClick={() => downloadGeneratedFile(generatedFile)}><Download size={12} /> Baixar</button>
        </div>
        </SheetContent>
      </Sheet>

      {/* Attachments Library Modal */}
      <Sheet open={libraryOpen} onOpenChange={setLibraryOpen}>
        <SheetContent side="right" className={b.libraryModal} showClose={false}>
        <div className={b.fileModalHeader}>
          <div className={b.fileModalTitle}>
            <BookOpen size={14} />
            Biblioteca de Anexos
            <Badge size="sm">{conversationAttachments.length}</Badge>
          </div>
          <button type="button" className={b.iconBtnPlain} onClick={() => setLibraryOpen(false)}><X size={14} /></button>
        </div>
        <div className={b.fileModalContent}>
          {conversationAttachments.length === 0 ? (
            <div className={b.libraryEmpty}>
              <BookOpen size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
              <div>Nenhum anexo nesta conversa</div>
            </div>
          ) : (
            <>
              {conversationAttachments.filter(a => a.source === "brain").length > 0 && (
                <>
                  <div className={b.librarySection}>Gerados pelo Brain.AI</div>
                  {conversationAttachments.filter(a => a.source === "brain").map((att, i) => (
                    <div key={`brain-${i}`} className={b.libraryItem} onClick={() => {
                      if (!att.fileData) return;
                      const idePayload = toIdeBuildPayload(att.fileData);
                      if (idePayload) {
                        setCodeStudioIncoming(idePayload);
                        setIdeStudioOpen(true);
                        setBrainMainView("ide");
                        setLibraryOpen(false);
                        return;
                      }
                      if (att.fileData.type === "code_workspace" && Array.isArray(att.fileData.files)) {
                        setCodeStudioIncoming({ files: att.fileData.files, title: att.fileData.title });
                        setIdeStudioOpen(true);
                        setBrainMainView("ide");
                        setLibraryOpen(false);
                        return;
                      }
                      setGeneratedFile(att.fileData);
                      setFileModalOpen(true);
                      setLibraryOpen(false);
                    }}>
                      <div className={b.libraryItemIcon}>{getFileIcon(att.type)}</div>
                      <div className={b.libraryItemInfo}>
                        <div className={b.libraryItemTitle}>{att.name}</div>
                        <div className={b.libraryItemMeta}>
                          {att.type?.toUpperCase()} &middot; {new Date(att.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <BrainTooltip title="Baixar"><button className={b.iconBtn} onClick={(e) => { e.stopPropagation(); if (att.fileData) downloadGeneratedFile(att.fileData); }}><Download size={12} /></button></BrainTooltip>
                    </div>
                  ))}
                </>
              )}
              {conversationAttachments.filter(a => a.source === "user").length > 0 && (
                <>
                  <div className={b.librarySection}>Enviados por você</div>
                  {conversationAttachments.filter(a => a.source === "user").map((att, i) => (
                    <div key={`user-${i}`} className={b.libraryItem}>
                      <div className={b.libraryItemIcon}><FileText size={14} /></div>
                      <div className={b.libraryItemInfo}>
                        <div className={b.libraryItemTitle}>{att.name}</div>
                        <div className={b.libraryItemMeta}>
                          {att.size ? `${Math.round(att.size / 1024)}KB` : "Anexo"} &middot; {new Date(att.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
        </SheetContent>
      </Sheet>

      <BrainProjectPicker
        open={projectPickerOpen}
        onClose={() => setProjectPickerOpen(false)}
        projects={brainProjects}
        activeProjectId={brainActiveProject?.id}
        onSelect={async (id) => {
          await selectBrainProject(id);
          await loadProjects();
        }}
        onCreate={async (payload) => {
          const created = await createBrainProject(payload);
          await loadProjects();
          return created;
        }}
      />
    </div>
    </TooltipProvider>
  );
}
