/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Prisma } from '@prisma/client';

export class Company implements Prisma.companyUncheckedCreateInput {
  id?: number;
  create_at?: string | Date;
  update_at?: string | Date;
  deleted_at?: string | Date;
  name: string;
  whatsappOficial?: Prisma.whatsappOficialUncheckedCreateNestedManyWithoutCompanyInput;
  idEmpresaMult100: number;

  constructor() {
    this.id = null;
    this.create_at = null;
    this.update_at = null;
    this.deleted_at = null;
    this.name = null;
    this.idEmpresaMult100 = null;
  }
}
