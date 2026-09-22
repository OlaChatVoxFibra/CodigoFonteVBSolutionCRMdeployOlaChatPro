import QuickMessage from "../../models/QuickMessage";
import {
  IMetaMessageTemplate,
  IMetaMessageTemplateComponents
} from "../../libs/whatsAppOficial/IWhatsAppOficial.interfaces";
import {
  buildHeaderMediaParameter,
  resolveMetaTemplateHeaderMedia,
  extractMetaTemplateHeaderMediaUrls,
  pickHttpsMediaUrl
} from "./resolveMetaTemplateHeaderMedia";
import Whatsapp from "../../models/Whatsapp";
import axios from "axios";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export type MetaTemplateVariablesInput = Record<
  string,
  Record<string, { value?: string; buttonIndex?: number }>
>;

type TemplateVariables = MetaTemplateVariablesInput;

const MEDIA_HEADER_FORMATS = new Set(["IMAGE", "VIDEO", "DOCUMENT"]);

/**
 * Na sincronização do template: se a Meta devolver HTTPS na amostra do HEADER,
 * baixa e guarda em public/companyX/templateMedia e reescreve example com header_url local.
 */
export async function cacheMetaTemplateSampleInExample(
  component: any,
  companyId: number
): Promise<any> {
  const format = String(component?.format || "").toUpperCase();
  if (!MEDIA_HEADER_FORMATS.has(format)) {
    return component?.example ?? null;
  }

  let example = component?.example;
  if (typeof example === "string") {
    try {
      example = JSON.parse(example);
    } catch {
      example = null;
    }
  }
  if (!example || typeof example !== "object") {
    example = {};
  }

  const urls = extractMetaTemplateHeaderMediaUrls({ example });
  const httpsUrl = pickHttpsMediaUrl(urls);
  if (!httpsUrl) {
    return example;
  }

  // Já cacheado no VB Solution
  if (
    Array.isArray(example.header_url) &&
    example.header_url.some(
      (u: string) =>
        typeof u === "string" &&
        u.includes(`/public/company${companyId}/templateMedia/`)
    )
  ) {
    return example;
  }

  try {
    const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
    const destDir = path.join(publicFolder, `company${companyId}`, "templateMedia");
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const extGuess =
      path.extname(new URL(httpsUrl).pathname).split("?")[0] ||
      (format === "VIDEO" ? ".mp4" : format === "DOCUMENT" ? ".pdf" : ".jpg");
    const filename = `${uuidv4()}${extGuess}`;
    const filePath = path.join(destDir, filename);

    const response = await axios.get(httpsUrl, {
      responseType: "arraybuffer",
      timeout: 60000,
      maxRedirects: 5,
      headers: { "User-Agent": "VBSolution-CRM/1.0", Accept: "*/*" },
      validateStatus: s => s >= 200 && s < 400
    });
    fs.writeFileSync(filePath, Buffer.from(response.data));

    const backendUrl = String(process.env.BACKEND_URL || "").replace(/\/$/, "");
    const proxyPort = process.env.PROXY_PORT ? `:${process.env.PROXY_PORT}` : "";
    const publicUrl = backendUrl
      ? `${backendUrl}${proxyPort}/public/company${companyId}/templateMedia/${filename}`
      : null;

    if (publicUrl) {
      example = {
        ...example,
        header_url: [publicUrl],
        header_handle: Array.isArray(example.header_handle)
          ? [publicUrl, ...example.header_handle]
          : [publicUrl],
        vb_cached_media: filename
      };
    }
  } catch (err) {
    console.warn(
      "[cacheMetaTemplateSampleInExample] Não foi possível cachear amostra Meta:",
      (err as any)?.message || err
    );
  }

  return example;
}

/**
 * Monta o payload `template` da Cloud API a partir do QuickMessage (Meta) + variáveis do modal.
 * HEADER IMAGE/VIDEO/DOCUMENT: usa valor do usuário OU amostra do template Meta (example.header_handle).
 */
export async function buildMetaTemplatePayload(
  template: QuickMessage,
  variables: TemplateVariables = {},
  whatsapp?: Whatsapp | null
): Promise<IMetaMessageTemplate> {
  const templateData: IMetaMessageTemplate = {
    name: template.shortcode,
    language: { code: template.language }
  };

  const components = Array.isArray(template.components) ? template.components : [];
  if (!components.length) {
    return templateData;
  }

  for (let index = 0; index < components.length; index++) {
    const component = components[index];
    const rawType = String(component.type || "").toUpperCase();
    const componentType = rawType.toLowerCase().replace("buttons", "button") as
      | "header"
      | "body"
      | "footer"
      | "button";

    const varsForType = variables[componentType] || variables[rawType.toLowerCase()] || {};
    const hasVars = varsForType && Object.keys(varsForType).length > 0;
    const format = String(component.format || "").toUpperCase();
    const isMediaHeader =
      componentType === "header" && MEDIA_HEADER_FORMATS.has(format);

    // HEADER de mídia: sempre incluir no payload (mesmo sem variável no modal)
    if (isMediaHeader) {
      const firstKey = Object.keys(varsForType)[0];
      const userValue = firstKey ? varsForType[firstKey]?.value : undefined;

      const resolved = await resolveMetaTemplateHeaderMedia({
        format,
        userValue,
        component,
        whatsapp: whatsapp || null
      });

      if (!Array.isArray(templateData.components)) {
        templateData.components = [];
      }
      templateData.components.push({
        type: "header",
        parameters: [buildHeaderMediaParameter(resolved)]
      } as IMetaMessageTemplateComponents);
      continue;
    }

    if (!hasVars) {
      continue;
    }

    let newComponent: any;

    if (componentType === "button") {
      let buttons: any[] = [];
      try {
        buttons =
          typeof component.buttons === "string"
            ? JSON.parse(component.buttons)
            : Array.isArray(component.buttons)
              ? component.buttons
              : [];
      } catch {
        buttons = [];
      }

      Object.values(varsForType).forEach((sub: any) => {
        const btnIndex = Number(sub?.buttonIndex ?? 0);
        const button = buttons[btnIndex] || {};
        const buttonType = String(button.type || "QUICK_REPLY").toUpperCase();

        const btnComponent: any = {
          type: "button",
          sub_type: buttonType,
          index: btnIndex,
          parameters: []
        };

        if (buttonType === "COPY_CODE") {
          btnComponent.parameters.push({
            type: "coupon_code",
            coupon_code: sub?.value
          });
        } else {
          btnComponent.parameters.push({
            type: "text",
            text: sub?.value
          });
        }

        if (!Array.isArray(templateData.components)) {
          templateData.components = [];
        }
        templateData.components.push(btnComponent);
      });
      continue;
    }

    newComponent = {
      type: componentType,
      parameters: [] as any[]
    };

    Object.keys(varsForType).forEach(key => {
      const variableValue = varsForType[key]?.value;
      newComponent.parameters.push({
        type: "text",
        text: variableValue
      });
    });

    if (!Array.isArray(templateData.components)) {
      templateData.components = [];
    }
    templateData.components.push(newComponent as IMetaMessageTemplateComponents);
  }

  return templateData;
}
