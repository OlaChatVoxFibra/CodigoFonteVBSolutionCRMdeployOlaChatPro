jest.mock("../models/PaymentConfirmationToken");
jest.mock("../models/Company");
jest.mock("../models/User");
jest.mock("../models/Plan");

import { Request, Response } from "express";
import { Op } from "sequelize";
import PaymentConfirmationToken from "../models/PaymentConfirmationToken";
import Company from "../models/Company";
import User from "../models/User";
import Plan from "../models/Plan";
import {
  byEmail,
  issueToken,
  resolvePlanByName
} from "../controllers/PaymentConfirmationController";

function mockRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("PaymentConfirmationController", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, CONFIRM_ALLOW_SELF_ISSUE: "" };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("byEmail retorna 400 sem email", async () => {
    const req = { query: {} } as Request;
    const res = mockRes();
    await byEmail(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("byEmail retorna token quando existe registro pendente", async () => {
    (PaymentConfirmationToken.findOne as jest.Mock).mockResolvedValue({
      token: "abc123",
      email: "user@test.com"
    });
    const req = { query: { email: "user@test.com" } } as unknown as Request;
    const res = mockRes();
    await byEmail(req, res);
    expect(PaymentConfirmationToken.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email: { [Op.iLike]: "user@test.com" }
        })
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ token: "abc123" });
  });

  it("byEmail busca token por companyId quando email pertence à empresa", async () => {
    (PaymentConfirmationToken.findOne as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ token: "company-token" });
    (Company.findOne as jest.Mock).mockResolvedValue({ id: 42, email: "billing@test.com" });

    const req = { query: { email: "billing@test.com" } } as unknown as Request;
    const res = mockRes();
    await byEmail(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ token: "company-token" });
  });

  it("byEmail emite token em dev quando CONFIRM_ALLOW_SELF_ISSUE=true", async () => {
    process.env.CONFIRM_ALLOW_SELF_ISSUE = "true";
    (PaymentConfirmationToken.findOne as jest.Mock).mockResolvedValue(null);
    (Company.findOne as jest.Mock).mockResolvedValue(null);
    (PaymentConfirmationToken.create as jest.Mock).mockResolvedValue({
      token: "dev-token",
      email: "new@test.com"
    });

    const req = { query: { email: "new@test.com" } } as unknown as Request;
    const res = mockRes();
    await byEmail(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ token: "dev-token", dev: true });
  });

  it("resolvePlanByName mapeia starter/essencial/pro", async () => {
    (Plan.findAll as jest.Mock).mockResolvedValue([
      { id: 1, name: "Starter" },
      { id: 2, name: "Essencial" },
      { id: 3, name: "Pro" }
    ]);
    const starter = await resolvePlanByName("starter");
    const essencial = await resolvePlanByName("Essencial");
    const pro = await resolvePlanByName("PRO");
    expect((starter as any)?.id).toBe(1);
    expect((essencial as any)?.id).toBe(2);
    expect((pro as any)?.id).toBe(3);
  });

  it("issueToken cria registro com expiração futura", async () => {
    const saveMock = jest.fn();
    (PaymentConfirmationToken.create as jest.Mock).mockImplementation(async data => ({
      ...data,
      save: saveMock
    }));
    const rec = await issueToken("pay@test.com", undefined, "Starter", 72);
    expect(rec.email).toBe("pay@test.com");
    expect(rec.desiredPlanName).toBe("Starter");
    expect(rec.token).toBeTruthy();
    expect(rec.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
