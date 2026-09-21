/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Invoices from "../../models/Invoices";
import AppError from "../../errors/AppError";

const DeleteInvoiceService = async (id: string | number): Promise<void> => {
  const invoice = await Invoices.findOne({
    where: { id }
  });

  if (!invoice) {
    throw new AppError("ERR_NO_INVOICE_FOUND", 404);
  }

  await invoice.destroy();
};

export default DeleteInvoiceService;
