/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * @TercioSantos-0 |
 * routes/configurações das empresas |å
 */
import express from "express";
import isAuth from "../middleware/isAuth";

import * as CompanySettingsController from "../controllers/CompanySettingsController";

const companySettingsRoutes = express.Router();

companySettingsRoutes.get(
  "/companySettings/:companyId",
  isAuth,
  CompanySettingsController.show
);
companySettingsRoutes.get(
  "/companySettingOne/",
  isAuth,
  CompanySettingsController.showOne
);
companySettingsRoutes.put(
  "/companySettings/",
  isAuth,
  CompanySettingsController.update
);
companySettingsRoutes.get(
  "/companySettings",
  isAuth,
  CompanySettingsController.show
);

export default companySettingsRoutes;
