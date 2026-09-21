#!/bin/bash
echo "========================================"
echo "  VALIDAÇÃO API OFICIAL WHATSAPP"
echo "========================================"
echo ""

# Verificar estrutura de arquivos
echo "1. Verificando estrutura de arquivos..."
REQUIRED_FILES=(
    "src/main.ts"
    "src/app.module.ts"
    "src/app.service.ts"
    "src/app.controller.ts"
    "src/resources/v1/webhook/webhook.module.ts"
    "src/resources/v1/webhook/webhook.controller.ts"
    "src/resources/v1/webhook/webhook.service.ts"
    "src/resources/v1/webhook/interfaces/IWebhookWhatsApp.inteface.ts"
    "src/resources/v1/companies/companies.module.ts"
    "src/resources/v1/companies/companies.controller.ts"
    "src/resources/v1/companies/companies.service.ts"
    "src/resources/v1/whatsapp-oficial/whatsapp-oficial.module.ts"
    "src/resources/v1/whatsapp-oficial/whatsapp-oficial.controller.ts"
    "src/resources/v1/whatsapp-oficial/whatsapp-oficial.service.ts"
    "src/resources/v1/send-message-whatsapp/send-message-whatsapp.module.ts"
    "src/resources/v1/send-message-whatsapp/send-message-whatsapp.controller.ts"
    "src/resources/v1/send-message-whatsapp/send-message-whatsapp.service.ts"
    "src/resources/v1/templates-whatsapp/templates-whatsapp.module.ts"
    "src/resources/v1/templates-whatsapp/templates-whatsapp.controller.ts"
    "src/resources/v1/templates-whatsapp/templates-whatsapp.service.ts"
    "src/@core/infra/meta/meta.service.ts"
    "src/@core/infra/database/prisma.service.ts"
    "src/@core/infra/redis/RedisService.service.ts"
    "src/@core/infra/rabbitmq/RabbitMq.service.ts"
    "src/@core/infra/socket/socket.service.ts"
    "prisma/schema.prisma"
    "package.json"
    "tsconfig.json"
)

MISSING=0
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "   ❌ FALTANDO: $file"
        MISSING=$((MISSING+1))
    fi
done

if [ $MISSING -eq 0 ]; then
    echo "   ✅ Todos os arquivos necessários estão presentes"
else
    echo "   ❌ $MISSING arquivos faltando!"
fi

echo ""
echo "2. Verificando sintaxe TypeScript (básico)..."

# Contar erros de sintaxe básicos
SYNTAX_ERRORS=0

# Verificar se imports batem com exports
for ts_file in $(find src -name "*.ts"); do
    # Verificar se tem import duplicado
    if grep -q "import.*from.*from" "$ts_file" 2>/dev/null; then
        echo "   ⚠️  Import duplicado em: $ts_file"
        SYNTAX_ERRORS=$((SYNTAX_ERRORS+1))
    fi
    
    # Verificar se falta fechar chaves
    OPEN_BRACES=$(grep -o '{' "$ts_file" 2>/dev/null | wc -l)
    CLOSE_BRACES=$(grep -o '}' "$ts_file" 2>/dev/null | wc -l)
    if [ "$OPEN_BRACES" != "$CLOSE_BRACES" ]; then
        echo "   ⚠️  Chaves desbalanceadas em: $ts_file"
        SYNTAX_ERRORS=$((SYNTAX_ERRORS+1))
    fi
done

if [ $SYNTAX_ERRORS -eq 0 ]; then
    echo "   ✅ Nenhum erro de sintaxe óbvio encontrado"
fi

echo ""
echo "3. Verificando Prisma Schema..."
if [ -f "prisma/schema.prisma" ]; then
    # Verificar modelos esperados
    if grep -q "model company" prisma/schema.prisma && \
       grep -q "model whatsappOficial" prisma/schema.prisma && \
       grep -q "model sendMessageWhatsApp" prisma/schema.prisma; then
        echo "   ✅ Todos os modelos Prisma estão presentes"
    else
        echo "   ❌ Modelos Prisma faltando"
    fi
fi

echo ""
echo "4. Verificando package.json..."
if [ -f "package.json" ]; then
    DEPS=("@nestjs/common" "@nestjs/config" "@prisma/client" "ioredis" "socket.io-client" "axios")
    for dep in "${DEPS[@]}"; do
        if grep -q "\"$dep\"" package.json; then
            echo "   ✅ $dep"
        else
            echo "   ❌ $dep FALTANDO"
        fi
    done
fi

echo ""
echo "========================================"
echo "  RESUMO"
echo "========================================"
TOTAL_FILES=$(find src -name "*.ts" | wc -l)
echo "Total de arquivos TypeScript: $TOTAL_FILES"
echo ""
echo "Para compilar e testar:"
echo "  npm install --force"
echo "  npx prisma generate"
echo "  npm run build"
echo "========================================"
