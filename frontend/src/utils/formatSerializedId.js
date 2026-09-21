/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { FormatMask } from './FormatMask';

const formatSerializedId = (serializedId) => {
  const formatMask = new FormatMask();
  const number = serializedId?.replace('@c.us', '');

  return formatMask.setPhoneFormatMask(number)?.replace('+55', '🇧🇷');
};

export default formatSerializedId;
