/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Company from "../../models/Company";
import Invoices from "../../models/Invoices";
import Plan from "../../models/Plan";

interface Request {
  companyId: number;
}

const FindAllPlanService = async (companyId: number): Promise<Invoices[]> => {

  const invoice = await Invoices.findAll({
    where: {
      companyId
    },
    order: [["id", "ASC"]],
  });
  return invoice;
};

export default FindAllPlanService;
