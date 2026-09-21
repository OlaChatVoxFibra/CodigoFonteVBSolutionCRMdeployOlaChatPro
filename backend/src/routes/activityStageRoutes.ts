/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Router } from "express";
import isAuth from "../middleware/isAuth";
import ActivityStageController from "../controllers/ActivityStageController";

const activityStageRoutes = Router();

activityStageRoutes.get("/activity-stages", isAuth, ActivityStageController.list);
activityStageRoutes.put("/activity-stages/bulk", isAuth, ActivityStageController.bulkSave);

export default activityStageRoutes;
