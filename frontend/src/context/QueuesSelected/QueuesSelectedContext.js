/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useMemo, createContext } from "react";

const QueueSelectedContext = createContext();

const QueueSelectedProvider = ({ children }) => {
	const [selectedQueuesMessage, setSelectedQueuesMessage] = useState([]);
	const value = useMemo(
		() => ({ selectedQueuesMessage, setSelectedQueuesMessage }),
		[selectedQueuesMessage]
	);
	return (
		<QueueSelectedContext.Provider value={value}>
			{children}
		</QueueSelectedContext.Provider>
	);
};

export { QueueSelectedContext, QueueSelectedProvider };
