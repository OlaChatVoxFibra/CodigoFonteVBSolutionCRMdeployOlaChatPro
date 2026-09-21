/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { existsSync, mkdirSync, writeFile, unlinkSync, readFileSync } from 'fs';
import { promisify } from 'util';
import { convertMimeTypeToExtension } from './convertMimeTypeToExtension';

const path = './public';

export async function savedFile(
  file: Express.Multer.File,
  pathFile: string,
  fileName: string,
): Promise<string> {
  if (!existsSync(`${path}`)) mkdirSync(path);

  const date = new Date();

  if (!file) throw new Error('Nenhum arquivo fornecido.');

  const { buffer, mimetype } = file;

  const filePath = `${path}/${pathFile}/${date.getMilliseconds()}-${fileName}`;

  if (!!existsSync(filePath))
    throw new Error('Já existe um arquivo com este nome');

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Buffer de arquivo inválido.');
  }

  const writeFileAsync = promisify(writeFile);

  try {
    await writeFileAsync(filePath, buffer);
    return filePath;
  } catch (err: any) {
    throw new Error(`Erro ao salvar o arquivo: ${err.message}`);
  }
}

export function deleteFile(path: string) {
  if (!path) throw new Error('Necessário informar o caminho do arquivo');
  if (!existsSync(path)) throw new Error('Não existe um arquivo com este nome');

  try {
    unlinkSync(path);
    return;
  } catch (error) {
    throw new Error(`Não foi possível deletar o arquivo`);
  }
}

export function getBase64(path: string) {
  const file = readFileSync(path);
  return file.toString(`base64`);
}

export function checkPasteFiles(pathPaste: string) {
  const pathCheck = `${path}/${pathPaste}`;
  if (!existsSync(pathCheck)) mkdirSync(pathCheck);
}

export function createPaste(pathPaste: string) {
  if (!checkPasteFiles) mkdirSync(path);
}
