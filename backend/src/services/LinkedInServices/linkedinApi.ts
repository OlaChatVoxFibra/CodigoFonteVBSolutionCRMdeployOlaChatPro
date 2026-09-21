/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios from "axios";
import AppError from "../../errors/AppError";

const LINKEDIN_API = "https://api.linkedin.com";
const LINKEDIN_VERSION =
  process.env.LINKEDIN_API_VERSION || "202405";

export interface LinkedInProfileInfo {
  id?: string;
  name?: string;
  localizedFirstName?: string;
  localizedLastName?: string;
}

export async function verifyLinkedInAccessToken(
  accessToken: string
): Promise<LinkedInProfileInfo> {
  try {
    const { data } = await axios.get(`${LINKEDIN_API}/v2/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": LINKEDIN_VERSION
      },
      timeout: 25000
    });
    const name =
      data?.name ||
      [data?.given_name, data?.family_name].filter(Boolean).join(" ") ||
      data?.sub ||
      "LinkedIn";
    return {
      id: data?.sub ? String(data.sub) : undefined,
      name: String(name)
    };
  } catch (err: any) {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error_description ||
      err?.message ||
      "Token LinkedIn inválido.";
    throw new AppError(String(msg), 400);
  }
}

export async function sendLinkedInDirectMessage(params: {
  accessToken: string;
  senderUrn: string;
  recipientUrn: string;
  body: string;
}): Promise<{ messageUrn?: string; id?: string }> {
  const text = String(params.body || "").trim();
  if (!text) {
    throw new AppError("Mensagem vazia.", 400);
  }

  const recipient = normalizeLinkedInUrn(params.recipientUrn);
  const sender = normalizeLinkedInUrn(params.senderUrn);

  try {
    const { data } = await axios.post(
      `${LINKEDIN_API}/rest/messages`,
      {
        subject: "Mensagem",
        body: text.slice(0, 8000),
        recipients: [recipient],
        messageType: "MEMBER_TO_MEMBER"
      },
      {
        headers: {
          Authorization: `Bearer ${params.accessToken}`,
          "Content-Type": "application/json",
          "LinkedIn-Version": LINKEDIN_VERSION,
          "X-Restli-Protocol-Version": "2.0.0"
        },
        timeout: 30000
      }
    );
    return {
      messageUrn: data?.value || data?.id,
      id: data?.id
    };
  } catch (err: any) {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.errorDetails?.inputErrors?.[0]?.description ||
      err?.message ||
      "Falha ao enviar mensagem no LinkedIn.";
    throw new AppError(String(msg), 400);
  }
}

export function normalizeLinkedInUrn(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return raw;
  if (raw.startsWith("urn:li:")) return raw;
  if (/^\d+$/.test(raw)) return `urn:li:person:${raw}`;
  return raw;
}

export function resolveLinkedInRecipientUrn(contactNumber: string): string {
  const raw = String(contactNumber || "").trim();
  if (!raw) {
    throw new AppError("Contato sem identificador LinkedIn.", 400);
  }
  if (raw.includes("@linkedin")) {
    return normalizeLinkedInUrn(raw.replace(/@linkedin$/i, "").trim());
  }
  return normalizeLinkedInUrn(raw);
}
