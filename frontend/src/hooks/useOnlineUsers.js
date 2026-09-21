/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/Auth/AuthContext";

const useOnlineUsers = () => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { socket } = useContext(AuthContext);

  useEffect(() => {
    if (!socket) return;

    socket.on("users:online", (users) => {
      setOnlineUsers(users);
    });

    socket.on("user:online", ({ userId, lastSeen }) => {
      setOnlineUsers((prev) => {
        const userIndex = prev.findIndex((u) => u.id === userId);
        if (userIndex === -1) return prev;

        const updatedUsers = [...prev];
        updatedUsers[userIndex] = {
          ...updatedUsers[userIndex],
          online: true,
          lastSeen,
        };
        return updatedUsers;
      });
    });

    socket.on("user:offline", ({ userId, lastSeen }) => {
      setOnlineUsers((prev) => {
        const userIndex = prev.findIndex((u) => u.id === userId);
        if (userIndex === -1) return prev;

        const updatedUsers = [...prev];
        updatedUsers[userIndex] = {
          ...updatedUsers[userIndex],
          online: false,
          lastSeen,
        };
        return updatedUsers;
      });
    });

    socket.on("user:new", ({ user }) => {
      setOnlineUsers((prev) => {
        if (prev.some((u) => u.id === user.id)) return prev;
        return [...prev, { ...user, online: true }];
      });
    });

    const heartbeatInterval = setInterval(() => {
      socket.emit("heartbeat");
    }, 15000);

    return () => {
      socket.off("users:online");
      socket.off("user:online");
      socket.off("user:offline");
      socket.off("user:new");
      clearInterval(heartbeatInterval);
    };
  }, [socket]);

  return onlineUsers;
};

export default useOnlineUsers;
