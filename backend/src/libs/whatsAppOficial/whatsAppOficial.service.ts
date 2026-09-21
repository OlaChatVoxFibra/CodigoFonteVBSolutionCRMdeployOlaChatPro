/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios from "axios";
import { ICreateConnectionWhatsAppOficial, ICreateConnectionWhatsAppOficialWhatsApp, IDataCreateUserApiOficial, IPayloadAPIWhatsAppOficial, IResultTemplates, IReturnConnectionCreateAPIWhatsAppOficial, IReturnCreateCompanyAPIWhatsAppOficial, IReturnMessageMeta, ISendMessageOficial, IUpdateonnectionWhatsAppOficialWhatsApp, IUserApiOficial } from "./IWhatsAppOficial.interfaces";
import fs from 'fs';
import mime from "mime-types";
import FormData from "form-data";

const useOficial = process.env.USE_WHATSAPP_OFICIAL;
const urlApi = process.env.URL_API_OFICIAL;
const token = process.env.TOKEN_API_OFICIAL;

export const sendMessageWhatsAppOficial = async (
    filePath: string,
    token: string,
    data: ISendMessageOficial
): Promise<IReturnMessageMeta> => {

    try {

        checkAPIOficial();
        const formData = new FormData();

        if (filePath) {
            const file = fs.readFileSync(filePath);
            const mimeType = mime.lookup(filePath);
            formData.append('file', file, {
                filename: filePath.split('/').pop(),
                contentType: mimeType
            });
        }

        // Log estruturado do payload (sem dados sensíveis)
        try {
            const payloadPreview = {
                to: data?.to,
                type: data?.type,
                hasText: !!data?.body_text,
                hasTemplate: !!data?.body_template,
                hasInteractive: !!data?.body_interactive,
                hasMedia: !!filePath,
                quotedId: data?.quotedId
            };
            console.log(`[WABA] Envio -> ${JSON.stringify(payloadPreview)}`);
        } catch (logErr) {
            console.log(`[WABA] Falha ao serializar payload para log: ${String(logErr)}`);
        }

        formData.append('data', JSON.stringify(data));

        const res = await axios.post(`${urlApi}/v1/send-message-whatsapp/${token}`, formData, {
            headers: {
                ...formData.getHeaders(), // Importante para definir os cabeçalhos corretos
            },
        });

        if (res.status == 200 || res.status == 201) {
            try {
                console.log(`[WABA] Sucesso <- status=${res.status} data=${JSON.stringify(res.data)}`);
            } catch (logErr) {
                console.log(`[WABA] Sucesso <- status=${res.status} (resposta não serializável)`);
            }
            return res.data as IReturnMessageMeta;
        }

        throw new Error('Falha em envia a mensagem para a API da Meta');

    } catch (error) {
        const err: any = error;
        const status = err?.response?.status;
        const dataResp = err?.response?.data;
        if (status) {
            try {
                console.log(`[WABA] Erro <- status=${status} data=${JSON.stringify(dataResp)}`);
            } catch (logErr) {
                console.log(`[WABA] Erro <- status=${status} (resposta não serializável)`);
            }

            // Fallback inteligente para erro de tradução de template (#132001)
            const msgText: string = String(dataResp?.message || "");
            const isTemplateTranslationError = msgText.includes("Template name does not exist in the translation");
            if (isTemplateTranslationError && data?.body_template?.name) {
                try {
                    console.log(`[WABA] Detectado erro de tradução do template. Vou sincronizar e ajustar language.code para tentar reenviar.`);

                    // Buscar templates e localizar o nome
                    const templates = await getTemplatesWhatsAppOficial(token);
                    const match = templates?.data?.find?.(t => t?.name === data.body_template.name);
                    if (match?.language) {
                        // Atualizar o código de idioma e reenviar uma única vez
                        const adjusted = { ...data } as ISendMessageOficial;
                        adjusted.body_template = {
                            ...adjusted.body_template,
                            language: { code: match.language }
                        } as any;

                        const retryForm = new FormData();
                        if (filePath) {
                            const file = fs.readFileSync(filePath);
                            const mimeType = mime.lookup(filePath);
                            retryForm.append('file', file, {
                                filename: filePath.split('/').pop(),
                                contentType: mimeType
                            });
                        }
                        retryForm.append('data', JSON.stringify(adjusted));

                        console.log(`[WABA] Reenvio com language.code ajustado para '${match.language}'.`);
                        const retryRes = await axios.post(`${urlApi}/v1/send-message-whatsapp/${token}`, retryForm, {
                            headers: {
                                ...retryForm.getHeaders(),
                            },
                        });

                        if (retryRes.status == 200 || retryRes.status == 201) {
                            try {
                                console.log(`[WABA] Sucesso (reenvio) <- status=${retryRes.status} data=${JSON.stringify(retryRes.data)}`);
                            } catch (logErr) {
                                console.log(`[WABA] Sucesso (reenvio) <- status=${retryRes.status} (resposta não serializável)`);
                            }
                            return retryRes.data as IReturnMessageMeta;
                        }
                    }
                } catch (fallbackErr) {
                    console.log(`[WABA] Fallback de reenvio falhou: ${String(fallbackErr?.message || fallbackErr)}`);
                }
            }
        } else {
            console.log(`[WABA] Erro <- ${String(err?.message || err)}`);
        }
        throw new Error('Mensagem não enviada para a meta');
    }

}

