/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** Documentação estratégica por página — intro + seções com bullets */

const doc = (title, intro, sections) => ({ title, intro, sections });

export const HELP_CONTENT = {
  dashboard: doc(
    "Dashboard",
    "Visão executiva do atendimento: volume, tempos, atendentes online e atividades do dia. Use para acompanhar a operação sem entrar em cada ticket.",
    [
      {
        title: "O que você vê nesta página",
        body: "Gráficos e cards resumem tickets abertos, fechados, tempo médio e desempenho por usuário. Atividades e projetos recentes aparecem em blocos laterais quando habilitados no plano.",
        bullets: [
          "Filtro de período: ajusta todos os indicadores do painel",
          "Atendentes: quem está online e carga de trabalho",
          "Exportação: disponível em alguns widgets para planilha",
        ],
      },
      {
        title: "Como usar no dia a dia",
        body: "Abra o Dashboard no início do turno para validar filas e conexões. Compare períodos (hoje vs. semana) para identificar picos.",
        bullets: [
          "Se números zerados: verifique Conexões (status CONECTADO) e Filas vinculadas",
          "Clique em atividades ou tickets listados para ir ao detalhe",
        ],
        tip: "Dashboard reflete dados reais só com WhatsApp conectado e equipe usando o sistema.",
      },
    ]
  ),

  tickets: doc(
    "Atendimentos (Tickets)",
    "Tela principal de conversas WhatsApp. À esquerda a fila de tickets; à direita o chat com o cliente. O botão ? fica na barra de busca, ao lado dos filtros.",
    [
      {
        title: "Layout da tela",
        bullets: [
          "Coluna esquerda: busca, abas (Em atendimento, Aguardando, Finalizado, Grupos)",
          "Lista de tickets: clique para abrir o chat",
          "Coluna direita: conversa, cabeçalho com ações e campo de mensagem",
          "Sem ticket selecionado: logo e mensagem de boas-vindas",
        ],
      },
      {
        title: "Abas de status",
        body: "Cada aba filtra tickets por situação no fluxo de atendimento.",
        bullets: [
          "Em atendimento: tickets que você ou a equipe já assumiu",
          "Aguardando: na fila, ainda sem atendente responsável",
          "Finalizado: histórico encerrado",
          "Grupos: conversas de grupo (se permitido no usuário/conexão)",
        ],
      },
      {
        title: "Busca e filtros",
        bullets: [
          "Campo de busca: nome ou número do contato",
          "Interruptor: incluir texto dentro das mensagens (busca mais lenta)",
          "Ícone de filtro: modal com filas, etiquetas, usuários, conexões e status",
        ],
      },
      {
        title: "Modal de filtros",
        bullets: [
          "Filas: limita quais listas aparecem",
          "Etiquetas: tickets com tag específica",
          "Usuários: atendimentos de um colega",
          "Conexões: número WhatsApp de origem",
          "Status: refinamento além da aba atual",
        ],
      },
      {
        title: "Cabeçalho do ticket (chat aberto)",
        bullets: [
          "Nome do contato e fila atual",
          "WhatsApp API Oficial: chip Janela 24h (tempo restante ou aviso de template obrigatório)",
          "Etiquetas: classificar o atendimento",
          "Transferir: outro usuário ou fila",
          "Devolver à fila: remove responsável",
          "Encerrar / Resolver: fecha ticket (NPS se configurado)",
          "Menu ⋮: outras opções conforme permissão",
        ],
      },
      {
        title: "WhatsApp API Oficial no ticket",
        bullets: [
          "Menu + → Templates: enviar template Meta com variáveis",
          "Menu + → Botões / Enquete: até 3 botões ou lista com até 10 opções (enquete)",
          "Dentro da janela 24h: texto livre e anexos normalmente",
          "Fora da 24h: banner amarelo — use template",
          "Mídia recebida do cliente é baixada automaticamente da Meta",
        ],
      },
      {
        title: "Área de mensagens",
        bullets: [
          "Enviar texto, emoji, anexos, áudio gravado",
          "Respostas rápidas: digite / ou atalho cadastrado",
          "Responder mensagem específica (reply)",
          "Notas internas: visíveis só para a equipe",
        ],
      },
      {
        title: "Ações do atendente",
        body: "Fluxo típico: aguardando → assumir → conversar → encerrar.",
        bullets: [
          "Assumir: você vira responsável",
          "Responder até resolver dúvida do cliente",
          "Transferir se outro setor deve continuar",
          "Encerrar: dispara mensagem de despedida/NPS da conexão",
        ],
      },
      {
        title: "Pré-requisitos",
        bullets: [
          "Conexão WhatsApp CONECTADA",
          "Filas criadas e vinculadas",
          "Usuário com acesso à fila do ticket",
        ],
        tip: "Configure Conexões e Filas com os botões ? nessas páginas antes de operar.",
      },
    ]
  ),

  contacts: doc(
    "Contatos",
    "Cadastro central de clientes: nome, telefone, e-mail, etiquetas e carteira (atendente responsável).",
    [
      {
        title: "Barra da página",
        bullets: [
          "Busca: filtra por nome ou telefone",
          "Botão ?: esta documentação",
          "Criar: abre modal de novo contato",
          "Importar: atalho para importação em massa",
        ],
      },
      {
        title: "Modal — Novo / Editar contato",
        bullets: [
          "Nome completo ou apelido",
          "Telefone com DDI (somente números, ex.: 5511999999999)",
          "E-mail opcional",
          "Etiquetas: múltipla seleção",
          "Campos extras conforme plano (CPF, empresa, aniversário)",
          "Salvar: atualiza lista e tickets futuros",
        ],
      },
      {
        title: "Criar e editar contato",
        bullets: [
          "Editar: clique na linha ou no ícone de lápis",
          "Carteira: vincula contato a um atendente/fila preferencial",
          "Excluir: remove da base (cuidado com histórico)",
        ],
      },
      {
        title: "Importar em massa",
        body: "Menu ou rota Importar contatos — envie CSV com colunas nome e telefone. Revise duplicados antes de confirmar.",
      },
      {
        title: "Uso no atendimento",
        bullets: [
          "Tickets usam o número para localizar ou criar contato automaticamente",
          "Campanhas usam listas de contatos ou etiquetas",
          "Busca rápida por nome ou número na barra superior da página",
        ],
      },
    ]
  ),

  contactsImport: doc(
    "Importar contatos",
    "Importação em lote via arquivo para alimentar campanhas e base de clientes.",
    [
      {
        title: "Formato do arquivo",
        bullets: [
          "CSV ou planilha exportada conforme modelo do sistema",
          "Colunas mínimas: nome e telefone (com DDI, só números)",
          "Evite caracteres especiais no telefone",
        ],
      },
      {
        title: "Passo a passo",
        bullets: [
          "Selecione o arquivo e mapeie colunas se solicitado",
          "Aguarde processamento — listas grandes podem levar minutos",
          "Confira total importado vs. erros na mensagem final",
        ],
        tip: "Telefones inválidos são ignorados; corrija o arquivo e reimporte se necessário.",
      },
    ]
  ),

  quickMessages: doc(
    "Respostas rápidas",
    "Biblioteca de mensagens pré-escritas usadas dentro do ticket para agilizar o atendimento.",
    [
      {
        title: "Criar resposta rápida",
        bullets: [
          "Nome interno (ex.: Saudação inicial)",
          "Atalho: texto que digita no chat (ex.: /ola ou ola)",
          "Corpo da mensagem: pode incluir quebras de linha e emojis",
          "Mídia opcional conforme plano",
        ],
      },
      {
        title: "No ticket",
        body: "Digite o atalho no campo de mensagem ou abra o menu de respostas rápidas. O texto é inserido antes de enviar — você pode editar.",
      },
      {
        title: "Boas práticas",
        bullets: [
          "Padronize saudação, preços, horário e encerramento",
          "Evite atalhos muito curtos que disparam sem querer",
          "Revise periodicamente textos desatualizados",
        ],
      },
    ]
  ),

  schedules: doc(
    "Agendamentos",
    "Programe envio de mensagens WhatsApp em data e hora definidas.",
    [
      {
        title: "Criar agendamento",
        bullets: [
          "Escolha conexão e contato (ou lista)",
          "Defina data/hora e mensagem",
          "Confirme — aparece no calendário/lista da página",
        ],
      },
      {
        title: "Calendário e estatísticas",
        body: "Visualize agendamentos por dia/semana. Estatísticas mostram enviados, pendentes e falhas.",
        tip: "Conexão deve estar conectada no horário do disparo.",
      },
    ]
  ),

  tags: doc(
    "Etiquetas",
    "Tags coloridas para classificar tickets e contatos — usadas em filtros, relatórios e Kanban.",
    [
      {
        title: "Modal — Nova / Editar etiqueta",
        bullets: [
          "Nome: ex. VIP, Reclamação, Orçamento",
          "Cor: bolinha colorida na lista e no ticket",
          "Salvar: disponível imediatamente nos filtros",
        ],
      },
      {
        title: "Aplicar no atendimento",
        body: "No ticket (cabeçalho) ou no contato, selecione uma ou mais etiquetas. No Kanban, colunas podem representar etiquetas Kanban (página separada).",
        bullets: [
          "Filtro em Atendimentos por etiqueta",
          "Campanhas podem segmentar por tag",
        ],
      },
    ]
  ),

  users: doc(
    "Usuários",
    "Gestão da equipe: quem acessa o sistema, perfil e filas permitidas.",
    [
      {
        title: "Modal — Novo / Editar usuário",
        bullets: [
          "Nome e e-mail de login",
          "Senha (obrigatória na criação)",
          "Perfil: admin ou atendente",
          "Filas: marque todas que o usuário pode ver",
          "Permitir grupos: atende tickets de grupo WhatsApp",
          "Conexões: quais números pode usar (se restrito)",
        ],
      },
      {
        title: "Perfis",
        bullets: [
          "Admin: configurações, conexões, relatórios",
          "Usuário: atendimento nas filas liberadas",
          "Permissões extras conforme plano",
        ],
      },
      {
        title: "Monitoramento",
        body: "Status online/offline aparece em Dashboard e Moments. Usuário sem fila não vê tickets daquela lista.",
      },
    ]
  ),

  settings: doc(
    "Configurações",
    "Central de parâmetros da empresa — abas variam conforme seu perfil e plano.",
    [
      {
        title: "Abas principais",
        bullets: [
          "Opções: parâmetros gerais da operação (filas, tickets, notificações)",
          "Horários: expediente — mensagem automática fora do horário",
          "Finalização: campos obrigatórios ao encerrar ticket (ex.: valor venda)",
          "Usuários: atalho para gestão de equipe",
          "Conexões / Integrações / E-mail: atalhos aos módulos",
          "Identidade visual: logos, cores, nome da empresa (admin)",
          "Planos e faturamento: upgrade e limites (admin)",
        ],
      },
      {
        title: "Aba Opções — o que costuma configurar",
        bullets: [
          "Distribuição automática de tickets",
          "Agrupar tickets por contato",
          "Permitir múltiplos atendentes no mesmo ticket",
          "Mensagens de avaliação e confirmações",
        ],
      },
      {
        title: "Aba Horários",
        body: "Defina dias e horários de funcionamento. Fora do expediente o sistema pode enviar aviso automático ao cliente.",
      },
      {
        title: "Aba Finalização",
        body: "Ao encerrar ticket, o atendente pode precisar informar valor, motivo ou observação — dados vão para Relatório de vendas.",
      },
      {
        title: "Ordem recomendada",
        body: "1) Conexão WhatsApp → 2) Filas → 3) Usuários → 4) Opções e horários → 5) Integrações/IA se usar.",
        tip: "Mudanças em Opções afetam toda a empresa — teste com um usuário antes de liberar para todos.",
      },
    ]
  ),

  api: doc(
    "API de mensagens",
    "Integração REST para enviar mensagens e automatizar a partir de sistemas externos.",
    [
      {
        title: "Token de API",
        bullets: [
          "Gere o token nesta página (guarde em local seguro)",
          "Use no header Authorization das requisições",
          "Não compartilhe publicamente — revogue se vazar",
        ],
      },
      {
        title: "Envio de mensagem",
        body: "Exemplos na própria tela: endpoint, body JSON com número e texto. Respeite conexão padrão e limites do plano.",
        bullets: [
          "Número com DDI",
          "Conexão deve estar CONECTADA",
          "Erros comuns: token inválido, número sem WhatsApp",
        ],
      },
    ]
  ),

  reports: doc(
    "Relatórios",
    "Exportação e análise de atendimentos com filtros avançados.",
    [
      {
        title: "Filtros",
        bullets: [
          "Período (data início/fim)",
          "Filas, usuários, status do ticket",
          "Tipo de atendimento e conexão",
        ],
      },
      {
        title: "Exportar",
        body: "Após filtrar, gere o arquivo (planilha). Use para BI, cobrança de metas ou auditoria.",
      },
    ]
  ),

  relatorioVendas: doc(
    "Relatório de vendas",
    "Vendas registradas no fechamento de tickets com valor informado.",
    [
      {
        title: "Origem dos dados",
        body: "Quando Finalização de atendimento exige valor, o atendente informa ao encerrar — aparece aqui.",
        bullets: ["Filtro por período", "Status da venda", "Totalizadores"],
      },
    ]
  ),

  integrations: doc(
    "Integrações de filas",
    "Conecte ferramentas externas às filas: n8n, Dialogflow, Typebot, webhooks, Flow Builder.",
    [
      {
        title: "Tipos",
        bullets: [
          "n8n / webhook: dispara URL com dados do ticket",
          "Dialogflow / Typebot: bots conversacionais",
          "Flow Builder: fluxos visuais nativos do sistema",
        ],
      },
      {
        title: "Configurar",
        bullets: [
          "Crie a integração com credenciais/URL",
          "Na fila ou conexão, selecione qual integração usar",
          "Teste com ticket de sandbox antes de produção",
        ],
      },
    ]
  ),

  announcements: doc(
    "Informativos",
    "Comunicados internos para a equipe (não vão para o cliente WhatsApp).",
    [
      {
        title: "Publicar informativo",
        bullets: [
          "Título e texto",
          "Mídia opcional",
          "Usuários veem no sino de notificações do topo",
        ],
      },
    ]
  ),

  chats: doc(
    "Chat interno",
    "Mensagens entre usuários da plataforma — separado do WhatsApp com clientes.",
    [
      {
        title: "Usar",
        bullets: [
          "Crie ou entre em uma sala/conversa",
          "Envie texto e arquivos",
          "Notificações de novas mensagens",
        ],
      },
    ]
  ),

  files: doc(
    "Lista de arquivos",
    "Arquivos de mídia usados em respostas rápidas e atendimento.",
    [
      {
        title: "Funções",
        bullets: [
          "Upload de imagens, PDFs, áudios",
          "Reutilizar em mensagens sem reenviar do PC",
          "Organize por nome para achar rápido",
        ],
      },
    ]
  ),

  moments: doc(
    "Chat em tempo real (Moments)",
    "Painel ao vivo: filas, atendentes e tickets em andamento para supervisão.",
    [
      {
        title: "Supervisão",
        body: "Ideal para gestores acompanharem SLA e distribuição sem abrir cada ticket.",
        bullets: [
          "Veja quem está online",
          "Tickets por fila em tempo quase real",
          "Identifique gargalos",
        ],
      },
    ]
  ),

  kanban: doc(
    "Kanban de tickets",
    "Quadro visual: cada coluna é uma etiqueta Kanban; cards são tickets.",
    [
      {
        title: "Operação",
        bullets: [
          "Arraste o card entre colunas para mudar estágio",
          "Clique no card para abrir o ticket",
          "Configure colunas em Etiquetas Kanban",
        ],
      },
    ]
  ),

  tagsKanban: doc(
    "Etiquetas Kanban",
    "Define as colunas do quadro Kanban — cada etiqueta vira uma lane.",
    [
      {
        title: "Configurar",
        bullets: [
          "Crie etiquetas com nome e cor",
          "Ordem das colunas no Kanban segue configuração",
          "Tickets recebem etiqueta manualmente ou por automação",
        ],
      },
    ]
  ),

  allConnections: doc(
    "Todas as conexões (Admin)",
    "Visão multi-empresa de todas as conexões WhatsApp do ambiente — apenas super admin.",
    [
      {
        title: "Uso",
        bullets: [
          "Monitorar status por empresa",
          "Suporte a clientes white-label",
          "Não substitui configuração dentro de cada tenant",
        ],
      },
    ]
  ),

  phraseLists: doc(
    "Frases de campanha",
    "Modelos de texto reutilizáveis nas campanhas em massa (variáveis conforme configuração).",
    [
      {
        title: "Criar frase",
        bullets: ["Nome interno", "Texto da mensagem", "Vincular em campanhas ao disparar"],
      },
    ]
  ),

  flowbuilders: doc(
    "Automações — Flow Builder",
    "Crie fluxos visuais para automatizar atendimentos, menus, condições, envio de mensagens, integrações e muito mais.",
    [
      {
        title: "Como criar um fluxo",
        body: "Cada fluxo é uma sequência visual de passos que o sistema executa automaticamente quando acionado por um gatilho.",
        bullets: [
          "Clique no botão de criar (+) para abrir o editor visual de fluxos",
          "Dê um nome descritivo ao fluxo (ex.: 'Menu Principal', 'Boas-vindas VIP')",
          "Arraste nós do painel lateral para a área de trabalho e conecte-os com setas",
          "Defina o gatilho de disparo: palavra-chave, novo contato, horário, etc.",
          "Teste com um número de teste antes de publicar",
          "Publique e vincule o fluxo à conexão ou fila desejada",
        ],
      },
      {
        title: "Tipos de nós disponíveis",
        bullets: [
          "Mensagem: envia texto, imagem, vídeo, áudio ou documento",
          "Condição: ramifica o fluxo por resposta do cliente ou variável",
          "Menu: exibe opções numeradas (1, 2, 3...) para o cliente escolher",
          "Fila: transfere o ticket para uma fila ou atendente específico",
          "HTTP/API: chama uma API externa para integração",
          "Aguardar: pausa o fluxo por um tempo antes do próximo passo",
          "Tag: adiciona ou remove tags do contato automaticamente",
          "Variável: define ou atualiza dados do contato",
        ],
      },
      {
        title: "Casos de uso comuns",
        bullets: [
          "Menu inicial com opções numeradas (Vendas, Suporte, Financeiro)",
          "Boas-vindas automáticas para novos contatos",
          "Encaminhamento para fila conforme resposta do cliente",
          "Coleta de dados (nome, e-mail, CPF) em sequência",
          "Envio de catálogo ou informações automáticas fora do horário",
          "Qualificação de leads com perguntas sequenciais",
        ],
      },
      {
        title: "Dicas importantes",
        bullets: [
          "Sempre teste o fluxo completo antes de publicar em produção",
          "Use nomes claros nos nós para facilitar a manutenção",
          "Fluxos complexos podem ser divididos em sub-fluxos menores",
          "Monitore os relatórios para identificar gargalos no fluxo",
        ],
        tip: "Vincule o fluxo na aba Conexões ou na configuração da Fila para que ele seja acionado automaticamente.",
      },
    ]
  ),

  flowbuilder: doc(
    "Editor de fluxo",
    "Monte o fluxo arrastando nós e ligando setas.",
    [
      {
        title: "Nós comuns",
        bullets: [
          "Mensagem: envia texto/mídia",
          "Condição: ramifica por resposta ou variável",
          "Fila: transfere ticket",
          "HTTP: chama API externa",
          "Aguardar: pausa antes do próximo passo",
        ],
      },
      {
        title: "Publicar",
        body: "Salve e associe o fluxo na conexão (etapa opcional do wizard) ou na integração da fila. Teste com número de teste.",
      },
    ]
  ),

  whatsappDashboard: doc(
    "Dashboard WhatsApp",
    "Métricas focadas nas conexões WhatsApp: volume, tempos e comparativos.",
    [
      {
        title: "Indicadores",
        bullets: [
          "Mensagens enviadas/recebidas",
          "Tickets por conexão",
          "Tempos médios de resposta",
        ],
        tip: "Cruze com Dashboard geral para visão completa da operação.",
      },
    ]
  ),

  leadsConvertidos: doc(
    "Leads convertidos / Empresas",
    "Cadastro de empresas que saíram do funil como ganhos ou clientes ativos. Usado para vincular Atividades e Projetos.",
    [
      {
        title: "O que aparece aqui",
        body: "Lista de empresas convertidas com nome, contato e dados comerciais. Origem: fechamento ganho em Leads e Vendas ou cadastro manual.",
        bullets: [
          "Busca por nome da empresa",
          "Filtros de período e responsável",
          "Clique na linha para ver detalhes",
        ],
      },
      {
        title: "Modal — Empresa / lead convertido",
        bullets: [
          "Nome da empresa *",
          "CNPJ ou documento (se habilitado)",
          "Telefone e e-mail de contato",
          "Responsável comercial",
          "Observações e tags",
        ],
      },
      {
        title: "Uso com outros módulos",
        bullets: [
          "Em Nova Atividade → campo Empresa lista estes cadastros",
          "Em Novo Projeto → mesmo vínculo",
          "Relatórios de conversão cruzam com Leads e Vendas",
        ],
      },
    ]
  ),

  inventory: doc(
    "Inventários",
    "Catálogo de produtos/serviços usados em Leads e Vendas. Controle quantidade, preço e estágio no kanban de estoque.",
    [
      {
        title: "Como cadastrar item",
        bullets: [
          "Botão + ou criar na página",
          "Nome do produto/serviço *",
          "Preço unitário e moeda",
          "Quantidade em estoque",
          "SKU ou código interno (opcional)",
          "Descrição para a equipe de vendas",
        ],
      },
      {
        title: "Modal — Item do inventário",
        body: "Campos salvos ficam disponíveis ao adicionar produtos em um lead (etapa Produto do assistente).",
        bullets: [
          "Editar preço atualiza novos leads; leads antigos mantêm valor gravado",
          "Kanban: colunas podem representar disponível, reservado, esgotado",
        ],
      },
      {
        title: "Vínculo com vendas",
        body: "Em Leads e Vendas → criar lead → etapa Produto → selecionar do inventário. Total calcula automaticamente.",
      },
    ]
  ),

  arquivos: doc(
    "Arquivos (gestão documental)",
    "Repositório de documentos com múltiplas visões.",
    [
      {
        title: "Visões",
        bullets: [
          "Dashboard: resumo",
          "Lista: tabela com busca",
          "Calendário: por datas",
          "Kanban: estágios do documento",
        ],
      },
    ]
  ),

  email: doc(
    "E-mail",
    "Módulo de e-mail integrado ao CRM.",
    [
      {
        title: "Configuração",
        bullets: [
          "SMTP: servidor, porta, usuário, senha",
          "Teste de envio antes de usar em produção",
        ],
      },
      {
        title: "Uso diário",
        bullets: [
          "Caixa de entrada",
          "Templates de e-mail",
          "Métricas de abertura/envio se disponível",
        ],
      },
    ]
  ),

  callHistoricals: doc(
    "Histórico de chamadas",
    "Registro de chamadas VoIP (Wavoip) vinculadas ao atendimento.",
    [
      {
        title: "Campos",
        bullets: [
          "Data/hora e duração",
          "Status (atendida, perdida, etc.)",
          "Número e atendente",
        ],
      },
    ]
  ),

  wallets: doc(
    "Carteiras",
    "Atribui contatos a atendentes/filas para roteamento preferencial.",
    [
      {
        title: "Configurar carteira",
        bullets: [
          "Selecione contato(s)",
          "Defina atendente ou fila dona",
          "Novos tickets podem priorizar o dono da carteira",
        ],
      },
    ]
  ),

  helps: doc(
    "Central de ajuda (vídeos)",
    "Biblioteca de tutoriais em vídeo cadastrados pelo administrador da plataforma.",
    [
      {
        title: "Para administradores",
        body: "Cadastre links ou uploads de vídeos por tema para onboarding da equipe.",
      },
      {
        title: "Para atendentes",
        body: "Assista aos vídeos disponíveis. Para dúvidas por módulo, use o botão ? em cada página.",
      },
    ]
  ),

  todolist: doc(
    "Tarefas (To-do)",
    "Lista pessoal rápida de pendências — não confundir com Atividades CRM.",
    [
      {
        title: "Uso",
        bullets: [
          "Adicione tarefas com Enter",
          "Marque como concluída",
          "Lista é por usuário/sessão local da página",
        ],
      },
    ]
  ),

  companies: doc(
    "Empresas (multi-tenant)",
    "Gestão de empresas clientes da plataforma — super administrador. Cada empresa é um tenant isolado.",
    [
      {
        title: "Lista de empresas",
        bullets: [
          "Nome, e-mail admin, plano ativo",
          "Data de vencimento da assinatura",
          "Status: ativa, vencida, trial",
        ],
      },
      {
        title: "Modal — Nova / Editar empresa",
        bullets: [
          "Nome da empresa *",
          "E-mail do administrador *",
          "Plano: limites de usuários, conexões, módulos",
          "Senha inicial (só na criação)",
          "Data de vencimento",
          "Campos de faturamento conforme integração",
        ],
      },
      {
        title: "Ações de suporte",
        bullets: [
          "Acessar como empresa (impersonate) se permitido",
          "Renovar ou alterar plano",
          "Não confundir com Empresas CRM (leads convertidos)",
        ],
        tip: "Usuários finais gerenciam sua operação em Configurações, não nesta tela.",
      },
    ]
  ),

  financeiro: doc(
    "Financeiro",
    "Faturas, assinatura e renovação do plano.",
    [
      {
        title: "Empresa vencida",
        body: "Se a assinatura expirar, o sistema pode restringir acesso e direcionar para esta tela até regularizar.",
        bullets: [
          "Ver faturas em aberto",
          "Link de pagamento se disponível",
          "Contato com suporte VB Solution",
        ],
      },
    ]
  ),

  birthdaySettings: doc(
    "Configurações de aniversário",
    "Envio automático de mensagem de parabéns no dia do aniversário do contato.",
    [
      {
        title: "Configurar",
        bullets: [
          "Ativar automação",
          "Escolher conexão WhatsApp de envio",
          "Texto da mensagem (pode usar variáveis de nome)",
          "Horário do disparo",
        ],
        tip: "Contatos precisam ter data de nascimento preenchida.",
      },
    ]
  ),

  contactLists: doc(
    "Listas de contatos (campanhas)",
    "Agrupamentos para disparos em massa no módulo Campanhas.",
    [
      {
        title: "Criar lista",
        bullets: [
          "Nome da lista",
          "Adicionar contatos manualmente ou importar",
          "Usar na criação de campanha",
        ],
      },
    ]
  ),

  contactListItems: doc(
    "Contatos da lista",
    "Gerencia quem faz parte de uma lista de campanha específica.",
    [
      {
        title: "Ações",
        bullets: [
          "Adicionar/remover contato",
          "Importar CSV para esta lista",
          "Ver total antes de disparar campanha",
        ],
      },
    ]
  ),

  campaigns: doc(
    "Campanhas WhatsApp",
    "Disparo em massa de mensagens para uma lista de contatos. Com conexão API Oficial, o envio usa templates aprovados pela Meta.",
    [
      {
        title: "Abas da página",
        bullets: [
          "Campanhas: lista, métricas e criação de disparos",
          "Templates Meta (API Oficial): sincronizar e visualizar templates da WABA",
        ],
      },
      {
        title: "Modal — Nova campanha (API Oficial)",
        bullets: [
          "Conexão WhatsApp API Oficial obrigatória",
          "Seletor de template Meta aprovado (com variáveis)",
          "Lista de contatos ou tag",
          "Agendamento ou Enviar agora",
          "Intervalo entre envios recomendado (anti-bloqueio Meta)",
        ],
      },
      {
        title: "Modal — Nova campanha (WhatsApp Web)",
        bullets: [
          "Nome interno da campanha",
          "Conexão: número que enviará (deve estar CONECTADO)",
          "Lista de contatos: escolha lista cadastrada",
          "Mensagem: texto, mídia ou frase pré-cadastrada",
          "Agendamento: data/hora ou disparo imediato",
        ],
      },
      {
        title: "Página e relatório",
        bullets: [
          "Lista: status Em andamento, Pausada, Finalizada",
          "Clique na campanha → relatório com entregues e erros",
          "Pausar/retomar conforme permissão",
        ],
        tip: "API Oficial: fora da janela 24h só templates. Campanhas sempre usam template Meta.",
      },
    ]
  ),

  whatsappApiOficial: doc(
    "Templates Meta (API Oficial)",
    "Templates aprovados pela Meta para campanhas e atendimento fora da janela de 24 horas.",
    [
      {
        title: "Esta página",
        bullets: [
          "Selecione a conexão API Oficial",
          "Sincronizar Meta: importa templates APPROVED da WABA",
          "Busca por nome ou conteúdo",
        ],
      },
      {
        title: "Onde usar os templates",
        bullets: [
          "Campanhas: aba Campanhas → Nova → conexão oficial → seletor de template",
          "Tickets: menu + → Templates (com variáveis)",
          "Primeiro contato ou fora de 24h: template obrigatório",
        ],
      },
      {
        title: "Documentação completa",
        body: "Mapa de todas as features API Oficial: backend/docs/whatsapp_api_oficial.md no repositório.",
      },
    ]
  ),

  campaignsConfig: doc(
    "Configuração de campanhas",
    "Parâmetros globais dos disparos em massa.",
    [
      {
        title: "Parâmetros típicos",
        bullets: [
          "Intervalo entre mensagens (anti-bloqueio)",
          "Limite diário por conexão",
          "Horário permitido de envio",
        ],
      },
    ]
  ),

  campaignReport: doc(
    "Relatório da campanha",
    "Resultado detalhado de um disparo: entregues, lidos, erros.",
    [
      {
        title: "Interpretar",
        bullets: [
          "Verde: enviado com sucesso",
          "Vermelho: falha (número inválido, bloqueio, etc.)",
          "Exportar para análise se disponível",
        ],
      },
    ]
  ),

  aiBrain: doc(
    "Brain.AI — Assistente Inteligente",
    "O Brain é a IA do CRM: crie leads, consulte dados, gere protótipos, programe telas no IDE Build e use ferramentas externas via MCP (Figma, Google Drive, Sheets, Calendário). Modelos: OpenAI (GPT), Claude (Anthropic), Gemini (Google) e Grok (xAI).",
    [
      {
        title: "Projetos Brain e IDE Build",
        body: "A organização do Brain.AI segue três níveis: Projeto Brain → Conversas → Projetos IDE Build. Essa hierarquia mantém contexto, histórico e código separados por iniciativa.",
        bullets: [
          "Projeto Brain — container principal (ex.: \"App de login\", \"Landing Q2\"). Selecione ou crie em Projetos Brain (ícone de pasta no painel Conversas). Toda conversa pertence a um único projeto Brain.",
          "Conversas — threads de chat dentro do projeto Brain. Cada projeto Brain pode ter várias conversas independentes, com histórico, anexos e MCP próprios.",
          "IDE Build — sandbox de código vinculado ao projeto Brain. Um projeto Brain pode ter vários projetos IDE Build (ex.: \"Login v1\", \"Dashboard admin\"). Cada um guarda arquivos, preview e terminal.",
          "Relação: Projeto Brain ⊃ { Conversas + N projetos IDE Build }. O código gerado no chat fica registrado na conversa (chips de arquivos) e é persistido no IDE Build do projeto Brain ativo.",
          "Fluxo típico: 1) crie/selecione projeto Brain → 2) nova conversa → 3) peça telas ou código → 4) acompanhe os arquivos no chat → 5) abra o IDE Build manualmente quando quiser editar ou publicar.",
        ],
        tip: "Sem projeto Brain selecionado, não é possível iniciar conversa. O seletor de projeto fica no topo do painel Conversas.",
      },
      {
        title: "Codificação em tempo real no chat",
        body: "Quando você pede telas, landing pages ou sistemas, o Brain grava arquivos via IDE Build e exibe chips compactos na conversa — estilo Cursor.",
        bullets: [
          "Durante a geração: chips de arquivos aparecem na conversa; clique para ver o código sendo escrito em tempo real.",
          "Após concluir: os chips permanecem no histórico da mensagem — não somem da conversa.",
          "Link \"Abrir no IDE Build →\" nos blocos concluídos abre o editor completo (preview, terminal, Supabase). O IDE Build não abre automaticamente.",
          "Use o ícone </> no topo do chat para abrir o IDE Build manualmente a qualquer momento.",
        ],
      },
      {
        title: "Modelos disponíveis",
        body: "Escolha o provedor e o modelo no seletor abaixo do campo de mensagem. Várias integrações podem estar ativas ao mesmo tempo.",
        bullets: [
          "OpenAI: GPT-4o, GPT-4o mini e demais modelos listados no menu",
          "Anthropic: Claude Fable 5 (frontier), Sonnet, Opus, Haiku — API Key em Integrações → Claude",
          "Google Gemini: Flash, Pro e multimodal — API Key em Integrações → Gemini",
          "Grok (xAI): Grok 4 / 4.1 Fast e variantes — API Key em Integrações → Grok (também usada no Brain se a chave da plataforma não existir)",
          "Cada mensagem usa o modelo selecionado na hora; agentes de WhatsApp usam o modelo do editor em Agente IA",
        ],
      },
      {
        title: "IDE Build — Projeto de código",
        body: "Editor sandbox dentro do projeto Brain: edite arquivos, preview ao vivo e exporte PDF. Cada projeto Brain pode ter vários projetos IDE Build independentes.",
        bullets: [
          "Como abrir: ícone </> no topo do chat, link \"Abrir no IDE Build\" nos chips da conversa, ou biblioteca de anexos",
          "Abrir pasta: importa uma pasta do seu computador para o sandbox",
          "Novo: cria outro projeto IDE Build dentro do projeto Brain ativo",
          "Peça no chat: \"crie uma tela de login\" — arquivos aparecem na conversa em tempo real; abra o IDE Build quando quiser editar",
          "Editor: árvore de arquivos à esquerda; edite o conteúdo no centro",
          "Preview: aba com iframe — atualiza conforme você edita (HTML, CSS e JS)",
          "Baixar: salva o arquivo ativo no disco",
          "PDF (navegador): abre impressão do preview — Chrome, Edge, Firefox e Safari",
          "Persistência: projetos IDE Build salvos no servidor, vinculados ao projeto Brain",
        ],
        tip: "Um projeto Brain pode ter vários IDE Builds (ex.: protótipo v1, v2, API). Conversas do mesmo projeto Brain compartilham o contexto organizacional.",
      },
      {
        title: "Aba MCP (composer)",
        body: "Acima do campo de mensagem, a aba MCP (contador de chips) escolhe quais ferramentas externas o Brain pode usar nesta conversa.",
        bullets: [
          "Figma — listar projetos/arquivos, componentes, gerar protótipo HTML navegável e handoff para o Drive",
          "Google Drive — listar/enviar arquivos; obrigatório para pacote \"levar pro Figma\"",
          "Google Sheets — ler e escrever planilhas (leads, relatórios)",
          "Google Calendário — consultar eventos e alinhar agendamentos",
          "Notion e GitHub — chips no MCP; configuração completa no hub Integrações ainda Em breve",
          "Marque os serviços, use Habilitar todos se quiser, e Salvar — persiste na sessão do navegador",
        ],
        tip: "Configure cada integração em Integrações antes de marcar no MCP: Figma = Personal Access Token; Google = OAuth em cada card.",
      },
      {
        title: "Figma e protótipos",
        body: "Com Figma conectado (Integrações → Figma) e chip Figma ativo no MCP.",
        bullets: [
          "Protótipo navegável: peça telas ou fluxos — o Brain gera HTML interativo com preview no modal",
          "Exportar PDF (navegador): no modal do protótipo, sem depender do servidor",
          "PNG/PDF por tela no servidor: só se o backend tiver Chrome (variável CHROME_PATH)",
          "Levar pro Figma: HTML + guia no Google Drive + toast e passos no modal (a API não cria .fig automaticamente)",
          "Arquivo existente: cole link ou file key — frames, componentes, comentários, protótipo embed",
          "Plano gratuito Figma pode limitar novos projetos — use o projeto da equipe quando necessário",
        ],
      },
      {
        title: "Arquivos gerados e biblioteca",
        body: "PDF, Excel, JSON, apresentações, protótipos HTML e pacotes Figma aparecem em modais e na biblioteca de anexos da conversa.",
        bullets: [
          "Ícone de livro no topo: Biblioteca de anexos — tudo que o Brain gerou ou você enviou na conversa",
          "Protótipo HTML: preview, download .html, abrir em nova aba e Exportar PDF (navegador)",
          "Handoff Figma: modal com links do Drive e lista de passos",
          "Projeto de código: reabre o IDE Build a partir da biblioteca",
        ],
      },
      {
        title: "IA Prompts no composer",
        body: "Ícone de varinha mágica ao lado do + de anexos — assiste a redigir e revisar o texto antes de enviar.",
        bullets: [
          "Corrigir gramática e ortografia",
          "Traduzir o texto",
          "Prompt customizado: descreva como quer reescrever e aplique no campo",
          "Disponível também nos tickets (campo de mensagem) quando o recurso estiver habilitado",
        ],
      },
      {
        title: "Conversa por voz",
        bullets: [
          "Ícone de ondas de áudio no topo: abre painel de conversa por voz com o Brain",
          "Ditado em tempo real: microfone no composer grava e transcreve no campo de texto",
          "Escolha voz masculina ou feminina na primeira utilização",
        ],
      },
      {
        title: "O que o Brain pode fazer",
        body: "O Brain se conecta às funções do CRM e executa ações reais a partir das suas mensagens.",
        bullets: [
          "Criar atividades — \"Crie uma tarefa para ligar para o João amanhã às 10h\"",
          "Criar contatos — \"Adicione o contato Maria Silva, email maria@email.com\"",
          "Criar leads — \"Crie um lead para a empresa Tech Solutions\"",
          "Criar leads de venda — \"Crie um lead de venda para Leonardo, produto VBSolution, 3 unidades\"",
          "Consultar dashboard — \"Quais são os dados do meu dashboard?\"",
          "Listar atividades, contatos, tickets, leads e projetos",
          "Resumo do CRM — \"Me dê um resumo geral do meu CRM\"",
          "Análise de dados — \"Analise os atendimentos e sugira melhorias\"",
          "Gerar arquivos — PDF, Excel, JSON, Apresentações",
          "Protótipos Figma/HTML — telas navegáveis, handoff e exportações",
          "Programar no sandbox — IDE Build com preview e pasta local",
          "Criar e gerenciar conexões — WhatsApp, Telegram, Facebook, SMS",
          "Alterar identidade visual — mudar cores do topbar, sidebar, botões e tema",
          "Gerenciar configurações — habilitar/desabilitar assinatura, avaliação, LGPD, SMTP e mais",
        ],
      },
      {
        title: "Criar produtos e respostas rápidas",
        body: "O Brain pode criar produtos no inventário e respostas rápidas para uso em atendimentos.",
        bullets: [
          "Criar produto — \"Cadastre o produto Notebook Dell, preço R$ 4.500, categoria Eletrônicos\"",
          "Buscar produtos — \"Quais produtos temos cadastrados?\"",
          "Criar resposta rápida — \"Crie uma resposta rápida com atalho 'saudacao' e texto 'Olá! Como posso ajudar?'\"",
          "As respostas rápidas ficam disponíveis nos atendimentos usando / + atalho",
        ],
      },
      {
        title: "Campanhas de disparo em massa",
        body: "O Brain guia você passo a passo na criação de campanhas de envio de mensagens em massa, integrado com a página de Campanhas.",
        bullets: [
          "Diga: \"Quero criar uma campanha de disparo de mensagens\" e o Brain vai guiar você",
          "O Brain pergunta: qual conexão WhatsApp usar, mostrando as disponíveis",
          "Escolha enviar por TAG (contatos com etiqueta) ou por LISTA DE CONTATOS",
          "O Brain mostra as tags/listas disponíveis com quantidade de contatos",
          "Defina a mensagem, data/hora de agendamento e fila de atendimento",
          "A campanha é criada automaticamente na página de Campanhas com status PROGRAMADA",
          "Exemplo: \"Crie uma campanha para todos os contatos com tag 'Clientes VIP' enviando 'Promoção especial!'\"",
        ],
        tip: "As campanhas criadas pelo Brain aparecem na página /campaigns e seguem o mesmo fluxo de envio automático do sistema.",
      },
      {
        title: "Enviar mensagens e abrir tickets",
        body: "O Brain funciona como um assistente pessoal: envie mensagens para qualquer contato diretamente pelo chat, e tickets são abertos automaticamente. Agora de forma mais rápida e inteligente.",
        bullets: [
          "Diga: \"Envie uma mensagem para o Davi dizendo que a reunião é às 15h\"",
          "O Brain busca o contato e envia automaticamente — sem pedir confirmação desnecessária",
          "Se encontrar vários contatos com o mesmo nome, pergunta qual é o correto",
          "Confirmação breve e direta: contato, número, conexão usada e ticket aberto",
          "Diga: \"Mande um oi para a Maria Silva\" — funciona com linguagem natural",
          "Tickets abertos ficam visíveis na página de Tickets normalmente",
        ],
        tip: "O envio usa a conexão WhatsApp padrão do sistema. Você também pode especificar uma fila: \"Envie para o João na fila Vendas\".",
      },
      {
        title: "Alterar identidade visual do sistema",
        body: "O Brain pode alterar as cores e o tema do sistema diretamente via chat, vinculado à seção Identidade Visual das Configurações. Necessário que o usuário tenha acesso a essa seção.",
        bullets: [
          "Diga: \"Quero o sistema na cor roxa\" — o Brain aplica em todos os elementos (topbar, sidebar, botões)",
          "Alterações específicas: \"Mude o topbar para azul escuro\" ou \"Coloque o sidebar verde\"",
          "Cores do modo claro e escuro podem ser definidas separadamente",
          "Diga: \"Mude a cor dos botões para laranja\" — altera apenas botões primários",
          "Paletas prontas: azul, roxo, verde, vermelho, rosa, laranja, índigo, teal",
          "Após alterar, recarregue a página para ver as mudanças aplicadas",
        ],
        tip: "Apenas usuários com acesso à seção Identidade Visual em Configurações podem usar este recurso. Se não tiver acesso, o Brain informará.",
      },
      {
        title: "Gerenciar configurações do sistema",
        body: "O Brain pode alterar qualquer configuração do sistema diretamente via chat, vinculado à seção Configurações. Necessário perfil admin.",
        bullets: [
          "\"Desabilite a assinatura do agente\" — desativa a assinatura nas mensagens enviadas",
          "\"Habilite a avaliação de atendimento\" — ativa avaliação ao fechar ticket",
          "\"Configure o SMTP\" — o Brain pede host, porta, usuário, senha e remetente",
          "\"Habilite grupos do WhatsApp\" — ativa/desativa recebimento de mensagens de grupos",
          "\"Ative a LGPD\" — habilita funcionalidades de proteção de dados",
          "\"Fechar ticket ao transferir\" — ativa/desativa fechamento automático ao transferir",
          "\"Mostrar posição na fila\" — habilita/desabilita envio de posição ao contato",
          "\"Qual o status das minhas configurações?\" — o Brain mostra todas as configurações atuais",
        ],
        tip: "Todas as configurações alteradas pelo Brain são as mesmas da página Configurações → Opções. As alterações são aplicadas imediatamente.",
      },
      {
        title: "Funcionalidades do chat",
        bullets: [
          "Anexar arquivos: + no composer — documentos, imagens ou planilhas na pergunta",
          "MCP: chips acima do campo — Figma, Drive, Sheets, Calendário, etc.",
          "IDE Build: ícone </> no topo — projeto de código com preview",
          "IA Prompts: varinha — gramática, tradução e prompt customizado",
          "Idioma: globo — resposta em PT, EN ou ES",
          "Modelo: seletor no composer — GPT, Claude ou Gemini",
          "Ações rápidas: cards abaixo do campo para comandos comuns do CRM",
        ],
      },
      {
        title: "Gerenciando conversas",
        bullets: [
          "Conversas salvas na barra lateral esquerda",
          "Clique para retomar; lápis para renomear; lixeira para excluir",
          "Nova conversa (+) no topo da lista ou no cabeçalho do chat",
          "Biblioteca de anexos (ícone livro): arquivos gerados pelo Brain nesta conversa",
        ],
      },
      {
        title: "Configuração necessária",
        body: "Antes de usar o Brain, configure ao menos um provedor de IA. Para MCP e IDE Build avançado, conecte também Figma e Google.",
        bullets: [
          "Open IA: Integrações → Open IA → API Key sk-...",
          "Claude: Integrações → Claude → API Key sk-ant-...",
          "Gemini: Integrações → Gemini → API Key do Google AI Studio",
          "Grok: Integrações → Grok → API Key do console.x.ai",
          "Figma: Integrações → Figma → Personal Access Token (figma.com → Settings → Security)",
          "Google: Integrações → Drive / Sheets / Calendário → conectar conta (OAuth)",
          "Brain: marque os MCPs desejados na aba MCP e abra o IDE Build pelo ícone </> quando for codificar",
          "WhatsApp: Agente IA → criar agente → vincular na conexão do canal",
        ],
        tip: "GPT, Claude e Gemini podem estar ativos juntos. Notion e GitHub no hub Integrações ainda estão Em breve.",
      },
    ]
  ),

  connections: { title: "Conexões", special: "connections" },

  platform_api: doc(
    "Gere sua API e MCP do VBSolution CRM",
    "Cada organização cria credenciais próprias para extrair dados do CRM (leads, contatos, atividades, tickets, dashboard) e enviar contexto a ferramentas externas via REST API ou servidor MCP.",
    [
      {
        title: "O que você pode fazer",
        bullets: [
          "REST API: integrar Zapier, Make, n8n e scripts com HTTP",
          "MCP: conectar Claude Desktop, Claude Code, Cursor e VS Code",
          "Extrair leads, contatos, atividades, tickets e métricas da sua organização",
          "Executar ferramentas CRM via IA com contexto real da conta",
        ],
      },
      {
        title: "Como gerar credenciais",
        body: "Acesse Integrações → card API & MCP CRM, ou Menu Mais → API & MCP. Clique em Nova API Key, defina nome e escopos, e copie a chave imediatamente.",
        bullets: [
          "Cada organização tem chaves isoladas — não acessam dados de outras contas",
          "Use escopos restritos quando a integração não precisa de acesso total",
          "Revogue chaves antigas ao rotacionar credenciais",
        ],
      },
      {
        title: "Claude Code / Claude Desktop",
        body: "Copie o JSON MCP da página API & MCP e cole nas configurações do Claude Desktop ou Claude Code. Substitua VBSOLUTION_API_KEY pela sua chave gerada.",
        tip: "Com MCP ativo, o assistente lista contatos, leads e atividades da sua organização sem exportar planilhas manualmente.",
      },
      {
        title: "Cursor / VS Code",
        body: "Registre o servidor @vbsolution/crm-mcp nas configurações MCP do editor. Cole o JSON da página API & MCP com sua chave e a URL https://vbsolutioncrmdeploy-production.up.railway.app/api/v1/crm.",
      },
      {
        title: "Zapier / Make / n8n",
        body: "Use módulo HTTP Request ou Webhook com Authorization: Bearer <sua_api_key>. Base URL: https://vbsolutioncrmdeploy-production.up.railway.app/api/v1/crm — endpoints para contatos, leads, atividades e tickets.",
      },
    ]
  ),
  queues: { title: "Filas e Chatbot", special: "queues" },
  prompts: { title: "Agentes IA", special: "prompts" },
  promptsAgent: { title: "Editor do agente IA", special: "promptsAgent" },
  leadsSales: { title: "Leads e vendas", special: "leadsSales" },
  activities: { title: "Atividades (CRM)", special: "activities" },
  projects: { title: "Projetos", special: "projects" },
};
