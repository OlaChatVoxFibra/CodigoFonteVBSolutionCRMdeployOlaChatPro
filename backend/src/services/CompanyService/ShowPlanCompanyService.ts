/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Company from "../../models/Company";
import Plan from "../../models/Plan";
import { resolveUseWhatsappOfficial } from "../../helpers/companyPlanFeatures";

const ShowPlanCompanyService = async (id: string | number): Promise<Company> => {
    const companies = await Company.findOne({
        where: { id },
        attributes: ["id", "name", "email", "status", "dueDate", "createdAt", "phone", "document", "lastLogin", "useWhatsappOfficial"],
        order: [["name", "ASC"]],
        include: [
            {
                model: Plan, as: "plan",
                attributes: [
                    "id",
                    "name",
                    "users",
                    "connections",
                    "queues",
                    "amount",
                    "useWhatsapp",
                    "useFacebook",
                    "useInstagram",
                    "useCampaigns",
                    "useSchedules",
                    "useInternalChat",
                    "useExternalApi",
                    "useKanban",
                    "useOpenAi",
                    "useIntegrations",
                    "useWhatsappOfficial",
                    "wavoip"
                ]
            },
        ]
    });

    if (companies?.plan) {
        (companies.plan as any).useWhatsappOfficial = resolveUseWhatsappOfficial(companies);
    }

    return companies;
};

export default ShowPlanCompanyService;
