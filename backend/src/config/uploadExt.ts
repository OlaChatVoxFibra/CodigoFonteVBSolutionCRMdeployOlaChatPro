/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import path from "path";
import multer from "multer";

const publicFolder = path.resolve(__dirname, "..", "..", "public");
export default {
  directory: publicFolder,

  storage: multer.diskStorage({
    destination: publicFolder,
    filename(req, file, cb) {
      const fileName = file.originalname.replace(/\s/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if(fileName.split('.')[1] === 'mp3' || fileName.split('.')[1] === 'ogg'|| fileName.split('.')[1] === 'opus'){
        return cb(null, fileName);
      }
      return cb(null, fileName + '.' + file.mimetype.split('/')[1]);
    }
  })
};