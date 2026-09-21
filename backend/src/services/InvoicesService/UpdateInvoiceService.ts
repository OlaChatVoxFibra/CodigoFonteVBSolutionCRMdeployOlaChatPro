/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AppError from "../../errors/AppError";
import Invoice from "../../models/Invoices";

interface InvoiceData {
  status: string;
  id?: number | string;
}

const UpdateInvoiceService = async (InvoiceData: InvoiceData): Promise<Invoice> => {
  const { id, status } = InvoiceData;

  const invoice = await Invoice.findByPk(id);

  if (!invoice) {
    throw new AppError("ERR_NO_INVOICE_FOUND", 404);
  }

  await invoice.update({
    status,
  });

  return invoice;
};

export default UpdateInvoiceService;
