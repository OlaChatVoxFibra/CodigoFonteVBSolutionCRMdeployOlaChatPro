/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

interface Timeout {
  id: number;
  timeout: NodeJS.Timeout;
}

const timeouts: Timeout[] = [];

const findAndClearTimeout = (ticketId: number) => {
  if (timeouts.length > 0) {
    const timeoutIndex = timeouts.findIndex(timeout => timeout.id === ticketId);

    if (timeoutIndex !== -1) {
      clearTimeout(timeouts[timeoutIndex].timeout);
      timeouts.splice(timeoutIndex, 1);
    }
  }
};

const debounce = (
  func: { (): Promise<void>; (...args: never[]): void },
  wait: number,
  ticketId: number
) => {
  return function executedFunction(...args: never[]): void {
    const later = () => {
      findAndClearTimeout(ticketId);
      func(...args);
    };

    findAndClearTimeout(ticketId);

    const newTimeout = {
      id: ticketId,
      timeout: setTimeout(later, wait)
    };

    timeouts.push(newTimeout);
  };
};

export { debounce };
