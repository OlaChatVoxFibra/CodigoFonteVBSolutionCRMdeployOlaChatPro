# VB Solution CRM

**Código-fonte oficial** do produto **VB Solution CRM**, desenvolvido pela **Visão Business**.

Este repositório é a base comercial do sistema: CRM completo com funil de vendas, WhatsApp (Web + API Oficial Meta), disparos em massa, gestão de contas e inteligência artificial configurável pelo cliente.

---

## Visão geral

O **VB Solution CRM** unifica atendimento, vendas e operação em uma única plataforma:

| Módulo | O que você encontra |
|--------|---------------------|
| **Leads e Vendas** | Funil / pipeline, estágios, conversão em venda |
| **Atividades e Projetos** | Tarefas, prazos, status e quadros Kanban |
| **Empresas** | Gestão de contas (empresas / contas B2B) |
| **Contatos** | Cadastro, vínculo com leads e histórico |
| **WhatsApp Web** | Conexão via QR Code (sessão multi-dispositivo) |
| **WhatsApp API Oficial** | Cloud API / Meta — templates, webhooks, Embedded Signup |
| **Disparo em massa** | Campanhas e filas de envio com controle de limite |
| **Configurações** | Assinaturas, planos, identidade visual (logo, cores, nome da marca) |
| **Inteligência Artificial** | OpenAI (GPT), Anthropic (Claude) e Google (Gemini) — **apenas estrutura**; o cliente insere a própria API Key |

> Nenhuma chave de API da Visão Business vem embutida no código. Em **Configurações / Integrações**, cada organização cadastra suas próprias credenciais.

Nas **abas do navegador**, o título padrão é **Visão Business** (ex.: `Login - Visão Business`).

Os arquivos-fonte principais trazem cabeçalho de copyright identificando a propriedade intelectual da **Visão Business** (ver também [`LICENSE`](./LICENSE)).

---

## Stack

| Camada | Tecnologias |
|--------|-------------|
| **Frontend** | React (CRA + Craco), Material UI / MUI, Tailwind |
| **Backend** | Node.js, Express, TypeScript, Sequelize |
| **Banco** | PostgreSQL |
| **Filas / cache** | Redis (Bull) |
| **Realtime** | Socket.IO |
| **WhatsApp** | Baileys (Web) + Meta Cloud API (Oficial) |
| **IA** | OpenAI · Anthropic · Gemini (chaves do cliente) |
| **Pagamentos** | Stripe (e gateways opcionais configuráveis) |

---

## Estrutura do repositório

```
vbsolutioncodigofontee/
├── frontend/          # Interface web (porta padrão de desenvolvimento: 5181)
├── backend/           # API REST + workers + Socket.IO (porta 3000)
├── api_oficial/       # Serviço auxiliar WhatsApp Cloud API (opcional)
├── mcp-server/        # MCP VB Solution (opcional)
├── Stripe/            # Documentação e artefatos Stripe
├── .env.example       # Variáveis de ambiente (sem segredos)
├── LICENSE            # Termos de uso do código-fonte
└── README.md
```

---

## Início rápido

### Pré-requisitos

- **Node.js** ≥ 20  
- **PostgreSQL** (necessário para o CRM completo; **não** é obrigatório para o login local de demonstração — ver abaixo)  
- **Redis** (recomendado para filas, campanhas e agente; ignorado no modo local sem banco)

### Login local sem banco de dados

Para abrir o sistema e autenticar **sem nenhuma conexão com PostgreSQL, Redis remoto ou outro banco**, use o modo de desenvolvimento `DEV_NO_DB`.

| Item | Valor |
|------|--------|
| **Flag** | `DEV_NO_DB=true` em `backend/.env` |
| **E-mail** | `admin@local.dev` (ou `DEV_AUTH_EMAIL`) |
| **Senha** | `admin123` (ou `DEV_AUTH_PASSWORD`) |
| **Frontend** | http://localhost:5181 |
| **Backend** | http://localhost:3000 |

No `backend/.env`:

```env
DEV_NO_DB=true
DEV_AUTH_EMAIL=admin@local.dev
DEV_AUTH_PASSWORD=admin123
JWT_SECRET=gere-um-segredo-local
JWT_REFRESH_SECRET=gere-outro-segredo-local
```

Depois suba apenas backend e frontend (`npm run dev` em cada pasta). A tela de login exibe um aviso quando o modo está ativo.

**Importante:**

- Este login **não tem vínculo com nenhum banco de dados** — usuário e empresa são mock em memória (JWT local).
- Com `DEV_NO_DB`, o frontend passa a persistir **Projetos, Atividades, Leads, Contatos, Tickets** etc. no **localStorage** do navegador (criar, editar, excluir sem alertas de erro de API).
- Serve para **abrir, autenticar e usar** o código-fonte localmente (demo / inspeção da UI).
- **Nunca** ative `DEV_NO_DB` em produção (`NODE_ENV=production` já bloqueia o modo).

### 1. Clonar e instalar

