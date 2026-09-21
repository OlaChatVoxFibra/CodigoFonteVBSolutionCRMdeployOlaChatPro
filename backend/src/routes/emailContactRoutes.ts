/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";
import * as EmailContactController from "../controllers/EmailContactController";

const routes = express.Router();

routes.get("/email/contacts", isAuth, EmailContactController.index);
routes.post("/email/contacts", isAuth, EmailContactController.store);
routes.put("/email/contacts/:id", isAuth, EmailContactController.update);
routes.delete("/email/contacts/:id", isAuth, EmailContactController.remove);

export default routes;

