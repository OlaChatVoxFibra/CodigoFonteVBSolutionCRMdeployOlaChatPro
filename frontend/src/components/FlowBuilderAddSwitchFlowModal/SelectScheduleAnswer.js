/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";

export function SelectScheduleAnswer() {
  return (
    <div>
      <div class="block w-full">
        <label
          for="countries"
          class="block mb-2 text-sm font-medium text-gray-600 w-full"
        >
          Tempo para resposta do usuário:
        </label>
        <select
          id="countries"
          class="h-12 border bg-white border-gray-300 text-gray-600 text-base rounded-lg block w-full py-2.5 px-4 focus:outline-none"
          onChange={(e) => console.log(e.target.value)}
        >
          <option value="1h">1 Hora</option>
          <option value="2h">2 Horas</option>
          <option value="3h">3 Horas</option>
          <option value="4h">4 Horas</option>
        </select>
      </div>
    </div>
  );
}
