/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";

import * as TicketNoteController from "../controllers/TicketNoteController";

const ticketNoteRoutes = express.Router();

ticketNoteRoutes.get(
  "/ticket-notes/list",
  isAuth,
  TicketNoteController.findFilteredList
);

ticketNoteRoutes.get("/ticket-notes", isAuth, TicketNoteController.index);

ticketNoteRoutes.get("/ticket-notes/:id", isAuth, TicketNoteController.show);

ticketNoteRoutes.post("/ticket-notes", isAuth, TicketNoteController.store);

ticketNoteRoutes.put("/ticket-notes/:id", isAuth, TicketNoteController.update);

ticketNoteRoutes.delete(
  "/ticket-notes/:id",
  isAuth,
  TicketNoteController.remove
);

export default ticketNoteRoutes;
