/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import path from "path";
import multer from "multer";

const privateFolder = path.resolve(__dirname, "..", "..", "private");
export default {
  directory: privateFolder,

  storage: multer.diskStorage({
    destination: privateFolder,
    filename(req, file, cb) {
      const fileName = file.originalname.replace(/\s/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      return cb(null, fileName);
    }
  })
};
