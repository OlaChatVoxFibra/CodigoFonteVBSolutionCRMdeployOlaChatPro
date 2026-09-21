/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import io from "socket.io-client";
import api from "../services/api";
import { getBackendUrl } from "../config";


class SocketWorker {
  constructor(companyId , userId) {
    const sessionToken = api.defaults.headers.Authorization

    if (!SocketWorker.instance) {
      this.companyId = Number(companyId);
      this.userId = userId;
      this.token = sessionToken
      this.socket = null;
      this.configureSocket();
      this.eventListeners = {};
      SocketWorker.instance = this;

    } else {
      const prev = Number(SocketWorker.instance.companyId);
      const next = Number(companyId);
      if (Number.isFinite(next) && next > 0 && prev !== next) {
        SocketWorker.instance.disconnect();
        SocketWorker.instance.companyId = next;
        SocketWorker.instance.userId = userId;
        SocketWorker.instance.token = sessionToken;
        SocketWorker.instance.eventListeners = {};
        SocketWorker.instance.configureSocket();
      }
    }

    return SocketWorker.instance;
  }

  configureSocket() {
    const backendUrl = getBackendUrl();
    const cid = Number(this.companyId);
    if (!Number.isFinite(cid) || cid <= 0) {
      return;
    }
    this.socket = io(`${backendUrl}/${cid}`, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      // transports: ["websocket", "polling", "flashsocket"],
      // pingTimeout: 18000,
      // pingInterval: 18000,
      query: { userId: this.userId, token: this.token }
    });

    this.socket.on("connect", () => {
      console.log("Conectado ao servidor Socket.IO");
    });

    this.socket.on("disconnect", (reason) => {
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.debug("Socket.IO desconectado:", reason);
      }
      this.reconnectAfterDelay();
    });
  }

  // Adiciona um ouvinte de eventos
  on(event, callback) {

    this.connect();
    this.socket.on(event, callback);

    // Armazena o ouvinte no objeto de ouvintes
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  // Emite um evento
  emit(event, data) {
    this.connect();
    this.socket.emit(event, data);
  }

  // Desconecta um ou mais ouvintes de eventos
  off(event, callback) {
    // console.log(event, callback)
    this.connect();
    if (this.eventListeners[event]) {
      // console.log("Desconectando do servidor Socket.IO:", event, callback);
      if (callback) {
        // Desconecta um ouvinte específico
        this.socket.off(event, callback);
        this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
      } else {
        // console.log("DELETOU EVENTOS DO SOCKET:", this.eventListeners[event]);

        // Desconecta todos os ouvintes do evento
        this.eventListeners[event].forEach(cb => this.socket.off(event, cb));
        delete this.eventListeners[event];
      }
      // console.log("EVENTOS DO SOCKET:", this.eventListeners);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null
      SocketWorker.instance = null
      console.log("Socket desconectado manualmente");
    }
  }

  reconnectAfterDelay() {
    setTimeout(() => {
      if (!this.socket) {
        this.configureSocket();
        return;
      }
      if (!this.socket.connected) {
        try {
          this.socket.connect();
        } catch {
          this.configureSocket();
        }
      }
    }, 1000);
  }

  // Garante que o socket esteja conectado
  connect() {
    if (!this.socket) {
      this.configureSocket();
    } else if (!this.socket.connected) {
      try {
        this.socket.connect();
      } catch {
        /* ignore */
      }
    }
  }

  forceReconnect() {

  }
}

// const instance = (companyId, userId) => new SocketWorker(companyId,userId);
const instance = (companyId, userId) => new SocketWorker(companyId, userId);

export default instance;
