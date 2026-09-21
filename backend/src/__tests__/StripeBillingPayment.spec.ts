jest.mock("../models/Company");
jest.mock("../models/User");
jest.mock("../models/Subscriptions");
jest.mock("../models/PaymentConfirmationToken");
jest.mock("../helpers/SendMail");
jest.mock("../services/AiBrainServices/BrainCreditService");
jest.mock("../controllers/PaymentConfirmationController", () => ({
  issueToken: jest.fn(),
  resolvePlanByName: jest.fn()
}));

import Company from "../models/Company";
import User from "../models/User";
import Subscriptions from "../models/Subscriptions";
import { issueToken, resolvePlanByName } from "../controllers/PaymentConfirmationController";
import { processApprovedStripePayment } from "../services/StripeBilling/StripeBillingService";

describe("StripeBilling payment confirmation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FRONTEND_URL = "https://app.test";
    (issueToken as jest.Mock).mockResolvedValue({ token: "reg-token" });
    (resolvePlanByName as jest.Mock).mockResolvedValue({ id: 9, name: "Starter" });
  });

  it("emite token de registro para novo cliente sem empresa", async () => {
    (Company.findOne as jest.Mock).mockResolvedValue(null);

    await processApprovedStripePayment({
      email: "novo@test.com",
      productKey: "starter",
      interval: "monthly",
      issueRegistrationToken: true
    });

    expect(issueToken).toHaveBeenCalledWith("novo@test.com", undefined, "Starter");
  });

  it("atualiza empresa existente e emite token vinculado ao companyId", async () => {
    const company = {
      id: 7,
      email: "empresa@test.com",
      dueDate: "2026-01-01",
      planId: 1,
      recurrence: "freemium",
      reload: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined)
    };
    (Company.findOne as jest.Mock).mockResolvedValue(company);
    (Subscriptions.findOne as jest.Mock).mockResolvedValue(null);
    (Subscriptions.create as jest.Mock).mockResolvedValue({ id: 1 });
    (User.findOne as jest.Mock).mockResolvedValue(null);

    await processApprovedStripePayment({
      email: "empresa@test.com",
      productKey: "essencial",
      interval: "annual",
      providerSubscriptionId: "sub_123"
    });

    expect(company.update).toHaveBeenCalled();
    expect(Subscriptions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 7,
        providerSubscriptionId: "sub_123"
      })
    );
    expect(issueToken).toHaveBeenCalledWith(
      "empresa@test.com",
      7,
      "Essencial"
    );
  });

  it("ignora emissão de token quando issueRegistrationToken=false", async () => {
    (Company.findOne as jest.Mock).mockResolvedValue(null);

    await processApprovedStripePayment({
      email: "sem-token@test.com",
      productKey: "starter",
      issueRegistrationToken: false
    });

    expect(issueToken).not.toHaveBeenCalled();
  });
});
