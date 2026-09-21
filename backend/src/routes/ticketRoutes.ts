/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";

import * as TicketController from "../controllers/TicketController";

const ticketRoutes = express.Router();

ticketRoutes.get("/tickets", isAuth, TicketController.index);

ticketRoutes.get(
  "/tickets/preview-for-contact",
  isAuth,
  TicketController.previewForContact
);

ticketRoutes.get("/tickets/:ticketId", isAuth, TicketController.show);

ticketRoutes.post(
  "/tickets/:ticketId/trigger-flow",
  isAuth,
  TicketController.triggerFlow
);

ticketRoutes.get("/tickets-log/:ticketId", isAuth, TicketController.showLog);

ticketRoutes.get("/ticket/kanban", isAuth, TicketController.kanban);

ticketRoutes.get("/ticketreport/reports", isAuth, TicketController.indexReport);

ticketRoutes.get(
  "/ticketreport/vendas",
  isAuth,
  TicketController.relatorioVendas
);

ticketRoutes.get("/tickets/u/:uuid", isAuth, TicketController.showFromUUID);

ticketRoutes.post("/tickets", isAuth, TicketController.store);

ticketRoutes.put("/tickets/:ticketId", isAuth, TicketController.update);

ticketRoutes.delete("/tickets/:ticketId", isAuth, TicketController.remove);

ticketRoutes.post("/tickets/closeAll", isAuth, TicketController.closeAll);

ticketRoutes.post("/tickets/acceptAll", isAuth, TicketController.acceptAll);

ticketRoutes.post(
  "/transfer-tickets",
  isAuth,
  TicketController.transferTickets
);

export default ticketRoutes;
