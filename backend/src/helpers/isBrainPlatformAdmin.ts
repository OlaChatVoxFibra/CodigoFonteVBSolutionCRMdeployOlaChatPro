/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { isPlatformAdminEmail } from "./isPlatformAdmin";

/** Conta plataforma VB — acesso global a logs/custos Brain.AI */
export function isBrainPlatformAdminEmail(email?: string | null): boolean {
  return isPlatformAdminEmail(email);
}

export function assertBrainPlatformAdminEmail(email?: string | null): void {
  if (!isBrainPlatformAdminEmail(email)) {
    throw new Error("ERR_BRAIN_PLATFORM_ADMIN_ONLY");
  }
}
