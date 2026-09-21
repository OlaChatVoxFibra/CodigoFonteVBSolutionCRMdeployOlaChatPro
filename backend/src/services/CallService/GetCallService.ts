/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios from "axios";
import CallHistory from "../../models/CallHistory"
import Company from "../../models/Company";
import User from "../../models/User";
import cacheLayer from "../../libs/cache";
import Whatsapp from "../../models/Whatsapp";

const loginWavoip = async () => {
    try {
        const login: any = await axios.post(`${process.env.WAVOIP_URL}/login`, {
            "email": process.env.WAVOIP_USERNAME,
            "password": process.env.WAVOIP_PASSWORD
        });

        if (!login?.data?.result?.token) {
            throw new Error("Não foi possivel realizar login na wavoip");
        }

        return login?.data?.result?.token;
    } catch (error) {
        console.log('getHistorical Login Wavoip', error);
        throw new Error(error);
    }
}

const getHistorical = async (body: { "user_id": number, "company_id": number }) => {

    try {
        if (!process.env.WAVOIP_URL) {
            console.log("WAVOIP_URL not set");
            return { resultFinal: [], total: 0, totalReject: 0, totalServed: 0, totalFinish: 0 };
        }

        const chave = `loginWavoipToken:${body.company_id}`;
        let token = await cacheLayer.get(chave);

        if (!token) {
            console.log('login')
            token = await loginWavoip();
            await cacheLayer.set(chave, token, "EX", 3600);
        }

        const devices: any = await axios.get(`${process.env.WAVOIP_URL}/devices/me`, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        const user = await User.findOne({
            raw: true,
            nest: true,
             include: [{
                model: Whatsapp,
                attributes: ['id', 'wavoip'],
            }],
            where: {
                id: body.user_id
            }
        });

        if(!user?.whatsapp?.wavoip){
            return [];
        }

        let devicesAll = [];

        for (const device of devices?.data?.result) {
            try {
                if(user?.whatsapp?.wavoip != device?.token){
                    continue;
                }

                console.log('devices', device)
                const regs: any = await axios.get(`${process.env.WAVOIP_URL}/calls/devices/${device.id}`, {
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                });

                if (regs?.data?.result?.length <= 0) {
                    continue;
                }

                for (const reg of regs.data.result) {
                    devicesAll.push({ ...reg, token: device.token });
                }

            } catch (error) {
                console.log('error devices', error)
                continue;
            }
        }

        if (devicesAll.length <= 0) {
            return devicesAll;
        }

        console.log('devicesAll', devicesAll)


        const historicalDB: any = await CallHistory.findAll({
            raw: true,
            nest: true,
            include: [{
                model: User,
                attributes: ['id', 'name'],
            },
            {
                model: Company,
                attributes: ['id', 'name'],
            }],
            where: {
                company_id: body.company_id
            }
        })

        console.log('historicalDB112', body.company_id, historicalDB.length, historicalDB)

        const resultFinal = [];
        const cache = [];

        let totalServed = 0;
        let totalDuration = 0;
        let totalUnmet = 0;
        let totalReject = 0;
        let totalCallsAnswered = 0;
        let totalFinish = 0;
        let total = 0;

        for (const device of devicesAll) {
            let callSaveUrl = '';
            if (device?.duration) {
                callSaveUrl = `https://storage.wavoip.com/${device?.whatsapp_call_id}`;
            }
             if (device.direction == 'OUTCOMING') {
                const historicMatch = historicalDB.find(h => 
                    h.token_wavoip === device.token &&
                    Math.abs(new Date(h.createdAt).getTime() - new Date(device.created_date).getTime()) <= 1 * 60 * 1000 // diferença de até 1 minutos
                );

                if (historicMatch && !cache.includes(historicMatch.id)) {
                    cache.push(historicMatch.id);
                    resultFinal.push({ ...historicMatch, devices: device, callSaveUrl });
                }
            }

            if (device.direction == 'INCOMING') {
                resultFinal.push({ devices: device, callSaveUrl, user: { id: '', name: '' }, company: { id: '', name: '' }, phone_to: device?.caller, createdAt: device?.created_date });
            }

            if (device?.duration) {
                totalServed += 1;
            }

            if (device?.status == "ENDED") {
                totalFinish += 1;
            }

            if (device?.status == "REJECTED") {
                totalReject += 1;
            }

            total += 1;
        }

        return { resultFinal, total, totalReject, totalServed, totalFinish };

    } catch (error) {
        console.log('getHistorical Wavoip', error);
        throw new Error(error);
    }
}

export default getHistorical;