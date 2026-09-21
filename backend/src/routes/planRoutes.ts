/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";
import isSpecificAdmin from "../middleware/isSpecificAdmin";

import * as PlanController from "../controllers/PlanController";

const planRoutes = express.Router();

planRoutes.get("/plans", isAuth, isSpecificAdmin, PlanController.index);
planRoutes.get("/plans/list", isAuth, isSpecificAdmin, PlanController.list);
planRoutes.get("/plans/all", isAuth, isSpecificAdmin, PlanController.list);
planRoutes.get("/plans/:id", isAuth, isSpecificAdmin, PlanController.show);
planRoutes.post("/plans", isAuth, isSpecificAdmin, PlanController.store);
planRoutes.put("/plans/:id", isAuth, isSpecificAdmin, PlanController.update);
planRoutes.delete("/plans/:id", isAuth, isSpecificAdmin, PlanController.remove);

// Public endpoint for registration (no auth). Returns public plans when listPublic === "false"
planRoutes.get("/public/plans", PlanController.list);

export default planRoutes;
