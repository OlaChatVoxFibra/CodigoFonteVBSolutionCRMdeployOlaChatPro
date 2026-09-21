/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// src/routes/birthdayRoutes.ts
import express from "express";
import isAuth from "../middleware/isAuth";
import * as BirthdayController from "../controllers/BirthdayController";

const birthdayRoutes = express.Router();

// Buscar aniversariantes do dia
birthdayRoutes.get("/birthdays/today", isAuth, BirthdayController.getTodayBirthdays);

// Configurações de aniversário
birthdayRoutes.get("/birthdays/settings", isAuth, BirthdayController.getBirthdaySettings);
birthdayRoutes.put("/birthdays/settings", isAuth, BirthdayController.updateBirthdaySettings);

// Enviar mensagem de aniversário manualmente
birthdayRoutes.post("/birthdays/send-message", isAuth, BirthdayController.sendBirthdayMessage);

// Testar mensagem de aniversário
birthdayRoutes.post("/birthdays/test-message", isAuth, BirthdayController.testBirthdayMessage);

// Processar aniversários manualmente (admin only)
birthdayRoutes.post("/birthdays/process", isAuth, BirthdayController.processTodayBirthdays);

// Debug do sistema de aniversários
birthdayRoutes.get("/birthdays/debug", isAuth, BirthdayController.debugBirthdaySystem);

// Diagnóstico de aniversário específico
birthdayRoutes.get("/birthdays/diagnose", isAuth, BirthdayController.diagnoseBirthday);

export default birthdayRoutes;