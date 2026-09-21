/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Redirect, Switch, Route, useRouteMatch } from "react-router-dom";
import ConnectionsHub from "./ConnectionsHub";
import ConnectionsTypePage from "./ConnectionsTypePage";
import ConnectionsChannelSetupPage from "./ConnectionsChannelSetupPage";
import GithubOAuthCallbackPage from "./GithubOAuthCallbackPage";
import GithubOAuthConnectPage from "./GithubOAuthConnectPage";

/**
 * Hub → administrar (lista) direto; criar/editar em sub-rota.
 */
export default function Connections() {
  const { path } = useRouteMatch();

  return (
    <Switch>
      <Route exact path={path} component={ConnectionsHub} />
      <Route
        path={`${path}/github-oauth/callback`}
        component={GithubOAuthCallbackPage}
      />
      <Route
        path={`${path}/github/oauth/start`}
        component={GithubOAuthConnectPage}
      />
      <Route
        exact
        path={`${path}/:integrationKey/setup`}
        component={ConnectionsChannelSetupPage}
      />
      <Route
        exact
        path={`${path}/:integrationKey/new`}
        component={ConnectionsChannelSetupPage}
      />
      <Route
        exact
        path={`${path}/:integrationKey/edit/:whatsAppId`}
        component={ConnectionsChannelSetupPage}
      />
      <Route
        exact
        path={`${path}/:integrationKey/manage`}
        component={ConnectionsTypePage}
      />
      <Route
        exact
        path={`${path}/:integrationKey`}
        render={({ match }) => (
          <Redirect to={`${path}/${match.params.integrationKey}/manage`} />
        )}
      />
    </Switch>
  );
}
