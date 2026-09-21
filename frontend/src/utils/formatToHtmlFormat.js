/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/* eslint-disable no-console */
import { convertToRaw } from 'draft-js';
import draftToHtml from 'draftjs-to-html';

export default function formatToHtmlFormat(editorState) {
  try {
    if (!editorState) {
      return;
    }
    const htmlText = draftToHtml(convertToRaw(editorState.getCurrentContent()));

    return htmlText;
  } catch (error) {
    console.log(error);
  }
}
