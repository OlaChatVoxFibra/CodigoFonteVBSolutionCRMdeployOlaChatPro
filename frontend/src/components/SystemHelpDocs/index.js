/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import HelpDocContent from "./HelpDocContent";
import { SYSTEM_HELP } from "./topics";

const SystemHelpDocs = ({ topic }) => {
  const data = SYSTEM_HELP[topic];

  if (!data) {
    return (
      <HelpDocContent
        intro="Documentação em preparação para esta página."
        sections={[]}
      />
    );
  }

  return <HelpDocContent intro={data.intro} sections={data.sections} />;
};

export { SYSTEM_HELP };
export default SystemHelpDocs;
