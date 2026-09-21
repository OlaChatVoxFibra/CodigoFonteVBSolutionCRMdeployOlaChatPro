/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Router } from "express";
import apiKeyAuth, { requireApiScope } from "../middleware/apiKeyAuth";
import * as CrmApiV1Controller from "../controllers/CrmApiV1Controller";

const crmApiV1Routes = Router();

crmApiV1Routes.get("/health", CrmApiV1Controller.health);

crmApiV1Routes.get(
  "/me",
  apiKeyAuth,
  requireApiScope("organization:read"),
  CrmApiV1Controller.me
);

crmApiV1Routes.get(
  "/contacts",
  apiKeyAuth,
  requireApiScope("contacts:read"),
  CrmApiV1Controller.listContacts
);

crmApiV1Routes.post(
  "/contacts",
  apiKeyAuth,
  requireApiScope("contacts:write"),
  CrmApiV1Controller.createContact
);

crmApiV1Routes.get(
  "/contacts/:id",
  apiKeyAuth,
  requireApiScope("contacts:read"),
  CrmApiV1Controller.showContact
);

crmApiV1Routes.put(
  "/contacts/:id",
  apiKeyAuth,
  requireApiScope("contacts:write"),
  CrmApiV1Controller.updateContact
);

crmApiV1Routes.get(
  "/activities",
  apiKeyAuth,
  requireApiScope("activities:read"),
  CrmApiV1Controller.listActivities
);

crmApiV1Routes.post(
  "/activities",
  apiKeyAuth,
  requireApiScope("activities:write"),
  CrmApiV1Controller.createActivity
);

crmApiV1Routes.get(
  "/leads-sales",
  apiKeyAuth,
  requireApiScope("leads:read"),
  CrmApiV1Controller.listLeadsSales
);

crmApiV1Routes.post(
  "/leads-sales",
  apiKeyAuth,
  requireApiScope("leads:write"),
  CrmApiV1Controller.createLeadSale
);

crmApiV1Routes.get(
  "/converted-leads",
  apiKeyAuth,
  requireApiScope("leads:read"),
  CrmApiV1Controller.listConvertedLeads
);

crmApiV1Routes.get(
  "/projects",
  apiKeyAuth,
  requireApiScope("leads:read"),
  CrmApiV1Controller.listProjects
);

crmApiV1Routes.get(
  "/tickets",
  apiKeyAuth,
  requireApiScope("tickets:read"),
  CrmApiV1Controller.listTickets
);

crmApiV1Routes.get(
  "/pipelines",
  apiKeyAuth,
  requireApiScope("leads:read"),
  CrmApiV1Controller.listPipelines
);

crmApiV1Routes.get(
  "/dashboard",
  apiKeyAuth,
  requireApiScope("dashboard:read"),
  CrmApiV1Controller.dashboard
);

crmApiV1Routes.get(
  "/users",
  apiKeyAuth,
  requireApiScope("organization:read"),
  CrmApiV1Controller.listUsers
);

crmApiV1Routes.get(
  "/tools",
  apiKeyAuth,
  requireApiScope("tools:execute"),
  CrmApiV1Controller.listTools
);

crmApiV1Routes.post(
  "/tools/:toolName",
  apiKeyAuth,
  requireApiScope("tools:execute"),
  CrmApiV1Controller.executeTool
);

export default crmApiV1Routes;
