/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import moment from "moment";
import Company from "../../models/Company";
import Plan from "../../models/Plan";

export type SubscriptionFilter =
  | "all"
  | "expired"
  | "trial_ending"
  | "trial_active";

const ListCompaniesPlanService = async (opts?: {
  subscriptionFilter?: string;
}): Promise<Company[]> => {
  const companies = await Company.findAll({
    attributes: [
      "id",
      "name",
      "email",
      "status",
      "dueDate",
      "createdAt",
      "phone",
      "document",
      "lastLogin",
      "folderSize",
      "numberFileFolder",
      "updatedAtFolder",
      "generateInvoice",
      "recurrence"
    ],
    order: [["id", "ASC"]],
    include: [
      {
        model: Plan,
        as: "plan",
        attributes: [
          "id",
          "name",
          "users",
          "connections",
          "queues",
          "amount",
          "trial",
          "trialDays",
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
      }
    ]
  });

  const filter = (opts?.subscriptionFilter || "all") as SubscriptionFilter;
  if (filter === "all") {
    return companies;
  }

  const today = moment().startOf("day");

  return companies.filter(c => {
    const rawDue = c.dueDate;
    const due = rawDue && moment(rawDue).isValid()
      ? moment(rawDue).startOf("day")
      : null;
    const expired = due ? today.isAfter(due) : false;
    const daysLeft =
      due && !expired ? due.diff(today, "days") : expired ? -1 : null;
    const isTrial = Boolean((c as any).plan?.trial);

    if (filter === "expired") {
      return expired;
    }
    if (filter === "trial_ending") {
      return (
        !expired &&
        daysLeft !== null &&
        daysLeft >= 0 &&
        daysLeft <= 7
      );
    }
    if (filter === "trial_active") {
      return isTrial && !expired;
    }
    return true;
  });
};

export default ListCompaniesPlanService;
