/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { $Enums, Prisma } from '@prisma/client';

export class SendMessageWhatsApp
  implements Prisma.sendMessageWhatsAppUncheckedCreateInput
{
  id?: number;
  create_at?: string | Date;
  update_at?: string | Date;
  deleted_at?: string | Date;
  type: $Enums.typeMessage;
  to: string;
  text?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
  reaction?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
  audio?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
  document?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
  image?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
  sticker?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
  video?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
  location?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
  contacts?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
  interactive?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
  template?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
  idMessageWhatsApp?: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
  enviada?: boolean;
  pathFile?: string;
  idFileMeta?: string;
  whatsappOficialId: number;

  constructor() {
    this.id = null;
    this.create_at = null;
    this.update_at = null;
    this.deleted_at = null;
    this.type = null;
    this.to = null;
    this.text = null;
    this.reaction = null;
    this.audio = null;
    this.document = null;
    this.image = null;
    this.sticker = null;
    this.video = null;
    this.location = null;
    this.contacts = null;
    this.interactive = null;
    this.enviada = null;
    this.pathFile = null;
    this.idFileMeta = null;
  }
}
