/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Router } from "express";
import isAuth from "../middleware/isAuth";

import * as TicketFinalizationReasonController from "../controllers/TicketFinalizationReasonController";

const ticketFinalizationReasonRoutes = Router();

ticketFinalizationReasonRoutes.get(
  "/ticketFinalizationReasons",
  isAuth,
  TicketFinalizationReasonController.index
);

ticketFinalizationReasonRoutes.post(
  "/ticketFinalizationReasons",
  isAuth,
  TicketFinalizationReasonController.store
);

ticketFinalizationReasonRoutes.put(
  "/ticketFinalizationReasons/:id",
  isAuth,
  TicketFinalizationReasonController.update
);

ticketFinalizationReasonRoutes.delete(
  "/ticketFinalizationReasons/:id",
  isAuth,
  TicketFinalizationReasonController.remove
);

export default ticketFinalizationReasonRoutes;
