/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import Version from "../models/Versions";
import { isDevNoDb } from "../helpers/devNoDbAuth";

export const index = async (req: Request, res: Response): Promise<Response> => {
    if (isDevNoDb()) {
      return res.status(200).json({ version: "local-dev" });
    }
    const version = await Version.findByPk(1);
    return res.status(200).json({
        version: version.versionFrontend
    });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
    if (isDevNoDb()) {
      return res.status(200).json({ version: req.body?.version || "local-dev" });
    }
    const version = await Version.findByPk(1);
    version.versionFrontend = req.body.version;
    await version.save();

    return res.status(200).json({
        version: version.versionFrontend
    });
};
