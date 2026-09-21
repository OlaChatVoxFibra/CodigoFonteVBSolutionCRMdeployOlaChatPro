/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Switch, Route, useRouteMatch } from "react-router-dom";
import PromptsHub from "./PromptsHub";
import AgentEditorPage from "./AgentEditorPage";

/**
 * Módulo Prompts — URLs canónicas (path base = match de /prompts):
 *
 * | URL                    | Componente      | Função |
 * |------------------------|-----------------|--------|
 * | /prompts               | PromptsHub      | Aba Agentes IA (lista) |
 * | /prompts/create        | AgentEditorPage | Novo agente (sem id) |
 * | /prompts/create/:id    | AgentEditorPage | Editar agente existente (preferido) |
 * | /prompts/:id/edit      | AgentEditorPage | Editar (compat.; não use em links novos) |
 *
 * Ordem do Switch: rotas mais específicas antes de `/:id/edit`, para nunca capturar
 * "create" como id. O Route pai em routes/index.js deve ser `path="/prompts"` sem
 * `exact`, para estes filhos renderizarem.
 */
export default function Prompts() {
  const { path } = useRouteMatch();
  return (
    <Switch>
      <Route exact path={path} component={PromptsHub} />
      <Route exact path={`${path}/create`} component={AgentEditorPage} />
      <Route exact path={`${path}/create/:id`} component={AgentEditorPage} />
      <Route exact path={`${path}/:id/edit`} component={AgentEditorPage} />
    </Switch>
  );
}
