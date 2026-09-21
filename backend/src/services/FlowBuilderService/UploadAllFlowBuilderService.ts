/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { FlowAudioModel } from "../../models/FlowAudio";
import { FlowBuilderModel } from "../../models/FlowBuilder";
import { FlowImgModel } from "../../models/FlowImg";
import { FlowDocModel } from "../../models/FlowDoc";
import { WebhookModel } from "../../models/Webhook";
import { randomString } from "../../utils/randomCode";

interface Request {
  userId: number;
  medias: Express.Multer.File[];
  companyId: number;
}

const UploadAllFlowBuilderService = async ({
  userId,
  medias,
  companyId
}: Request): Promise<string[]> => {
  try {
    let itemsNewNames: string[] = [];
    for (let i = 0; medias.length > i; i++) {
      let nameFile = medias[i].filename;
      //if (medias[i].filename.split(".").length === 1) {
      //  nameFile = medias[i].filename + "." + medias[i].mimetype.split("/")[1];
      //}
      itemsNewNames = [...itemsNewNames, nameFile]

      if (
        medias[i].mimetype.split("/")[1] === "png" ||
        medias[i].mimetype.split("/")[1] === "jpg" ||
        medias[i].mimetype.split("/")[1] === "jpeg"
      ) {
        await FlowImgModel.create({
          userId: userId,
          companyId: companyId,
          name: nameFile
        });

      }
      if (
        medias[i].mimetype.split("/")[1] === "mp3" ||
        medias[i].mimetype.split("/")[1] === "ogg" ||
        medias[i].mimetype.split("/")[1] === "mp4" ||
        medias[i].mimetype.split("/")[1] === "mpeg"
      ) {

        if (medias[i].mimetype.split("/")[1] === "mpeg") {
          nameFile = nameFile.split('.')[0] + '.mp3'
        }

        await FlowAudioModel.create({
          userId: userId,
          companyId: companyId,
          name: nameFile
        });

      } else {
        await FlowDocModel.create({
          userId: userId,
          companyId: companyId,
          name: nameFile
        });
      }
    }

    return itemsNewNames;
  } catch (error) {
    console.error("Erro ao inserir os arquivos:", error);

    return error;
  }
};

export default UploadAllFlowBuilderService;
