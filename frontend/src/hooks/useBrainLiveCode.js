/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

const emptySession = () => ({
  isActive: false,
  projectTitle: "",
  files: {},
  streamingPaths: {},
  fileOrder: [],
  activePath: "",
  tick: 0,
  savedTick: 0,
  workspaceId: null
});

export default function useBrainLiveCode(socket, userId, brainProjectId) {
  const [session, setSession] = useState(emptySession);

  const reset = useCallback(() => {
    setSession(emptySession());
  }, []);

  useEffect(() => {
    if (!socket || typeof socket.on !== "function" || !userId) return undefined;

    const event = `brain-code-${userId}`;
    const handler = (payload) => {
      if (!payload?.type) return;
      if (
        brainProjectId &&
        payload.brainProjectId &&
        Number(payload.brainProjectId) !== Number(brainProjectId)
      ) {
        return;
      }

      setSession((prev) => {
        const next = { ...prev, tick: prev.tick + 1 };

        if (payload.type === "file_start") {
          next.isActive = true;
          if (payload.projectTitle) next.projectTitle = payload.projectTitle;
          next.activePath = payload.path;
          next.streamingPaths = { ...prev.streamingPaths, [payload.path]: "" };
          if (payload.path && !prev.fileOrder.includes(payload.path)) {
            next.fileOrder = [...prev.fileOrder, payload.path];
          } else {
            next.fileOrder = prev.fileOrder;
          }
          return next;
        }

        if (payload.type === "file_chunk") {
          next.isActive = true;
          next.activePath = payload.path;
          next.streamingPaths = {
            ...prev.streamingPaths,
            [payload.path]: (prev.streamingPaths[payload.path] || "") + (payload.chunk || "")
          };
          return next;
        }

        if (payload.type === "file_complete") {
          next.isActive = true;
          next.files = { ...prev.files, [payload.path]: payload.content };
          const streamingPaths = { ...prev.streamingPaths };
          delete streamingPaths[payload.path];
          next.streamingPaths = streamingPaths;
          next.activePath = payload.path;
          if (payload.path && !prev.fileOrder.includes(payload.path)) {
            next.fileOrder = [...prev.fileOrder, payload.path];
          } else {
            next.fileOrder = prev.fileOrder;
          }
          if (payload.projectTitle) next.projectTitle = payload.projectTitle;
          if (payload.workspaceId) next.workspaceId = payload.workspaceId;
          return next;
        }

        if (payload.type === "workspace_saved") {
          next.isActive = false;
          next.savedTick = prev.savedTick + 1;
          if (payload.workspaceId) next.workspaceId = payload.workspaceId;
          return next;
        }

        return prev;
      });
    };

    socket.on(event, handler);
    return () => {
      if (socket && typeof socket.off === "function") socket.off(event, handler);
    };
  }, [socket, userId, brainProjectId]);

  const paths = useMemo(() => {
    if (session.fileOrder?.length) return session.fileOrder;
    return Object.keys(session.files || {});
  }, [session.fileOrder, session.files]);

  const displayContent = useMemo(() => {
    const p = session.activePath;
    if (!p) return "";
    if (session.streamingPaths[p] !== undefined) return session.streamingPaths[p];
    return session.files[p] || "";
  }, [session.activePath, session.files, session.streamingPaths]);

  const filesForMerge = useMemo(
    () => paths.map((path) => ({ path, content: session.files[path] || "" })).filter((f) => f.path),
    [paths, session.files]
  );

  const selectPath = useCallback((path) => {
    if (!path) return;
    setSession((prev) => ({ ...prev, activePath: path, tick: prev.tick + 1 }));
  }, []);

  return {
    ...session,
    paths,
    displayContent,
    filesForMerge,
    reset,
    selectPath
  };
}
