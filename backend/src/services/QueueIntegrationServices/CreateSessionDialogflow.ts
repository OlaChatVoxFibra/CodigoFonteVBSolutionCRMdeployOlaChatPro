/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { SessionsClient } from "@google-cloud/dialogflow";
import QueueIntegration from "../../models/QueueIntegrations";
import dir from 'path';
import fs from 'fs';
import os from 'os';
import logger from "../../utils/logger";

const sessions : Map<number, SessionsClient> = new Map<number, SessionsClient>();

const createDialogflowSession = async (id:number, projectName:string, jsonContent:string) : Promise<SessionsClient | undefined> => {
    if(sessions.has(id)) {
        return sessions.get(id);
    }

    const keyFilename = dir.join(os.tmpdir(), `vbsolution_${id}.json`);

    logger.info(`Openig new dialogflow session #${projectName} in '${keyFilename}'`)

    await fs.writeFileSync(keyFilename, jsonContent);
    const session = new SessionsClient({ keyFilename });

    sessions.set(id, session);

    return session;
}

const createDialogflowSessionWithModel = async (model: QueueIntegration) : Promise<SessionsClient | undefined> => {
    console.log("ID:" + model.id + " name:" +  model.projectName + " json:" +   model.jsonContent)
    return createDialogflowSession(model.id, model.projectName, model.jsonContent);
}

export { createDialogflowSession, createDialogflowSessionWithModel };