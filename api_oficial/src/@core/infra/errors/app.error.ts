/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export class AppError extends Error {
  public message: string;
  public code: number;

  constructor(message: string, code = 400) {
    super(message);
    this.message = message;
    this.code = code;
  }
}
