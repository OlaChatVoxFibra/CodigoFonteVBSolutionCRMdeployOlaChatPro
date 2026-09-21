/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import { Op } from "sequelize";
import Inventory from "../models/Inventory";
import XLSX from "xlsx";
import {
  computeInventoryStatus,
  normalizeInventoryReplyConfig
} from "../helpers/agentInventoryDefaults";

type IndexQuery = {
  searchParam?: string;
  pageNumber?: string;
};

function pickInventoryBody(
  body: Record<string, any>,
  opts?: { includeCompanyId?: number }
): Record<string, unknown> {
  const qty = Number(body.quantity ?? 0) || 0;
  const images = Array.isArray(body.images)
    ? body.images.map((u: any) => String(u || "").trim()).filter(Boolean)
    : body.images == null
      ? undefined
      : [];
  const out: Record<string, unknown> = {
    name: body.name != null ? String(body.name).trim() : undefined,
    price: body.price != null ? Number(body.price) || 0 : undefined,
    quantity: body.quantity != null ? qty : undefined,
    currency: body.currency != null ? String(body.currency || "BRL").toUpperCase() : undefined,
    image: body.image !== undefined ? body.image || null : undefined,
    sku: body.sku !== undefined ? body.sku || null : undefined,
    category: body.category !== undefined ? body.category || null : undefined,
    brand: body.brand !== undefined ? body.brand || null : undefined,
    description: body.description !== undefined ? body.description || null : undefined,
    buyLink: body.buyLink !== undefined ? body.buyLink || null : undefined,
    images: images !== undefined ? images : undefined,
    replySettings:
      body.replySettings !== undefined
        ? body.replySettings
          ? normalizeInventoryReplyConfig(body.replySettings)
          : null
        : undefined,
    status:
      body.quantity != null || body.status != null
        ? computeInventoryStatus(qty, body.status)
        : undefined
  };
  Object.keys(out).forEach((k) => {
    if (out[k] === undefined) delete out[k];
  });
  if (opts?.includeCompanyId != null) {
    out.companyId = opts.includeCompanyId;
  }
  return out;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { searchParam, pageNumber } = req.query as IndexQuery;

  const where: any = { companyId };
  if (searchParam) {
    where.name = { [Op.iLike]: `%${searchParam}%` };
  }

  const limit = 20;
  const page = +(pageNumber || 1);
  const offset = limit * (page - 1);

  const { rows, count } = await Inventory.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  const hasMore = count > offset + rows.length;
  const inventory = rows;
  return res.json({ inventory, count, hasMore });
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const record = await Inventory.findByPk(id);
  return res.json(record);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const data = pickInventoryBody(req.body || {}, { includeCompanyId: companyId });
  if (!data.name) {
    return res.status(400).json({ error: "name is required" });
  }
  if (data.quantity == null) data.quantity = 0;
  if (data.currency == null) data.currency = "BRL";
  if (data.status == null) {
    data.status = computeInventoryStatus(Number(data.quantity) || 0, null);
  }

  const record = await Inventory.create(data as any);
  return res.status(201).json(record);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const record = await Inventory.findOne({ where: { id, companyId } });
  if (!record) {
    return res.status(404).json({ error: "Not found" });
  }
  const data = pickInventoryBody(req.body || {});
  if (data.quantity != null && data.status == null) {
    data.status = computeInventoryStatus(Number(data.quantity) || 0, record.status);
  }
  await record.update(data);
  return res.json(record);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const record = await Inventory.findOne({ where: { id, companyId } });
  if (!record) {
    return res.status(404).json({ error: "Not found" });
  }

  await record.destroy();
  return res.status(200).json({ message: "Inventory deleted" });
};

export const bulkReplySettings = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const ids = Array.isArray(req.body?.ids)
    ? req.body.ids.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n) && n > 0)
    : [];
  if (!ids.length) {
    return res.status(400).json({ error: "ids is required" });
  }
  const replySettings = normalizeInventoryReplyConfig(req.body?.replySettings || null);
  const rows = await Inventory.findAll({
    where: { id: { [Op.in]: ids }, companyId }
  });
  for (const row of rows) {
    await row.update({ replySettings });
  }
  return res.json({ updated: rows.length, items: rows });
};

export const importFile = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const file = (req as any).file;
  if (!file) {
    return res.status(400).json({ error: "File is required" });
  }
  try {
    const workbook = XLSX.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    const items = rows.map((r) => {
      const name = String(r.name || r.Nome || r.Item || "").trim();
      const price = Number(r.price ?? r.Preco ?? r.Valor ?? 0) || 0;
      const quantity = Number(r.quantity ?? r.Quantidade ?? r.Qtd ?? 0) || 0;
      const currency = String(r.currency || r.Moeda || "BRL").toUpperCase();
      const status = String(r.status || r.Status || "") || undefined;
      const sku = r.sku || r.SKU || r.Codigo || null;
      const category = r.category || r.Categoria || null;
      const brand = r.brand || r.Marca || null;
      const description = r.description || r.Descricao || null;
      const image = r.image || r.Imagem || null;
      const buyLink = r.buyLink || r.link || r.Link || null;

      return {
        name,
        price,
        quantity,
        currency,
        status: computeInventoryStatus(quantity, status),
        sku,
        category,
        brand,
        description,
        image,
        buyLink,
        companyId
      };
    }).filter(i => i.name);

    if (!items.length) {
      return res.status(400).json({ error: "No valid rows" });
    }

    const created = await Inventory.bulkCreate(items, { returning: true });
    return res.status(201).json({ created: created.length, items: created });
  } catch (err) {
    return res.status(500).json({ error: "Failed to import file" });
  }
};
