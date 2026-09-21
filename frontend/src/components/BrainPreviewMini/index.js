/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useMemo, useState } from "react";
import useScheduleTranslateWhen from "../../hooks/useScheduleTranslateWhen";
import { useIsMobile } from "../../hooks/useMediaQueryBrain";
import { X, ListTodo, Users, BarChart3, Target, FileText, FileSpreadsheet, TrendingUp, UserPlus, ClipboardList, FolderKanban, MessageSquare, Link2, PieChart } from "lucide-react";
import AiBrain from "../../pages/AiBrain";
import logoBrainAi from "../../assets/logo_brain_ai.png";
import { resolveBrainPageContext } from "../../utils/brainPageContext";
import { Sheet, SheetContent } from "../ui/sheet";

const BrainFlowerMini = ({ size = 20 }) => (
  <img src={logoBrainAi} alt="" style={{ width: size, height: size, objectFit: "contain" }} />
);

export { BrainFlowerMini };

const CONTEXT_SUGGESTIONS = {
  leads: [
    { icon: UserPlus, title: "Criar lead de venda", prompt: "Quero criar um novo lead de venda. Me pergunte nome, produto, origem e prioridade." },
    { icon: BarChart3, title: "Analisar leads", prompt: "Me dê uma análise completa dos meus leads de venda: total, novos, em andamento, ganhos e perdidos." },
    { icon: FileSpreadsheet, title: "Exportar leads", prompt: "Exporte a lista de leads de venda do CRM para um arquivo Excel." },
    { icon: TrendingUp, title: "Resumo de vendas", prompt: "Me dê um resumo do funil de vendas com leads, conversões, valores e oportunidades em aberto." },
  ],
  atividades: [
    { icon: ListTodo, title: "Criar atividade", prompt: "Crie uma nova atividade para hoje. Me pergunte o título e tipo." },
    { icon: ClipboardList, title: "Pendentes", prompt: "Liste todas as minhas atividades pendentes e atrasadas com detalhes." },
    { icon: BarChart3, title: "Analisar atividades", prompt: "Me dê uma análise das minhas atividades: concluídas, pendentes, atrasadas e produtividade." },
    { icon: FileText, title: "Relatório", prompt: "Gere um relatório em PDF das atividades dos últimos 30 dias." },
  ],
  contatos: [
    { icon: UserPlus, title: "Novo contato", prompt: "Quero criar um novo contato no CRM. Me pergunte os dados necessários." },
    { icon: Users, title: "Listar contatos", prompt: "Liste os últimos 20 contatos cadastrados no CRM." },
    { icon: FileSpreadsheet, title: "Exportar contatos", prompt: "Exporte a lista de contatos do CRM para um arquivo Excel." },
    { icon: BarChart3, title: "Análise", prompt: "Me dê uma análise dos meus contatos: total, crescimento e distribuição." },
  ],
  projetos: [
    { icon: FolderKanban, title: "Listar projetos", prompt: "Liste todos os projetos do CRM com seus status atuais." },
    { icon: BarChart3, title: "Analisar projetos", prompt: "Me dê uma análise dos projetos: em andamento, concluídos, atrasados." },
    { icon: FileText, title: "Relatório", prompt: "Gere um relatório em PDF com o status de todos os projetos." },
    { icon: Target, title: "Resumo geral", prompt: "Me dê um resumo completo do CRM: contatos, tickets, atividades, leads e projetos." },
  ],
  tickets: [
    { icon: MessageSquare, title: "Tickets abertos", prompt: "Liste todos os tickets/atendimentos abertos e pendentes." },
    { icon: BarChart3, title: "Análise", prompt: "Me dê uma análise dos atendimentos: abertos, pendentes, tempo médio de resposta." },
    { icon: PieChart, title: "Dashboard", prompt: "Me dê os dados do dashboard de atendimento dos últimos 30 dias com insights." },
    { icon: FileText, title: "Relatório", prompt: "Gere um relatório em PDF dos atendimentos dos últimos 30 dias." },
  ],
  conexoes: [
    { icon: Link2, title: "Listar conexões", prompt: "Liste todas as conexões/canais configurados no CRM e seus status." },
    { icon: MessageSquare, title: "Criar conexão WhatsApp", prompt: "Quero criar uma nova conexão WhatsApp no CRM." },
    { icon: Target, title: "Criar conexão Telegram", prompt: "Quero criar uma nova conexão Telegram. Me pergunte o Bot Token." },
    { icon: BarChart3, title: "Status geral", prompt: "Me dê um resumo de todas as conexões: ativas, desconectadas e canais." },
  ],
  metaTemplates: [
    {
      icon: MessageSquare,
      title: "Enviar Template Meta",
      prompt:
        "Quero enviar um Template Meta (WhatsApp API Oficial) via campanha. Oriente: 1) selecionar conexão oficial, 2) escolher template(s) sincronizados APPROVED, 3) escolher contatos/destinatários, 4) agendar ou enviar agora.",
    },
    {
      icon: Link2,
      title: "Sincronizar templates",
      prompt:
        "Explique como sincronizar templates aprovados da Meta (WABA) na página Templates Meta e o que significa APPROVED, PENDING e REJECTED.",
    },
    {
      icon: Target,
      title: "Criar campanha Meta",
      prompt:
        "Quero criar uma campanha com Templates Meta validados. Peça nome da campanha, conexão oficial, templates e lista de destinatários.",
    },
    {
      icon: BarChart3,
      title: "Boas práticas Meta",
      prompt:
        "Resuma boas práticas de disparo com templates WhatsApp API Oficial: janela 24h, qualidade da conta, variáveis {{1}} e aprovação Meta.",
    },
  ],
  dashboard: [
    { icon: BarChart3, title: "Análise completa", prompt: "Me dê uma análise completa dos dados do meu dashboard dos últimos 30 dias com insights e recomendações." },
    { icon: PieChart, title: "Métricas", prompt: "Quais são as principais métricas do meu CRM hoje? Tickets, contatos, leads e atividades." },
    { icon: FileText, title: "Gerar relatório", prompt: "Gere um relatório em PDF com os dados do dashboard dos últimos 30 dias." },
    { icon: Target, title: "Resumo geral", prompt: "Me dê um resumo completo do meu CRM: total de contatos, tickets abertos, atividades pendentes, leads e projetos." },
  ],
  general: [
    { icon: ListTodo, title: "Criar atividade", prompt: "Crie uma nova atividade para hoje com o título 'Follow-up com cliente' do tipo follow_up" },
    { icon: Users, title: "Novo contato", prompt: "Quero criar um novo contato no CRM. Me pergunte os dados necessários." },
    { icon: BarChart3, title: "Análise de dados", prompt: "Me dê uma análise completa dos dados do meu dashboard dos últimos 30 dias com insights e recomendações." },
    { icon: Target, title: "Resumo geral", prompt: "Me dê um resumo completo do meu CRM: total de contatos, tickets abertos, atividades pendentes, leads e projetos." },
  ],
};

function resolveContext(context) {
  return resolveBrainPageContext(context);
}

const BrainPreviewMini = ({ context, iconSize = 32 }) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  useScheduleTranslateWhen(open);

  const contextKey = resolveContext(context);
  const suggestions = useMemo(
    () => CONTEXT_SUGGESTIONS[contextKey] || CONTEXT_SUGGESTIONS.general,
    [contextKey]
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Brain.AI"
        className="brain-preview-mini__trigger"
      >
        <BrainFlowerMini size={iconSize} />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          showClose={false}
          className={isMobile ? "w-full max-w-full" : "w-[460px] max-w-[calc(100vw-24px)] m-3 h-[calc(100%-24px)] rounded-2xl border brain-shell"}
        >
          <div className="brain-preview-mini__header">
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <BrainFlowerMini size={22} />
              <span className="brain-preview-mini__title">Brain.AI</span>
            </div>
            <button type="button" className="brain-voice__icon-btn" onClick={() => setOpen(false)}>
              <X size={14} />
            </button>
          </div>
          <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
            <AiBrain
              embedded
              onClose={() => setOpen(false)}
              contextSuggestions={suggestions}
              pageContext={context}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default BrainPreviewMini;
