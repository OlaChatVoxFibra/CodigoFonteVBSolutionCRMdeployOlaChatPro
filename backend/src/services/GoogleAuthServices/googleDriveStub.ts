/**
 * VB Solution CRM — Visão Business
 * Google Drive removido deste pacote.
 */
export async function brainUploadBinaryToGoogleDrive(_params: any): Promise<{
  success: boolean;
  id?: string;
  fileId?: string;
  webViewLink?: string;
  name?: string;
  accountEmail?: string;
  error?: string;
}> {
  return {
    success: false,
    error:
      "Upload para Google Drive não está disponível neste pacote do VB Solution CRM."
  };
}
