/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Files from "../../models/Files";
import AppError from "../../errors/AppError";
import FilesOptions from "../../models/FilesOptions";

const ShowFileService = async (id: string | number, companyId: number): Promise<Files> => {
  const fileList = await Files.findOne({
    where: { id, companyId },
    include: [
      "options",
      {
        model: FilesOptions,
        as: "options",
        order: [["id","ASC"]]
      }
    ]
  });

  if (!fileList) {
    throw new AppError("ERR_NO_FILE_FOUND", 404);
  }

  return fileList;
};

export default ShowFileService;