```bash
git clone https://github.com/visaobusinesstech/VBSOLUTIONCRMCodigoFonte.git
cd VBSOLUTIONCRMCodigoFonte

npm run setup
# equivalente a: npm install no backend e no frontend
```

### 2. Variáveis de ambiente

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.exemple frontend/.env.development
```

Ajuste no mínimo (quando for usar o CRM **com** banco):

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` (ou `DATABASE_URL` no seu ambiente)
- `JWT_SECRET` / `JWT_REFRESH_SECRET` (gere valores novos e únicos)
- `REDIS_*` se for usar filas
- `REACT_APP_BACKEND_URL=http://localhost:3000`
- `PORT=5181` no frontend (dev)

Para **apenas autenticar sem banco**, configure `DEV_NO_DB` como na seção [Login local sem banco de dados](#login-local-sem-banco-de-dados).

Consulte o arquivo raiz [`.env.example`](./.env.example) para a lista completa (sem valores reais).

### 3. Banco de dados (CRM completo)

> Pule esta etapa se estiver só no **login local sem banco** (`DEV_NO_DB=true`).

```bash
cd backend
npx sequelize db:migrate
# opcional: seeds
# npx sequelize db:seed:all
```

### 4. Subir em desenvolvimento

Na raiz do projeto:

```bash
# Frontend (porta 5181) — via scripts do frontend
cd frontend && npm run dev

# Em outro terminal — Backend (porta 3000)
cd backend && npm run dev
```

Ou use os scripts do `package.json` da raiz (`dev:frontend` / `dev:backend`) após alinhar a porta `5181` no `.env` do frontend.

Acesse: **http://localhost:5181**

### 5. Build de produção (referência)

```bash
cd backend && npm run build && npm start
cd frontend && npm run build
```

Publique backend e frontend nos hosts de sua preferência. Este pacote **não** inclui vínculo com ambientes Railway/Vercel da Visão Business — configure o seu próprio deploy.

---

## E-mail (Worker) e variáveis na VPS

### Função E-mail

A integração de **E-mail** só funciona com credenciais **Worker** configuradas no servidor de hospedagem (**VPS** ou **Vercel**), via:

| Variável | Função |
|----------|--------|
| `EMAIL_SMTP_RELAY_URL` | URL do worker HTTP que abre a conexão SMTP |
| `EMAIL_SMTP_RELAY_SECRET` | Segredo compartilhado entre a API e o worker |

Sem essas variáveis no ambiente de produção, o envio de e-mail pelo CRM **não opera** de forma confiável (hosts que bloqueiam saída SMTP direta precisam do Worker).

### Integrações na VPS (obrigatório)

Para o **pleno funcionamento de todas as integrações** — incluindo **Facebook** e **Instagram** — é necessário inserir as variáveis de ambiente específicas no `.env` da **VPS** (ou no painel do host). Consulte [`.env.example`](./.env.example). Em especial:

| Variável | Onde | Uso |
|----------|------|-----|
| `FACEBOOK_APP_ID` | Backend (VPS) | App Meta — Facebook / Instagram / WhatsApp Oficial |
| `FACEBOOK_APP_SECRET` | Backend (VPS) | Segredo do App Meta |
| `REACT_APP_FACEBOOK_APP_ID` | Frontend (build) | Login OAuth Meta nas páginas de conexão |
| `VERIFY_TOKEN` | Backend (VPS) | Validação de webhooks Meta |
| `EMAIL_SMTP_RELAY_URL` / `EMAIL_SMTP_RELAY_SECRET` | Backend (VPS ou Vercel Worker) | Função E-mail via Worker |
| `REDIS_*` / `DB_*` / `JWT_*` | Backend (VPS) | Filas, banco e autenticação |

> Sem as variáveis Meta na VPS, Facebook e Instagram aparecem na interface, mas a conexão OAuth e os webhooks **não completam**.

---

## Inteligência Artificial

O CRM mantém apenas a **estrutura de integração** para:

| Provedor | Uso típico | Observação |
|----------|------------|------------|
| **OpenAI (GPT)** | Respostas automáticas, resumo, sugestões | API Key em Configurações |
| **Anthropic (Claude)** | Mesmas funções, modelo alternativo | API Key em Configurações |
| **Google (Gemini)** | Mesmas funções, modelo alternativo | API Key em Configurações |

O comprador / cliente final é responsável por obter e inserir as próprias chaves junto a cada provedor.

---

## Licença e uso comercial

O código-fonte é propriedade da **Visão Business**.  
Consulte o arquivo [`LICENSE`](./LICENSE) para os termos aplicáveis ao comprador:

- uso comercial **próprio** permitido  
- **proibida** a revenda do código-fonte em si  

---

## Suporte

**Visão Business** · Produto **VB Solution CRM**  
Repositório base: [github.com/visaobusinesstech/VBSOLUTIONCRMCodigoFonte](https://github.com/visaobusinesstech/VBSOLUTIONCRMCodigoFonte.git)

---

© Visão Business. Todos os direitos reservados.
