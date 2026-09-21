/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, createContext } from "react";
import PropTypes from "prop-types";

const EditMessageContext = createContext();

const EditMessageProvider = ({ children }) => {
	const [editingMessage, setEditingMessage] = useState(null);

	return (
		<EditMessageContext.Provider
			value={{ editingMessage, setEditingMessage }}
		>
			{children}
		</EditMessageContext.Provider>
	);
};

export { EditMessageContext, EditMessageProvider};
