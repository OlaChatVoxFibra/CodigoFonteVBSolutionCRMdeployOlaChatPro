# API Oficial do WhatsApp - Meta Business API

API para integração com o WhatsApp Business API da Meta.

## Requisitos

- Node.js 20+
- PostgreSQL 14+
- Redis 6+
- PM2

## Instalação

### Via Instalador VB Solution

A API Oficial será instalada automaticamente se você selecionar "Sim" durante a instalação.

### Manual

1. Copie o `.env.example` para `.env` e configure as variáveis
2. Instale as dependências: `npm install`
3. Gere o Prisma Client: `npx prisma generate`
4. Execute as migrations: `npx prisma migrate deploy`
5. Compile: `npm run build`
6. Inicie: `pm2 start dist/main.js --name api_oficial`

## Endpoints

- `GET /` - Status da API
- `GET /swagger` - Documentação Swagger
- `POST /v1/webhook/{companyId}/{conexaoId}` - Webhook Meta
- `GET /v1/webhook/{companyId}/{conexaoId}` - Validação Webhook Meta
- `POST /v1/send-message-whatsapp/{token}` - Enviar mensagem
- `GET /v1/templates-whatsapp/{token}` - Listar templates

## Configuração do Webhook no Meta

1. Acesse o Meta Business Suite
2. Configure o Webhook URL: `https://seu-dominio/v1/webhook/{companyId}/{conexaoId}`
3. Use o token da conexão como Verify Token

## Estrutura

```
api_oficial/
├── prisma/           # Schema e migrations do banco
├── src/
│   ├── @core/        # Core da aplicação
│   │   ├── infra/    # Infraestrutura (DB, Redis, RabbitMQ, Socket)
│   │   └── ...
│   └── resources/    # Recursos/Endpoints da API
│       └── v1/       # Versão 1 da API
└── ...
```

## Licença

Proprietário - Visão Business / VB Solution
