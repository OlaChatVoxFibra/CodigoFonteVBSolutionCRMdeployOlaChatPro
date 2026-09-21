import Ticket from "../models/Ticket";
import { markTicketUnderAgentAttendance } from "../services/TicketServices/markTicketUnderAgentAttendance";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import { getIO } from "../libs/socket";

jest.mock("../models/Ticket", () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn()
  }
}));
jest.mock("../services/TicketServices/ShowTicketService", () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock("../libs/socket", () => ({
  getIO: jest.fn()
}));

describe("markTicketUnderAgentAttendance", () => {
  const emit = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    (getIO as jest.Mock).mockReturnValue({
      of: () => ({ emit })
    });
    (ShowTicketService as jest.Mock).mockResolvedValue({ id: 10, status: "open", isBot: true });
    (Ticket.findByPk as jest.Mock).mockImplementation(async (id: number) => {
      if (id === 10) {
        return {
          id: 10,
          companyId: 1,
          status: "pending",
          isBot: false,
          useIntegration: true,
          userId: null,
          update: jest.fn().mockResolvedValue(undefined)
        };
      }
      return null;
    });
  });

  it("move ticket sem atendente humano para open + isBot após resposta do agente", async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    (Ticket.findByPk as jest.Mock).mockResolvedValue({
      id: 10,
      companyId: 1,
      status: "pending",
      isBot: false,
      useIntegration: true,
      userId: null,
      update
    });

    const ticket = {
      id: 10,
      companyId: 1,
      status: "pending",
      isBot: false,
      useIntegration: true,
      userId: null,
      update
    } as unknown as Ticket;

    await markTicketUnderAgentAttendance(ticket);

    expect(update).toHaveBeenCalledWith({
      status: "open",
      isBot: true,
      useIntegration: true
    });
    expect(emit).toHaveBeenCalledWith(
      "company-1-ticket",
      expect.objectContaining({ action: "update", ticketId: 10 })
    );
  });

  it("não força isBot quando humano já assumiu o ticket", async () => {
    const ticket = {
      id: 11,
      companyId: 1,
      status: "open",
      isBot: false,
      useIntegration: false,
      userId: 5,
      update: jest.fn().mockResolvedValue(undefined)
    } as unknown as Ticket;

    (Ticket.findByPk as jest.Mock).mockResolvedValue(ticket);

    await markTicketUnderAgentAttendance(ticket);

    expect(ticket.update).not.toHaveBeenCalled();
  });

  it("não reabre ticket já finalizado", async () => {
    const ticket = {
      id: 12,
      companyId: 1,
      status: "open",
      isBot: true,
      useIntegration: true,
      userId: null,
      update: jest.fn().mockResolvedValue(undefined)
    } as unknown as Ticket;

    (Ticket.findByPk as jest.Mock).mockResolvedValue({
      id: 12,
      companyId: 1,
      status: "closed",
      isBot: true,
      useIntegration: true,
      userId: null,
      update: jest.fn()
    });

    await markTicketUnderAgentAttendance(ticket);

    expect(ticket.update).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });
});
