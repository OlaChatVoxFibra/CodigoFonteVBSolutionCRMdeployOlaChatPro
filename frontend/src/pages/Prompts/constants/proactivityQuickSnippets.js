/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Botões rápidos para preencher objetivo e tom por tipo de fluxo (proatividade).
 * Cada item: { label, text } — o texto é acrescentado ao campo existente.
 */

export const QUICK_OBJECTIVES = {
  follow_up: [
    { label: "Retomar sem pressão", text: "Conseguir uma resposta amigável, sem cobrar." },
    { label: "Confirmar interesse", text: "Validar se ainda faz sentido continuar a conversa." },
    { label: "Oferecer material", text: "Enviar ou relembrar PDF/link útil alinhado ao que já falaram." },
    { label: "Marcar próximo passo", text: "Combinar data para ligação breve ou demo." }
  ],
  hot_lead: [
    { label: "Fechar próximo passo", text: "Levar para proposta, demo ou pagamento conforme o caso." },
    { label: "Qualificar rápido", text: "Confirmar necessidade, orçamento e prazo em poucas perguntas." },
    { label: "Enviar valores", text: "Apresentar condições claras e pedir confirmação." },
    { label: "Agendar humano", text: "Transferir ou marcar falar com consultor/vendedor." }
  ],
  reengagement: [
    { label: "Novo gancho", text: "Trazer novidade (produto, case, campanha) sem culpar o silêncio." },
    { label: "Última tentativa", text: "Mensagem honesta perguntando se ainda há interesse." },
    { label: "Oferta leve", text: "Relembrar benefício e convidar a retomar em uma linha." }
  ],
  cold_outreach: [
    { label: "Abrir diálogo", text: "Só gerar curiosidade e uma pergunta — sem pitch longo." },
    { label: "Dor do segmento", text: "Mencionar desafio comum do ramo e convidar a trocar ideia." },
    { label: "Prova social", text: "Citar que atende empresas parecidas, sem exagero." }
  ],
  inbound: [
    { label: "Qualificar", text: "Entender necessidade, prazo e orçamento em poucas perguntas." },
    { label: "Agendar", text: "Conduzir para marcar reunião ou demo com data sugerida." },
    { label: "Enviar link", text: "Apresentar solução e convidar a pagar ou acessar link oficial." },
    { label: "Suporte + upsell", text: "Resolver dúvida e, se couber, sugerir upgrade ou add-on." },
    { label: "Campanha → conversa", text: "Quem veio de disparo: reconhecer interesse e não parecer robô genérico." },
    { label: "Prova social", text: "Citar caso ou número sem exagerar; convidar a próximo passo." },
    { label: "Urgência leve", text: "Se houver prazo real (promoção/vaga), mencionar sem pressão falsa." },
    { label: "Descobrir orçamento", text: "Perguntar faixa de investimento ou tamanho do projeto com naturalidade." }
  ]
};

export const QUICK_TONES = {
  follow_up: [
    { label: "Sem cobrança", text: "Nunca usar tom de cobrança, culpa ou urgência falsa." },
    { label: "Uma pergunta", text: "Terminar com uma pergunta aberta simples." },
    { label: "Sem repetir", text: "Não repetir a mesma frase do último envio." },
    { label: "Tom humano", text: "Linguagem natural; evitar jargões e textos longos." }
  ],
  hot_lead: [
    { label: "Claro e direto", text: "Ser objetivo em valor e próximo passo, sem enrolação." },
    { label: "Sem promessa vaga", text: "Evitar 'melhor solução do mercado' sem contexto." },
    { label: "Respeitar opt-out", text: "Se o cliente recusar, aceitar sem insistência extra." }
  ],
  reengagement: [
    { label: "Sem culpar", text: "Não dizer que o cliente 'sumiu' ou 'não respondeu'." },
    { label: "Ângulo novo", text: "Trazer informação diferente da última mensagem." }
  ],
  cold_outreach: [
    { label: "Sem venda na 1ª linha", text: "Não abrir com preço ou pedido de compra." },
    { label: "Curto", text: "Máximo de poucas linhas na primeira mensagem." },
    { label: "LGPD", text: "Não afirmar dados que não tem; permitir sair da lista se pedir." }
  ],
  inbound: [
    { label: "Alinhar ao Cargo", text: "Manter o tom da aba Cargo; não contradizer identidade do agente." },
    { label: "Uma pergunta por vez", text: "Evitar lista longa de perguntas na mesma mensagem." },
    { label: "CTA claro", text: "Encerrar com próximo passo único (link, horário ou confirmação)." },
    { label: "Mensagens curtas", text: "Blocos curtos; evitar texto longo na primeira resposta após campanha." },
    { label: "Não inventar preço", text: "Preço e condições só com base em links ou Cargo; senão, qualificar e encaminhar." },
    { label: "Confirmação antes de anexar", text: "Antes de prometer arquivo, confirmar interesse ou dúvida do cliente." }
  ]
};

