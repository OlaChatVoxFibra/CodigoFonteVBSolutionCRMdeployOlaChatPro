/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** 
 * @TercioSantos-0 |
 * controller/get/todas as configurações de 1 empresa |
 * controller/get/1 configuração específica |
 * controller/put/atualização de 1 configuração |
 * @param:companyId
 */
import { Request, Response } from "express";
import FindCompanySettingsService from "../services/CompaniesSettings/FindCompanySettingsService";
import UpdateCompanySettingsService from "../services/CompaniesSettings/UpdateCompanySettingService";
import FindCompanySettingOneService from "../services/CompaniesSettings/FindCompanySettingOneService";
import SmtpConfig from "../models/SmtpConfig";
import AppError from "../errors/AppError";

type IndexGetCompanySettingQuery = {
  companyId: number;
  column: string;
  data:string;
};

type IndexGetCompanySettingOneQuery = {
  column: string;
};

export const show = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { companyId } = req.user;

    const settings = await FindCompanySettingsService({
      companyId
    });

    return res.status(200).json(settings);
  };


  export const showOne = async (req: Request, res: Response): Promise<Response> => {
    const { column } = req.query as IndexGetCompanySettingOneQuery;
    const { companyId } = req.user;
    
    const setting = await FindCompanySettingOneService({
      companyId,
      column
    });
    
    return res.status(200).json(setting[0]);
  };

export const update = async(
  req: Request,
  res: Response
): Promise<Response> => {
  const {  column, data } = req.body as IndexGetCompanySettingQuery;
  const { companyId } = req.user;

  // Mapear configurações de e-mail antigas para a nova tabela SmtpConfigs
  const smtpFieldMap: Record<string, "smtpHost" | "smtpPort" | "smtpUsername" | "smtpPassword" | "smtpEncryption"> = {
    emailHost: "smtpHost",
    emailPort: "smtpPort",
    emailUser: "smtpUsername",
    emailPassword: "smtpPassword",
    emailEncryption: "smtpEncryption"
  };

  if (smtpFieldMap[column]) {
    const mapped = smtpFieldMap[column];

    // Buscar config SMTP padrão (ou a primeira disponível)
    let item = await SmtpConfig.findOne({ where: { companyId, isDefault: true } });
    if (!item) {
      item = await SmtpConfig.findOne({ where: { companyId } });
    }

    // Se não existir, criar registro mínimo ao definir host ou porta
    if (!item) {
      if (mapped === "smtpHost" || mapped === "smtpPort") {
        const smtpHost = mapped === "smtpHost" ? String(data) : "smtp.local";
        const smtpPort = mapped === "smtpPort" ? parseInt(String(data) || "587", 10) : 587;
        item = await SmtpConfig.create({
          companyId,
          smtpHost,
          smtpPort,
          smtpUsername: null,
          smtpEncryption: "tls",
          isDefault: true
        } as any);
      } else {
        // Para user/password/encryption sem host/port ainda definidos, responder ok sem erro
        // evitando 500 e mantendo compatibilidade com chamadas antigas.
        return res.status(200).json({ response: true, result: null });
      }
    }

    // Atualizar campo específico
    if (mapped === "smtpPassword") {
      (item as any).smtpPassword = String(data || "");
      await item.save();
    } else if (mapped === "smtpPort") {
      const val = parseInt(String(data), 10);
      if (Number.isNaN(val)) {
        throw new AppError("INVALID_SMTP_PORT", 400);
      }
      await item.update({ smtpPort: val });
    } else if (mapped === "smtpEncryption") {
      const enc = String(data || "").toLowerCase();
      const allowed = ["ssl", "tls", "none"];
      await item.update({ smtpEncryption: allowed.includes(enc) ? enc : "tls" } as any);
    } else {
      await item.update({ [mapped]: String(data || "") } as any);
    }

    return res.status(200).json({ response: true, result: item });
  }

  const result = await UpdateCompanySettingsService({
      companyId,
      column,
      data
    });

  return res.status(200).json({ response: true, result: result });
}
