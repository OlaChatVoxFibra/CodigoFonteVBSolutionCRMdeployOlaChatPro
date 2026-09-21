/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import api from "./api";

function backendBaseUrl() {
  const base = String(api.defaults.baseURL || "").replace(/\/$/, "");
  return base || `${window.location.protocol}//${window.location.hostname}:3000`;
}

function frontendBaseUrl() {
  return window.location.origin.replace(/\/$/, "");
}

export async function getGithubOAuthStatus() {
  const { data } = await api.get("/ai-brain/github/oauth/status");
  return data;
}

export async function getGithubAuthorizeUrl() {
  const { data } = await api.get("/ai-brain/github/oauth/authorize", {
    params: {
      backendUrl: backendBaseUrl(),
      frontendUrl: frontendBaseUrl()
    }
  });
  return data;
}

export async function getGithubConnection() {
  const { data } = await api.get("/ai-brain/github/connection");
  return data;
}

export async function listGithubRepos() {
  const { data } = await api.get("/ai-brain/github/repos");
  return data?.items || [];
}

export async function disconnectGithub() {
  await api.delete("/ai-brain/github/connection");
}

export async function publishBrainGithubRepo({
  mode,
  repoFullName,
  repoName,
  files,
  description,
  isPrivate,
  token
}) {
  const { data } = await api.post("/ai-brain/code-github/publish", {
    mode,
    repoFullName,
    repoName,
    files,
    description,
    isPrivate,
    token
  });
  return data;
}
