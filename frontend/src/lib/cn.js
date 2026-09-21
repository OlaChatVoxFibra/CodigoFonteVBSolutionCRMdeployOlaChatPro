/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import clsx from "clsx";

/** Merge class names (shadcn-style helper without Tailwind). */
export function cn(...inputs) {
  return clsx(inputs);
}

export default cn;
