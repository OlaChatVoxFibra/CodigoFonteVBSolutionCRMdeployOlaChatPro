/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import QuickMessage from "../../models/QuickMessage";
import {
  IMetaMessageTemplate,
  IMetaMessageTemplateComponents
} from "../../libs/whatsAppOficial/IWhatsAppOficial.interfaces";

export type MetaTemplateVariablesInput = Record<
  string,
  Record<string, { value?: string; buttonIndex?: number }>
>;

const MEDIA_FORMATS = new Set(["IMAGE", "VIDEO", "DOCUMENT"]);

function normalizeLanguage(code?: string | null): string {
  const raw = String(code || "pt_BR").trim().replace(/-/g, "_");
  if (!raw) return "pt_BR";
  return raw;
}

function sortedEntries(
  bucket: Record<string, { value?: string; buttonIndex?: number }>
): Array<[string, { value?: string; buttonIndex?: number }]> {
  return Object.entries(bucket || {}).sort((a, b) => {
    const na = Number(a[0]);
    const nb = Number(b[0]);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return String(a[0]).localeCompare(String(b[0]));
  });
}

function headerParam(format: string | null | undefined, value: string) {
  const f = String(format || "TEXT").toUpperCase();
  const v = String(value || "").trim();
  if (f === "IMAGE") return { type: "image" as const, image: { link: v } };
  if (f === "VIDEO") return { type: "video" as const, video: { link: v } };
  if (f === "DOCUMENT")
    return { type: "document" as const, document: { link: v } };
  return { type: "text" as const, text: v };
}

function parseButtons(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Monta payload de template Meta a partir de QuickMessage sincronizado + variáveis.
 * Suporta HEADER text/media, BODY, BUTTONS (URL / COPY_CODE). Não envia FOOTER com params.
 */
export const buildMetaTemplatePayload = (
  template: QuickMessage,
  variables: MetaTemplateVariablesInput = {}
): IMetaMessageTemplate => {
  const builtComponents: IMetaMessageTemplateComponents[] = [];
  const templateData: IMetaMessageTemplate = {
    name: String(template.shortcode || "").trim(),
    language: {
      code: normalizeLanguage(template.language)
    }
  };

  if (!templateData.name) {
    throw new Error("Template Meta sem shortcode (name).");
  }

  const components = Array.isArray(template.components)
    ? template.components
    : [];
  const vars = variables || {};

  for (const component of components) {
    const rawType = String(component.type || "").toUpperCase();
    if (rawType === "FOOTER") continue;

    if (rawType === "HEADER") {
      const format = String(component.format || "TEXT").toUpperCase();
      const headerBucket = vars.header || {};
      const entries = sortedEntries(headerBucket);

      if (MEDIA_FORMATS.has(format)) {
        const value = entries[0]?.[1]?.value || "";
        if (!String(value).trim()) {
          throw new Error(
            `Template exige um link de mídia no HEADER (${format}).`
          );
        }
        builtComponents.push({
          type: "header",
          parameters: [headerParam(format, value)]
        } as IMetaMessageTemplateComponents);
      } else if (entries.length > 0) {
        builtComponents.push({
          type: "header",
          parameters: entries.map(([, e]) =>
            headerParam("TEXT", e?.value || "")
          )
        } as IMetaMessageTemplateComponents);
      }
      continue;
    }

    if (rawType === "BODY") {
      const bodyBucket = vars.body || {};
      const text = String(component.text || "");
      const requiredIndexes = Array.from(
        new Set(
          [...text.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]))
        )
      ).sort((a, b) => a - b);

      const parameters =
        requiredIndexes.length > 0
          ? requiredIndexes.map((idx) => {
              const entry =
                bodyBucket[String(idx)] ||
                bodyBucket[idx as unknown as string];
              return {
                type: "text" as const,
                text: String(entry?.value ?? "")
              };
            })
          : sortedEntries(bodyBucket).map(([, e]) => ({
              type: "text" as const,
              text: String(e?.value ?? "")
            }));

      if (parameters.length === 0) continue;

      if (
        requiredIndexes.length > 0 &&
        parameters.some((p) => !String(p.text || "").length)
      ) {
        throw new Error(
          `Preencha todas as variáveis do BODY do template ({{${requiredIndexes.join(
            "}}, {{"
          )}}}).`
        );
      }

      builtComponents.push({
        type: "body",
        parameters
      } as IMetaMessageTemplateComponents);
      continue;
    }

    if (rawType === "BUTTONS" || rawType === "BUTTON") {
      const buttons = parseButtons(component.buttons);
      const buttonBucket = vars.button || vars.buttons || {};
      const entries = sortedEntries(buttonBucket);

      buttons.forEach((button: any, btnIndex: number) => {
        const btnType = String(button?.type || "").toUpperCase();
        // QUICK_REPLY não precisa de parameters no envio
        if (btnType === "QUICK_REPLY") return;

        const match = entries.find(
          ([, e]) =>
            Number(e?.buttonIndex) === btnIndex ||
            Number(e?.buttonIndex) === Number(button?.index)
        );
        if (!match && btnType !== "URL" && btnType !== "COPY_CODE") return;

        // URL estático sem variável dinâmica: não enviar componente button
        if (btnType === "URL" && !match && !String(button?.example || "").includes("{{")) {
          return;
        }

        const value = String(match?.[1]?.value ?? "").trim();
        if ((btnType === "URL" || btnType === "COPY_CODE") && !value) {
          // sem valor, pula (template pode ter URL fixa)
          if (btnType === "COPY_CODE") {
            throw new Error("Template exige o código do cupom no botão COPY_CODE.");
          }
          return;
        }

        const parameters: any[] = [];
        if (btnType === "COPY_CODE") {
          parameters.push({ type: "coupon_code", coupon_code: value });
        } else if (btnType === "URL") {
          parameters.push({ type: "text", text: value });
        }

        if (parameters.length === 0) return;

        builtComponents.push({
          type: "button",
          sub_type: btnType.toLowerCase(),
          index: String(btnIndex),
          parameters
        } as IMetaMessageTemplateComponents);
      });
    }
  }

  if (builtComponents.length > 0) {
    templateData.components = builtComponents;
  }

  return templateData;
};
