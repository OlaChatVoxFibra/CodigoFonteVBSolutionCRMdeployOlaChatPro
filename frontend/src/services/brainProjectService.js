/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import api from "./api";

export async function listBrainProjects() {
  const { data } = await api.get("/ai-brain/projects");
  return data;
}

export async function ensureBrainProject() {
  const { data } = await api.post("/ai-brain/projects/ensure");
  return data;
}

export async function createBrainProject(payload) {
  const { data } = await api.post("/ai-brain/projects", payload);
  return data;
}

export async function fetchBrainProject(projectId) {
  const { data } = await api.get(`/ai-brain/projects/${projectId}`);
  return data;
}

export async function saveBrainProjectCode(projectId, payload) {
  const { data } = await api.put(`/ai-brain/projects/${projectId}/code`, payload);
  return data;
}

export async function listCodeWorkspaces(brainProjectId) {
  const { data } = await api.get(`/ai-brain/projects/${brainProjectId}/code-workspaces`);
  return data?.items || [];
}

export async function createCodeWorkspace(brainProjectId, { title } = {}) {
  const { data } = await api.post(`/ai-brain/projects/${brainProjectId}/code-workspaces`, { title });
  return data;
}

export async function fetchCodeWorkspace(brainProjectId, workspaceId) {
  const { data } = await api.get(
    `/ai-brain/projects/${brainProjectId}/code-workspaces/${workspaceId}`
  );
  return data;
}

export async function saveCodeWorkspace(brainProjectId, workspaceId, payload) {
  const { data } = await api.put(
    `/ai-brain/projects/${brainProjectId}/code-workspaces/${workspaceId}`,
    payload
  );
  return data;
}

export async function deleteCodeWorkspace(brainProjectId, workspaceId) {
  await api.delete(`/ai-brain/projects/${brainProjectId}/code-workspaces/${workspaceId}`);
}

export async function deleteBrainProject(projectId) {
  const { data } = await api.delete(`/ai-brain/projects/${projectId}`);
  return data;
}
