/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Typography
} from "@material-ui/core";

const mono = { fontFamily: "ui-monospace, Consolas, monospace", fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap" };

export default function ProactivityHelpDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="body">
      <DialogTitle>Proatividade enxuta — como usar</DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle2" style={{ fontWeight: 700, marginBottom: 8 }}>
          1. Visão geral
        </Typography>
        <Typography variant="body2" paragraph style={{ lineHeight: 1.65 }}>
          <b>Chat ao vivo</b>: quando o cliente escreve, a IA usa Cargo, Cérebro, <b>roteiro</b>, <b>objetivo</b> e{" "}
          <b>links com contexto</b> que você cadastrou. Opcionalmente o sistema busca um trecho público das páginas para
          enriquecer o prompt (não substitui o site).
        </Typography>
        <Typography variant="body2" paragraph style={{ lineHeight: 1.65 }}>
          <b>Follow-up automático</b>: um job (~1x ao dia, manhã SP) tenta retomar conversas sem resposta. O texto
          considera se a <b>última mensagem foi sua</b> (vácuo) ou do <b>cliente</b> (silêncio depois que ele falou).
        </Typography>

        <Typography variant="subtitle2" style={{ fontWeight: 700, marginTop: 16, marginBottom: 8 }}>
          2. Interruptor geral
        </Typography>
        <Typography variant="body2" paragraph style={{ lineHeight: 1.65 }}>
          Só o <b>follow-up automático</b> depende desse interruptor para executar. Salve sempre com{" "}
          <b>Salvar proatividade</b>. As configurações de chat ao vivo ficam gravadas mesmo com o geral desligado.
        </Typography>

        <Typography variant="subtitle2" style={{ fontWeight: 700, marginTop: 16, marginBottom: 8 }}>
          3. Fluxo sugerido (campanha → venda)
        </Typography>
        <Paper elevation={0} style={{ padding: 12, background: "#f1f8e9", border: "1px solid #c5e1a5" }}>
          <Typography component="div" style={mono}>
            {`Campanha (abre conversa)
   → Cliente responde
   → IA qualifica (roteiro + links)
   → Mídias após o texto (aba Mídias)
   → Se parar de responder → follow-up automático`}
          </Typography>
        </Paper>

        <Typography variant="subtitle2" style={{ fontWeight: 700, marginTop: 16, marginBottom: 8 }}>
          4. Links com contexto
        </Typography>
        <Typography variant="body2" paragraph style={{ lineHeight: 1.65 }}>
          Cada link tem <b>nome</b>, <b>URL</b> e <b>quando usar</b> (ex.: pagamento). A IA só deve enviar quando fizer
          sentido. A opção de buscar texto tenta ler a página (pode falhar em sites bloqueados).
        </Typography>

        <Typography variant="subtitle2" style={{ fontWeight: 700, marginTop: 16, marginBottom: 8 }}>
          5. Follow-up: vácuo x cliente falou por último
        </Typography>
        <Box component="ul" style={{ margin: "0 0 8px 1.1em", padding: 0 }}>
          <li style={{ marginBottom: 8 }}>
            <b>Vácuo</b>: a última mensagem com conteúdo foi <b>sua</b> (ou do bot). Tom sugerido: lembrete leve, “viu a
            mensagem?”.
          </li>
          <li>
            <b>Cliente falou por último</b>: ele mandou algo e depois silenciou. Tom sugerido: utilidade, próximo passo,
            sem culpar.
          </li>
        </Box>

        <Typography variant="subtitle2" style={{ fontWeight: 700, marginTop: 16, marginBottom: 8 }}>
          6. Aba Mídias
        </Typography>
        <Typography variant="body2" paragraph style={{ lineHeight: 1.65 }}>
          Só <b>resposta no chat</b>: após o texto da IA, envio de imagens, PDFs e vídeos em sequência. Use pausa e “não
          enviar se já mandei mídia”. Várias imagens = fila na mesma conversa.
        </Typography>

        <Divider style={{ margin: "16px 0" }} />

        <Typography variant="subtitle2" style={{ fontWeight: 700, marginBottom: 8 }}>
          7. Campanhas e tag
        </Typography>
        <Typography variant="body2" paragraph style={{ lineHeight: 1.65 }}>
          Com campanha que abre ticket, o contato pode ganhar tag <code>Campanha #&lt;id&gt;</code> e o ticket pode guardar{" "}
          <code>sourceCampaignId</code> para segmentação.
        </Typography>

        <Typography variant="subtitle2" style={{ fontWeight: 700, marginTop: 16, marginBottom: 8 }}>
          8. Checklist
        </Typography>
        <Box component="ol" style={{ margin: "0 0 0 1.1em", padding: 0 }}>
          <li style={{ marginBottom: 4 }}>API key na aba Integração (se não usar só texto fixo no follow-up).</li>
          <li style={{ marginBottom: 4 }}>Roteiro + links no chat ao vivo; mídias na aba Mídias.</li>
          <li style={{ marginBottom: 4 }}>Para follow-up rodar: interruptor geral ligado + Salvar.</li>
          <li>Filtrar follow-up por tag/lista só se fizer sentido.</li>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" variant="contained">
          Entendi
        </Button>
      </DialogActions>
    </Dialog>
  );
}
