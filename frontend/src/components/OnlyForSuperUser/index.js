/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

const OnlyForSuperUser = ({ user, yes, no }) => {
  if (!user || !user.super) {
    return no ? no() : null;
  }

  return yes ? yes() : null;
};

OnlyForSuperUser.defaultProps = {
  user: {},
  yes: () => null,
  no: () => null,
};

export default OnlyForSuperUser;
