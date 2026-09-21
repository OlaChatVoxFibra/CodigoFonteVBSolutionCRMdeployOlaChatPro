/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// Teste simples para verificar se as variáveis de ambiente estão carregadas
console.log("🔍 Verificando variáveis de ambiente...");

const envVars = {
  MAIL_HOST: process.env.MAIL_HOST,
  MAIL_PORT: process.env.MAIL_PORT, 
  MAIL_USER: process.env.MAIL_USER,
  MAIL_PASS: process.env.MAIL_PASS ? '***CONFIGURADO***' : 'NÃO CONFIGURADO',
  MAIL_FROM: process.env.MAIL_FROM,
  MAIL_SECURE: process.env.MAIL_SECURE
};

console.log("📋 Variáveis de email:", envVars);

// Verifica se está tentando usar localhost (problema comum)
if (envVars.MAIL_HOST && envVars.MAIL_HOST.includes('localhost')) {
  console.log("❌ PROBLEMA: Configurado para localhost em vez de smtp.gmail.com");
} else if (envVars.MAIL_HOST === 'smtp.gmail.com') {
  console.log("✅ Host SMTP configurado corretamente");
} else {
  console.log("⚠️  Host SMTP:", envVars.MAIL_HOST);
}

console.log("\n🎯 Para funcionar, REINICIE o servidor após alterar o .env!");