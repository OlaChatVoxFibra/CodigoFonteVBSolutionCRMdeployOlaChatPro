/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import nodemailer from "nodemailer";
import "dotenv/config"; // Carrega variáveis do .env
import { resolveMailFromAddress } from "./SmtpTransport";

// Função para testar a conexão SMTP e diagnosticar problemas
export async function testSmtpConnection() {
  try {
    console.log("🔍 Testando conexão SMTP com Gmail...");
    
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT || 587),
      secure: false, // Gmail usa STARTTLS na porta 587
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      }
    });

    // Testa a conexão
    console.log("📡 Verificando credenciais...");
    await transporter.verify();
    console.log("✅ Conexão SMTP verificada com sucesso!");

    // Tenta enviar um email de teste
    console.log("📤 Enviando email de teste...");
    const info = await transporter.sendMail({
      from: resolveMailFromAddress(),
      to: process.env.MAIL_USER, // Envia para si mesmo
      subject: "Teste de Conexão SMTP - VBSolution",
      text: "Este é um email de teste para verificar se a configuração SMTP está funcionando corretamente.",
      html: `<p>Este é um email de teste para verificar se a configuração SMTP está funcionando corretamente.</p>
             <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>`
    });

    console.log("✅ Email de teste enviado com sucesso!");
    console.log("📨 Message ID:", info.messageId);
    
    return { success: true, messageId: info.messageId };
    
  } catch (error: any) {
    console.error("❌ Erro na conexão SMTP:", error.message);
    
    // Diagnóstico específico para problemas comuns do Gmail
    if (error.code === 'EAUTH') {
      console.log("🔐 Problema de autenticação:");
      console.log("- Verifique se o email e senha estão corretos");
      console.log("- Para Gmail, use uma SENHA DE APP, não a senha normal");
      console.log("- Ative a verificação em 2 etapas no Google");
    } else if (error.code === 'ECONNREFUSED') {
      console.log("🌐 Problema de conexão:");
      console.log("- Verifique se o host e porta estão corretos");
      console.log("- Gmail: smtp.gmail.com:587");
    } else if (error.message.includes('Invalid login')) {
      console.log("🔐 Login inválido - provavelmente senha errada ou necessidade de senha de app");
    } else {
      console.log("📋 Detalhes do erro:", error);
    }
    
    return { success: false, error: error.message };
  }
}

// Executa o teste se este arquivo for chamado diretamente
if (require.main === module) {
  testSmtpConnection()
    .then(result => {
      if (result.success) {
        console.log("🎉 Teste concluído com sucesso!");
        process.exit(0);
      } else {
        console.log("💥 Teste falhou!");
        process.exit(1);
      }
    })
    .catch(err => {
      console.error("Erro inesperado:", err);
      process.exit(1);
    });
}