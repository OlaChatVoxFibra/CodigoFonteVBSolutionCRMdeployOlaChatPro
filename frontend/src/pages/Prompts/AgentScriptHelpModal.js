/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Button,
  Snackbar
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import CloseIcon from "@material-ui/icons/Close";
import FileCopyOutlined from "@material-ui/icons/FileCopyOutlined";

const useStyles = makeStyles((theme) => ({
  paper: {
    borderRadius: 14,
    overflow: "hidden",
    maxWidth: 520,
    margin: theme.spacing(2),
    boxShadow:
      theme.palette.type === "dark"
        ? "0 24px 80px rgba(0,0,0,0.55)"
        : "0 24px 80px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.08)"
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing(2, 2, 1, 2.5),
    borderBottom:
      theme.palette.type === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)"
  },
  title: {
    fontWeight: 600,
    fontSize: "1.05rem",
    letterSpacing: "-0.02em"
  },
  body: {
    padding: theme.spacing(2, 2.5, 2.5),
    maxHeight: "min(72vh, 640px)",
    overflowY: "auto",
    ...theme.scrollbarStyles
  },
  section: {
    marginBottom: theme.spacing(2)
  },
  sectionTitle: {
    fontWeight: 600,
    fontSize: "0.8125rem",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(0.75)
  },
  paragraph: {
    fontSize: "0.9375rem",
    lineHeight: 1.55,
    color: theme.palette.text.secondary
  },
  chatgptPaper: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(1.5),
    borderRadius: 10,
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    border:
      theme.palette.type === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)"
  },
  chatgptPre: {
    margin: 0,
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: "0.72rem",
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    color: theme.palette.text.primary,
    maxHeight: "min(48vh, 420px)",
    overflow: "auto",
    ...theme.scrollbarStyles
  },
  copyBtn: {
    textTransform: "none",
    borderRadius: 10,
    marginTop: theme.spacing(1)
  }
}));

/** Texto para colar no ChatGPT (ou similar) e gerar roteiros compatíveis com o agente VB Solution. */
export const CHATGPT_SCRIPT_GENERATION_BRIEFING = `Você é especialista em roteiros de atendimento por mensagens para a plataforma VB Solution.

TAREFA: Escrever um roteiro em português (Brasil) para um agente de IA conduzir conversas. O sistema VB interpreta o texto por significado, separa etapas por marcadores e sincroniza com o fluxo visual (perguntas aguardam resposta antes de avançar).

REGRAS DE ESTRUTURA (obrigatório):
1) Cada NOVA ETAPA começa em uma linha própria com UM destes formatos:
   - Linha contendo apenas: ---
   - OU linha com # marcando etapa, por exemplo:
     # ETAPA 1 — Boas-vindas
     # PASSO: Qualificação
     # PRÓXIMA ETAPA
     # 1. Saudação
     # 2) Coleta de dados

2) Dentro da mesma etapa, parágrafos e linhas em branco à vontade — isso NÃO cria etapa nova.

3) Condições sem IF/ELSE técnico. Use:
   - EXEMPLO DE RESPOSTA DO LEAD: (aspas ou texto de exemplo) — isso é SÓ ilustração de FORMATO (como o cliente pode escrever), não uma frase obrigatória nem a única resposta válida; na vida real ele pode dizer “dia 31/05”, “final de julho”, etc.
   - Cenários em linguagem natural (“se o cliente disser sim…”, “se preferir não…”)
   - Sim/não no texto corrido

4) Opcional: blocos Mensagem: (fala ao cliente) e, após exemplos do lead, RESPOSTA: (fala do agente naquele ramo — também é modelo do autor, não texto fixo que o sistema exige do cliente).

5) Ações automáticas: linha isolada com /slug (ex.: /agendamento). Não invente slugs — o operador cadastra em “Ações inteligentes”.

COMPORTAMENTO NA CONVERSA REAL (obrigatório — o VB aplica isto):
- Uma coisa principal por envio ao cliente: não condense várias etapas em uma única mensagem.
- SEQUÊNCIA PERGUNTA → RESPOSTA DO CLIENTE → PRÓXIMO CONTEÚDO:
  • Se o agente faz uma pergunta ou pede um dado (data, quantidade, escolha), qualquer texto que dependa dessa resposta deve ficar na ETAPA SEGUINTE ou no ramo RESPOSTA: depois do EXEMPLO DO LEAD correspondente — nunca na mesma mensagem da pergunta.
  • Não escreva na mesma mensagem em que há pergunta frases que assumam que o cliente já respondeu (ex.: “Perfeito, vou verificar as opções para esse período” antes de ele informar a data).
  • Depois de pedir informação, confirmações, ofertas e linhas /comando vêm só quando fizer sentido após o cliente ter respondido — separe em etapa ou ramo RESPOSTA:.
- Comandos /slug no fim de etapa costumam executar após o cliente cumprir o pedido da etapa (ex.: data para /agendamento); posicione o comando na etapa correta (idealmente após EXEMPLO… / RESPOSTA: no mesmo passo, antes do --- da próxima etapa).

MAPA DE CORREÇÕES (sintomas frequentes):
- Cliente enviou data/período na etapa certa mas NÃO apareceu evento em Agendas/Schedules: (1) confirme “Ação inteligente” com tipo/slug compatível com /agendamento; (2) teste pelo canal de mensagens — o fluxo que agenda após a resposta do cliente roda no pipeline de mensagem recebida do atendimento; o chat interno do ticket no painel pode avançar o roteiro pela IA sem executar essa mesma etapa de ação.
- “EXEMPLO DE RESPOSTA” não é a resposta exata que o agente “espera” do cliente — é exemplo de formato; respostas diferentes no mesmo sentido devem contar.

Saída: apenas o roteiro, sem prefácio nem explicações fora do texto que o operador colará no editor VB.`;

