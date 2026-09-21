/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

function getRandomHexColor() {
  // Gerar valores aleatórios para os componentes de cor
  const red = Math.floor(Math.random() * 256); // Valor entre 0 e 255
  const green = Math.floor(Math.random() * 256); // Valor entre 0 e 255
  const blue = Math.floor(Math.random() * 256); // Valor entre 0 e 255

  // Converter os componentes de cor em uma cor hexadecimal
  const hexColor = `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;

  return hexColor;
}

export default getRandomHexColor;