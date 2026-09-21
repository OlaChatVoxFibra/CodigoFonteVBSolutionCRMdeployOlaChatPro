/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";

import * as ContactListItemController from "../controllers/ContactListItemController";

const routes = express.Router();

routes.get(
  "/contact-list-items/list",
  isAuth,
  ContactListItemController.findList
);

routes.get("/contact-list-items", isAuth, ContactListItemController.index);

routes.get("/contact-list-items/:id", isAuth, ContactListItemController.show);

routes.post("/contact-list-items", isAuth, ContactListItemController.store);

routes.put("/contact-list-items/:id", isAuth, ContactListItemController.update);

routes.delete(
  "/contact-list-items/:id",
  isAuth,
  ContactListItemController.remove
);

export default routes;
