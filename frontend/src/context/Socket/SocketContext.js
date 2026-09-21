/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { createContext } from "react";
import openSocket from "socket.io-client";
import { getBackendUrl } from "../../config";

const socketManager = {
	currentSocket: null,

	GetSocket: function () {
		const publicToken = localStorage.getItem("public-token");

		if (publicToken !== this.currentToken) {
			if (this.currentSocket) {
				this.currentSocket.disconnect();
			}

			this.currentToken = publicToken;
			this.currentSocket = openSocket(getBackendUrl(), {
				transports: ["websocket"],
				pingTimeout: 18000,
				pingInterval: 18000,
				query: publicToken ? { token: publicToken } : {},
				//auth: publicToken ? { token: publicToken } : {},
			});
		}
		return this.currentSocket;
	},

	onConnect: function (callbackConnect) {
		if (!this.currentSocket) {
			this.GetSocket();
		}
		if (this.currentSocket && typeof this.currentSocket.on === "function") {
			if (this.currentSocket.connected) {
				callbackConnect();
			}
			this.currentSocket.on("connect", callbackConnect);
		}
	},
};

const SocketContext = createContext()

export { SocketContext, socketManager };