export const CreateCompanyConnectionOficial = async (data: ICreateConnectionWhatsAppOficial) => {
    try {

        const { company, whatsApp } = data;

        const companySaved = await CreateCompanyWhatsAppOficial(company.companyId, company.companyName);

        console.log(`Empresa: ${companySaved.id}`)

        const connection = await CreateConnectionWhatsAppOficial(whatsApp);

        console.log(`Conexão criada: ${JSON.stringify(connection)}`);

        const webhookLink = `${urlApi}/v1/webhook/${companySaved.id}/${connection.id}`;

        // token do webhook é o token de integração da plataforma (legado: token_mult100)
        return { webhookLink, connectionId: connection.id };

    } catch (error) {
        console.log(`CreateCompanyConnectionOficial: ${error.message}`);
        throw new Error(error.message || `Falha ao criar a empresa `);
    }
}

export const checkAPIOficial = async () => {
    try {

        if (!useOficial || !urlApi || !token) throw new Error('API oficial não configurada');

        const res = await axios.get(`${urlApi}`);

        if (res.status == 200 || res.status == 201) {
            console.log('API ONLINE')
            return res.data as string;
        }

        throw new Error('API Oficial não configurada ou esta offline');

    } catch (error) {
        console.log(`checkAPIOficial: ${error.message}`);
        throw new Error(error.message || `API não esta disponivel`);
    }
}

