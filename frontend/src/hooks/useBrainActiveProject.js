/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  createBrainProject,
  ensureBrainProject,
  fetchBrainProject,
  listBrainProjects
} from "../services/brainProjectService";

const ACTIVE_KEY = (userId) => `brain-active-project-${userId || "guest"}`;

function readActiveId(userId) {
  try {
    const v = localStorage.getItem(ACTIVE_KEY(userId));
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

function writeActiveId(userId, id) {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY(userId), String(id));
    else localStorage.removeItem(ACTIVE_KEY(userId));
  } catch {
    /* ignore */
  }
}

export default function useBrainActiveProject(userId) {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProjectState] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    try {
      const list = await listBrainProjects();
      setProjects(Array.isArray(list) ? list : []);
      return list;
    } catch {
      setProjects([]);
      return [];
    }
  }, []);

  const selectProject = useCallback(
    async (projectId) => {
      if (!projectId) {
        setActiveProjectState(null);
        writeActiveId(userId, null);
        return null;
      }
      const data = await fetchBrainProject(projectId);
      setActiveProjectState(data);
      writeActiveId(userId, projectId);
      return data;
    },
    [userId]
  );

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      let list = await loadProjects();
      if (!list?.length) {
        const created = await ensureBrainProject();
        list = [created];
        setProjects([
          {
            id: created.id,
            title: created.title,
            accentColor: created.accentColor,
            conversationCount: 0
          }
        ]);
      }
      const storedId = readActiveId(userId);
      const pick =
        storedId && list.some((p) => p.id === storedId)
          ? storedId
          : list[0]?.id;
      if (pick) await selectProject(pick);
    } finally {
      setLoading(false);
    }
  }, [loadProjects, selectProject, userId]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const createProject = useCallback(
    async ({ title, description }) => {
      const created = await createBrainProject({ title, description });
      await loadProjects();
      await selectProject(created.id);
      return created;
    },
    [loadProjects, selectProject]
  );

  return {
    projects,
    activeProject,
    loading,
    loadProjects,
    selectProject,
    createProject,
    setActiveProject: setActiveProjectState
  };
};
