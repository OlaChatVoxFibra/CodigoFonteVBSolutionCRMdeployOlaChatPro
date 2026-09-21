/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Gera um PDF texto simples no cliente (sem dependências) e dispara download.
 */
export function downloadMetaHealthReportPdf(data = {}, filename = "relatorio-meta.pdf") {
  const lines = [
    "Relatorio Meta — WhatsApp API Oficial",
    "====================================",
    "",
    `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    "",
    `Status conexao: ${data.status || "—"}`,
    `Cloud API: ${data.phoneCloudStatus || data.meta_phone_status || "—"}`,
    `Qualidade: ${qualityLabel(data.meta_quality_rating)}`,
    `Limite msg: ${data.meta_messaging_limit || "—"}`,
    `Nome verificado: ${data.meta_verified_name || "—"}`,
    `Token valido: ${
      data.tokenValid === true
        ? "Sim"
        : data.tokenValid === false
          ? "Nao"
          : "—"
    }`,
    `App Secret: ${data.facebookAppSecretConfigured ? "OK" : "Faltando no servidor"}`,
    data.tokenError ? `Erro token: ${String(data.tokenError).slice(0, 200)}` : "",
    "",
    "VBSolution CRM"
  ].filter((l) => l !== undefined);

  const pdfBytes = buildSimplePdf(lines);
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function qualityLabel(rating) {
  const r = String(rating || "").toUpperCase();
  if (r === "GREEN") return "Alta (GREEN)";
  if (r === "YELLOW") return "Media (YELLOW)";
  if (r === "RED") return "Baixa (RED)";
  return rating || "—";
}

function escapePdfText(s) {
  return String(s || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, "?");
}

function buildSimplePdf(lines) {
  const pageWidth = 612;
  const pageHeight = 792;
  let y = pageHeight - 54;
  const contentLines = [];
  lines.forEach((raw) => {
    const line = escapePdfText(raw);
    contentLines.push(`BT /F1 11 Tf 48 ${y} Td (${line}) Tj ET`);
    y -= 16;
    if (y < 48) y = pageHeight - 54;
  });
  const stream = contentLines.join("\n");
  const streamLen = stream.length;

  const objects = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push(
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
  );
  objects.push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`
  );
  objects.push(
    `4 0 obj\n<< /Length ${streamLen} >>\nstream\n${stream}\nendstream\nendobj\n`
  );
  objects.push(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
  );

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj) => {
    offsets.push(pdf.length);
    pdf += obj;
  });
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefPos}\n%%EOF`;

  const encoder = new TextEncoder();
  return encoder.encode(pdf);
}