export const FOLLOWUP_VACUO_CHIPS = [
  { label: "Lembrete suave", text: "Tom de lembrete curto, sem cobrar." },
  { label: "Perguntar se viu", text: "Pergunte se chegou a ver a última mensagem." },
  { label: "Uma pergunta", text: "Uma pergunta objetiva para retomar o diálogo." },
  { label: "Valor em 1 linha", text: "Relembrar benefício ou próximo passo em uma linha." },
  { label: "Sem culpa", text: "Não dizer que a pessoa não respondeu ou sumiu." }
];

export const FOLLOWUP_CLIENTE_CHIPS = [
  { label: "Utilidade", text: "Ofereça algo útil (link, resposta, próximo passo) em uma linha." },
  { label: "Sem culpa", text: "Não diga que a pessoa sumiu ou demorou." },
  { label: "CTA único", text: "Um único próximo passo claro (horário, link ou confirmação)." },
  { label: "Retomar fio", text: "Mencionar o último ponto que o cliente falou em uma frase." },
  { label: "Duas opções", text: "Oferecer duas opções de horário ou dois próximos passos simples." }
];

export const INBOUND_SALES_PRESETS = [
  { label: "Vender", text: "Qualificar necessidade e conduzir para compra ou proposta." },
  { label: "Agendar", text: "Marcar reunião ou demo com duas opções de horário quando couber." },
  { label: "Link de pagamento", text: "Quando fizer sentido, enviar link oficial de pagamento com clareza." },
  { label: "Apresentar valor", text: "Em 1–2 frases: o que resolve, para quem e diferencial — depois pergunta de fit." },
  { label: "Não espelhar cliente", text: "Se o cliente for genérico ('como ajudo?'), não repetir o mesmo tom: assuma vendedor e avance com pergunta." },
  { label: "Objeções", text: "Ouvir objeção, validar em uma linha e responder com benefício ou próximo passo." }
];

export const INBOUND_ROTEIRO_CHIPS = [
  { label: "1) Saudação + nome", text: "1) Saudação curta com nome do cliente" },
  { label: "2) Pergunta fit", text: "2) Uma pergunta de qualificação (necessidade ou prazo)" },
  { label: "3) Oferta clara", text: "3) O que você oferece em uma frase" },
  { label: "4) CTA único", text: "4) Um próximo passo: link, horário ou confirmação" },
  { label: "5) Material sob pedido", text: "5) Só enviar PDF/catálogo se o cliente pedir ou após interesse" },
  { label: "6) Fechar ou agendar", text: "6) Se houver interesse real, fechar ou agendar com data" }
];

export const LINK_WHEN_CHIPS = [
  { label: "Pagamento", text: "cliente pedir valores, boleto ou checkout" },
  { label: "Site", text: "institucional ou landing para saber mais" },
  { label: "Agenda", text: "marcar horário ou reunião" },
  { label: "Contrato", text: "enviar documento ou assinatura" },
  { label: "Suporte", text: "dúvida pós-venda ou uso do produto" }
];

export function appendToField(prevText, snippetText, sep = "\n") {
  const p = String(prevText || "").trim();
  const s = String(snippetText || "").trim();
  if (!s) return p;
  if (!p) return s;
  return `${p}${sep}${s}`;
}