export const CreateCompanyWhatsAppOficial = async (companyId: string, companyName: string) => {
    try {

        const resCompanies = await axios.get(`${urlApi}/v1/companies`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const companies = resCompanies.data as Array<IReturnCreateCompanyAPIWhatsAppOficial>;

        const company = companies.find(c => String(c.idEmpresaMult100) == companyId);

        if (!!company) {
            console.log(`CreateCompanyWhatsAppOficial: data ${JSON.stringify(company)}`);
            return company
        }

        const res = await axios.post(`${urlApi}/v1/companies`, {
            idEmpresaMult100: +companyId,
            name: companyName
        },
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (res.status == 200 || res.status == 201) {
            const data = res.data as IReturnCreateCompanyAPIWhatsAppOficial;
            console.log(`CreateCompanyWhatsAppOficial: data ${JSON.stringify(data)}`);
            return data;
        }

        throw new Error('Falha em criar a empresa na API Oficial do WhatsApp');

    } catch (error) {
        console.log(`CreateCompanyWhatsAppOficial: ${JSON.stringify(error.response.data)}`);
        throw new Error(error.message || `Não foi possível criar a empresa na API Oficial do WhatsApp`);
    }
}

export const CreateConnectionWhatsAppOficial = async (data: ICreateConnectionWhatsAppOficialWhatsApp) => {
    try {

        const res = await axios.post(`${urlApi}/v1/whatsapp-oficial`, { ...data },
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (res.status == 200 || res.status == 201) {
            const data = res.data as IReturnConnectionCreateAPIWhatsAppOficial;
            console.log(`CreateConnectionWhatsAppOficial: data ${JSON.stringify(data)}`);
            return data;
        }

        throw new Error(res.data.message || 'Falha em criar a empresa na API Oficial do WhatsApp');

    } catch (error) {
        console.log(`CreateConnectionWhatsAppOficial: ${JSON.stringify(error.response.data)}`);
        throw new Error(error.message || `Não foi possível criar a empresa na API Oficial do WhatsApp`);
    }
}

export const UpdateConnectionWhatsAppOficial = async (idWhatsApp: number, data: IUpdateonnectionWhatsAppOficialWhatsApp) => {
    try {
        console.log(`UpdateConnectionWhatsAppOficial 0 ${idWhatsApp}: data ${JSON.stringify(data)}`);
        const res = await axios.put(`${urlApi}/v1/whatsapp-oficial/${idWhatsApp}`, { ...data },
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (res.status == 200 || res.status == 201) {
            const data = res.data as IReturnConnectionCreateAPIWhatsAppOficial;
            console.log(`UpdateConnectionWhatsAppOficial 1: data ${JSON.stringify(data)}`);
            return data;
        }

        throw new Error(res.data.message || 'Falha em criar a empresa na API Oficial do WhatsApp');

    } catch (error) {
        console.log(`UpdateConnectionWhatsAppOficial 2: ${JSON.stringify(error.response.data)}`);
        throw new Error(error.message || `Não foi possível atualizar a empresa na API Oficial do WhatsApp`);
    }
}

export const DeleteConnectionWhatsAppOficial = async (idWhatsapp: number) => {
    try {
        const res = await axios.delete(`${urlApi}/v1/whatsapp-oficial/${idWhatsapp}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (res.status == 200 || res.status == 201) {
            const data = res.data as IReturnConnectionCreateAPIWhatsAppOficial;
            console.log(`DeleteConnectionWhatsAppOficial: data ${JSON.stringify(data)}`);
            return data;
        }

        throw new Error(res.data.message || 'Falha em criar a empresa na API Oficial do WhatsApp');

    } catch (error) {
        console.log(`DeleteConnectionWhatsAppOficial: ${JSON.stringify(error.response.data)}`);
        throw new Error(error.message || `Não foi possível deletar a empresa na API Oficial do WhatsApp`);
    }
}

export const getTemplatesWhatsAppOficial = async (multi100_token: string) => {
    try {
        console.log(`${urlApi}/v1/templates-whatsapp/${multi100_token}`)
        const res = await axios.get(`${urlApi}/v1/templates-whatsapp/${multi100_token}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (res.status == 200 || res.status == 201) {
            const data = res.data as IResultTemplates;
            console.log(`getTemplatesWhatsAppOficial: data ${JSON.stringify(data)}`);
            return data;
        }

        throw new Error(res.data.message || 'Falha em listar os templates da API Oficial do WhatsApp');

    } catch (error) {
        console.log(`getTemplatesWhatsAppOficial: ${JSON.stringify(error.response.data)}`);
        throw new Error(error.message || `Falha em listar os templates da API Oficial do WhatsApp`);
    }
}

export const setReadMessageWhatsAppOficial = async (token: string, messageId: string) => {
    try {

        const res = await axios.post(`${urlApi}/v1/send-message-whatsapp/read-message/${token}/${messageId}`,

        );

        if (res.status == 200 || res.status == 201) {
            const data = res.data as { success: string };
            console.log(`setReadMessageWhatsAppOficial: data ${JSON.stringify(data)}`);
            return data;
        }

        throw new Error(res.data.message || 'Falha em marcar a mensagem como lida API Oficial do WhatsApp');

    } catch (error) {
        console.log(`setReadMessageWhatsAppOficial: ${JSON.stringify(error.response.data)}`);
        throw new Error(error.message || `Falha em marcar a mensagem como lida API Oficial do WhatsApp`);
    }
}

export const createFreeTextTemplateWhatsAppOficial = async (multi100_token: string, name?: string) => {
    try {
        const url = `${urlApi}/v1/templates-whatsapp/create-free-text/${multi100_token}`;
        const res = await axios.post(url, { name }, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (res.status == 200 || res.status == 201) {
            const data = res.data;
            console.log(`createFreeTextTemplateWhatsAppOficial: data ${JSON.stringify(data)}`);
            return data;
        }

        throw new Error(res.data.message || 'Falha em criar o template de texto livre na API Oficial do WhatsApp');

    } catch (error) {
        console.log(`createFreeTextTemplateWhatsAppOficial: ${JSON.stringify(error?.response?.data || error.message)}`);
        throw new Error(error.message || `Não foi possível criar o template de texto livre na API Oficial do WhatsApp`);
    }
}