export default function AgentScriptHelpModal({ open, onClose }) {
  const classes = useStyles();
  const [snack, setSnack] = useState(false);

  const copyBriefing = useCallback(() => {
    const t = CHATGPT_SCRIPT_GENERATION_BRIEFING;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(() => setSnack(true));
    }
  }, []);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        classes={{ paper: classes.paper }}
        BackdropProps={{
          style: { backdropFilter: "blur(8px)", backgroundColor: "rgba(0,0,0,0.35)" }
        }}
      >
        <div className={classes.titleRow}>
          <Typography component="h2" className={classes.title}>
            Roteiro (?) — guia e ChatGPT
          </Typography>
          <IconButton aria-label="Fechar" size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>
        <DialogContent className={classes.body}>
          <Box className={classes.section}>
            <Typography className={classes.sectionTitle}>Etapas no fluxo</Typography>
            <Typography className={classes.paragraph} component="div">
              O painel monta o fluxo a partir de <strong>marcadores explícitos</strong>: linha só com{" "}
              <strong>---</strong> ou linhas <strong>#</strong> que indiquem etapa — por exemplo{" "}
              <strong># ETAPA 2</strong>, <strong># PASSO</strong>, <strong># PRÓXIMA ETAPA</strong>,{" "}
              <strong># 1. Título da fase</strong>. Espaços entre parágrafos{" "}
              <strong>não</strong> criam etapa nova.
            </Typography>
          </Box>
          <Box className={classes.section}>
            <Typography className={classes.sectionTitle}>Condições e exemplos</Typography>
            <Typography className={classes.paragraph} component="div">
              Ramificações podem ser só <strong>exemplos de fala do cliente</strong>,{" "}
              <strong>sim/não</strong> em texto corrido ou blocos &quot;EXEMPLO DE RESPOSTA DO LEAD&quot;.{" "}
              <strong>Importante:</strong> esse bloco é <strong>ilustração de formato</strong> (como o lead
              pode responder), não uma frase obrigatória — na conversa real vale qualquer resposta equivalente
              (ex.: &quot;dia 31/05&quot;, &quot;final de julho&quot;). O motor e a IA interpretam pelo{" "}
              <strong>significado</strong>, sem exigir que o cliente repita o exemplo palavra por palavra.
            </Typography>
          </Box>
          <Box className={classes.section}>
            <Typography className={classes.sectionTitle}>Mapa de correções (ações e agendas)</Typography>
            <Typography className={classes.paragraph} component="div">
              Se o cliente <strong>mandou a data na etapa certa</strong> e o fluxo <strong>avançou</strong> (ex.:
              para “quantas pessoas”) mas <strong>não criou evento</strong> em Agendas/Schedules, mesmo com{" "}
              <strong>/agendamento</strong> no roteiro: verifique se a ação existe em{" "}
              <strong>Ações inteligentes</strong> (tipo/slug alinhado ao comando) e se o teste foi pelo{" "}
              <strong>Canal de mensagens</strong> — a execução adiada de <strong>/agendamento</strong> após a resposta do
              cliente está ligada ao recebimento da mensagem no atendimento; o <strong>chat interno</strong> do
              ticket no painel pode reproduzir o texto do roteiro pela IA <strong>sem</strong> passar pela mesma
              etapa de criação em agendas.
            </Typography>
          </Box>
          <Box className={classes.section}>
            <Typography className={classes.sectionTitle}>Pergunta → resposta → próximo passo</Typography>
            <Typography className={classes.paragraph} component="div">
              Se o roteiro <strong>pergunta</strong> ou <strong>pede um dado</strong>, o VB marca que a próxima
              mensagem do cliente deve ser tratada como <strong>resposta</strong>. O conteúdo que só faz sentido{" "}
              <strong>depois</strong> dessa resposta (confirmação, “vou verificar…”, próxima pergunta, linha{" "}
              <strong>/comando</strong>) deve ficar na <strong>etapa seguinte</strong> ou no ramo{" "}
              <strong>RESPOSTA:</strong> após o exemplo do lead — não na mesma mensagem da pergunta.
            </Typography>
          </Box>
          <Box className={classes.section}>
            <Typography className={classes.sectionTitle}>Uma etapa por vez no atendimento</Typography>
            <Typography className={classes.paragraph} component="div">
              Cada envio cobre só o passo lógico atual: não despeje várias etapas de uma vez. A IA do atendimento
              recebe instruções do sistema para respeitar isso.
            </Typography>
          </Box>
          <Box className={classes.section}>
            <Typography className={classes.sectionTitle}>Gerar roteiro com IA externa</Typography>
            <Typography className={classes.paragraph} component="div" paragraph>
              Copie o bloco abaixo e cole no ChatGPT (ou outro assistente). Peça para adaptar ao seu negócio e
              colar o resultado no editor. Atalhos: botão <strong>?</strong>, <strong>F1</strong> na aba Roteiro, ou{" "}
              <strong>Ctrl+?</strong> com foco no campo do roteiro.
            </Typography>
            <div className={classes.chatgptPaper}>
              <pre className={classes.chatgptPre}>{CHATGPT_SCRIPT_GENERATION_BRIEFING}</pre>
            </div>
            <Button
              fullWidth
              variant="outlined"
              className={classes.copyBtn}
              startIcon={<FileCopyOutlined />}
              onClick={copyBriefing}
            >
              Copiar instruções para o ChatGPT
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
      <Snackbar
        open={snack}
        autoHideDuration={2200}
        onClose={() => setSnack(false)}
        message="Copiado para a área de transferência"
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </>
  );
}
