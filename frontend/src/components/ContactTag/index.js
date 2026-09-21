/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import NotionTag from "../ui/NotionTag";

const ContactTag = ({ tag }) => {
  if (!tag?.name) return null;
  return <NotionTag label={tag.name} color={tag.color} title={tag.name} fullLabel />;
};

export default ContactTag;
