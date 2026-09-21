/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";
import isSpecificAdmin from "../middleware/isSpecificAdmin";
import * as QueueOptionController from "../controllers/QueueOptionController";
import * as InvoicesController from "../controllers/InvoicesController"

const invoiceRoutes = express.Router();

invoiceRoutes.get("/invoices", isAuth, isSpecificAdmin, InvoicesController.index);
invoiceRoutes.get("/invoices/list", isAuth, isSpecificAdmin, InvoicesController.list);
invoiceRoutes.get("/invoices/all", isAuth, InvoicesController.list);
invoiceRoutes.get("/invoices/:Invoiceid", isAuth, isSpecificAdmin, InvoicesController.show);
invoiceRoutes.put("/invoices/:id", isAuth, isSpecificAdmin, InvoicesController.update);

export default invoiceRoutes;
