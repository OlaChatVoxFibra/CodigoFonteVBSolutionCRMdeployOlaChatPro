/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Invoice from "../../models/Invoices";
import AppError from "../../errors/AppError";

const ShowInvoceService = async (Invoiceid: string | number): Promise<Invoice> => {
  const invoice = await Invoice.findByPk(Invoiceid);

  if (!invoice) {
    throw new AppError("ERR_NO_INVOICE_FOUND", 404);
  }

  return invoice;
};

export default ShowInvoceService;
