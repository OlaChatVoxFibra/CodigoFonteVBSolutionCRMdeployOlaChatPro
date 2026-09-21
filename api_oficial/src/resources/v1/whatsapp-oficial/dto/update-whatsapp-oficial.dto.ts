/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { PartialType } from '@nestjs/swagger';
import { CreateWhatsappOficialDto } from './create-whatsapp-oficial.dto';

export class UpdateWhatsappOficialDto extends PartialType(CreateWhatsappOficialDto) {}
