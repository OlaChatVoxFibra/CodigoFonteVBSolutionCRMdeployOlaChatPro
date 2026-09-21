/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Modelo de roteiro para exportação. Novas etapas no fluxo visual:
 * - linha só com ---, ou
 * - linha # ETAPA / # PASSO / # PRÓXIMA ETAPA / # 1. Título / etc.
 * Condições: exemplos, sim/não ou EXEMPLO DE RESPOSTA — interpretação semântica.
 * Parágrafos em branco não criam etapa.
 * Pergunta ou pedido de dado → conteúdo que depende da resposta do cliente fica na etapa seguinte
 * ou em RESPOSTA: após o exemplo do lead — não na mesma mensagem da pergunta.
 */

export const AGENT_SCRIPT_PERFECT_TEMPLATE_FILENAME = "roteiro-modelo-vbsolution.txt";

export const AGENT_SCRIPT_PERFECT_TEMPLATE_BODY = `(Prefácio opcional — apague até a primeira # ETAPA se quiser só o fluxo)
Fluxo: cada etapa nova = linha --- OU linha # ETAPA / # PASSO / # 1. Título…
Condições: EXEMPLO DE RESPOSTA, sim/não em texto; sem IF/ELSE obrigatório.

# ETAPA 1 — Abertura
Mensagem:
Olá! Bom te ver por aqui 👋
Para eu direcionar melhor: você quer entender como funciona, ver condições comerciais, ou falar com alguém da equipe?
EXEMPLO DE RESPOSTA DO LEAD:
"Só quero entender o básico"
RESPOSTA:
Perfeito. Em uma frase: hoje você já usa algum CRM ou central de atendimento por mensagens?

# ETAPA 2 — Contexto
Mensagem:
Se já usa, me diz qual — assim comparo com o que entregamos.
Se ainda não usa, sem problema: o foco costuma ser histórico e resposta mais rápida num só lugar.
EXEMPLO DE RESPOSTA DO LEAD:
"Ainda não uso nada disso"
RESPOSTA:
Entendi. Quer que eu te explique um fluxo típico em linguagem bem direta (uns 2 minutos de leitura)?

# ETAPA 3 — Agendamento
Mensagem:
Se fizer sentido, marcamos uma demonstração curta (cerca de 15 minutos). Qual dia e horário costumam ser melhores para você?
EXEMPLO DE RESPOSTA DO LEAD:
"Pode ser quinta à tarde"
RESPOSTA:
Ótimo 👌 Anotado. Já te envio o link com data e hora.
/agendamento

# ETAPA 4 — Fechamento
Mensagem:
Qualquer dúvida antes da demo, é só responder aqui nesta conversa.
`;
