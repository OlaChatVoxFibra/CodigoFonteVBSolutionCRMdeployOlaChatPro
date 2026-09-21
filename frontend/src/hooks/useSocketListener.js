/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useEffect, useRef } from 'react';
import { resolveSocketCompanyId } from '../services/socket';

const useSocketListener = (socket, user, eventName, callback) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const cid = resolveSocketCompanyId({ user });
    if (cid != null && socket && typeof socket.on === 'function') {
      const fullEventName = `company-${cid}-${eventName}`;
      
      const handler = (data) => callbackRef.current(data);
      socket.on(fullEventName, handler);

      return () => {
        if (socket && typeof socket.off === 'function') {
          socket.off(fullEventName, handler);
        }
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, user?.companyId, user?.id, eventName]);
};

export default useSocketListener;