/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { createContext, useMemo } from "react";

import useAuth from "../../hooks/useAuth.js";

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
	const { loading, user, isAuth, handleLogin, handleGoogleLoginComplete, handleLogout, socket } = useAuth();

	const value = useMemo(
		() => ({ loading, user, isAuth, handleLogin, handleGoogleLoginComplete, handleLogout, socket }),
		[loading, user, isAuth, handleLogin, handleGoogleLoginComplete, handleLogout, socket]
	);

	return (
		<AuthContext.Provider value={value}>
			{children}
		</AuthContext.Provider>
	);
};

export { AuthContext, AuthProvider };