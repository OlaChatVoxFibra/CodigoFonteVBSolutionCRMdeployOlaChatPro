/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, createContext } from "react";

const ReplyMessageContext = createContext();

const ReplyMessageProvider = ({ children }) => {
	const [replyingMessage, setReplyingMessage] = useState(null);
	return (
		<ReplyMessageContext.Provider
			value={{ replyingMessage, setReplyingMessage }}
		>
			{children}
		</ReplyMessageContext.Provider>
	);
};

export { ReplyMessageContext, ReplyMessageProvider };
