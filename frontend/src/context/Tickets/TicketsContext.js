/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useMemo, createContext } from "react";
import { useHistory } from "react-router-dom";

const TicketsContext = createContext();

const TicketsContextProvider = ({ children }) => {
	const [currentTicket, setCurrentTicket] = useState({ id: null, code: null });
	const [tabOpen, setTabOpen] = useState("open");
	const history = useHistory();

	useEffect(() => {
		if (currentTicket.id !== null) {
			history.push(`/tickets/${currentTicket.uuid}`);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentTicket])

	const value = useMemo(
		() => ({ currentTicket, setCurrentTicket, tabOpen, setTabOpen }),
		[currentTicket, tabOpen]
	);

	return (
		<TicketsContext.Provider value={value}>
			{children}
		</TicketsContext.Provider>
	);
};

export { TicketsContext, TicketsContextProvider };
