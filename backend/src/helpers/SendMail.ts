/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import nodemailer from "nodemailer";
import { resolveMailFromAddress } from "./SmtpTransport";

export interface MailData {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function SendMail(mailData: MailData) {
  const options: any = {
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    secure: String(process.env.MAIL_SECURE || "false").toLowerCase() === "true",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  };

  const transporter = nodemailer.createTransport(options);

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: resolveMailFromAddress(),
    to: mailData.to, // list of receivers
    subject: mailData.subject, // Subject line
    text: mailData.text, // plain text body
    html: mailData.html || mailData.text // html body
  });

  console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}

// Função alternativa para ambiente local sem Redis
// Esta função pode ser usada diretamente quando o sistema de filas não está disponível
export async function SendMailDirect(mailData: MailData) {
  try {
    // Usa a mesma função principal
    return await SendMail(mailData);
  } catch (error) {
    console.error("Erro no envio direto de email:", error);
    throw error;
  }
}

export async function SendMailSmart(mailData: MailData) {
  try {
    const result = await SendMailDirect(mailData);
    return { success: true, method: "direct", result };
  } catch (error) {
    console.error("Erro no SendMailSmart:", error);
    throw error;
  }
}
