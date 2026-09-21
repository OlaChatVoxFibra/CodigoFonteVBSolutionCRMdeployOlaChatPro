import Ticket from "../models/Ticket";
import ShowUserService from "../services/UserServices/ShowUserService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import { getIO } from "../libs/socket";

jest.mock("../models/Ticket", () => ({
  __esModule: true,
  default: { findAll: jest.fn() }
}));
jest.mock("../services/UserServices/ShowUserService", () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock("../services/TicketServices/UpdateTicketService", () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock("../libs/socket", () => ({
  getIO: jest.fn()
}));

import BulkAcceptTicketsService from "../services/TicketServices/BulkAcceptTicketsService";

describe("BulkAcceptTicketsService", () => {
  const emit = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    (getIO as jest.Mock).mockReturnValue({
      of: jest.fn().mockReturnValue({ emit })
    });
    (ShowUserService as jest.Mock).mockResolvedValue({
      id: 10,
      profile: "user",
      queues: [{ id: 1 }, { id: 2 }]
    });
    (UpdateTicketService as jest.Mock).mockResolvedValue({
      ticket: { id: 1 },
      oldStatus: "pending",
      oldUserId: null
    });
  });

  it("aceita todos os tickets pending da empresa atribuindo ao usuário", async () => {
    (Ticket.findAll as jest.Mock).mockResolvedValue([
      { id: 1, status: "pending", queueId: 1, userId: null, isGroup: false, channel: "whatsapp" },
      { id: 2, status: "pending", queueId: 2, userId: null, isGroup: false, channel: "whatsapp" }
    ]);

    const result = await BulkAcceptTicketsService({
      companyId: 1,
      userId: 10
    });

    expect(result).toEqual({ accepted: 2, skipped: 0 });
    expect(UpdateTicketService).toHaveBeenCalledTimes(2);
    expect(UpdateTicketService).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketData: expect.objectContaining({
          userId: 10,
          status: "open",
          isBot: false
        })
      })
    );
  });

  it("pula tickets de filas sem acesso", async () => {
    (Ticket.findAll as jest.Mock).mockResolvedValue([
      { id: 1, status: "pending", queueId: 99, userId: null, isGroup: false, channel: "whatsapp" }
    ]);

    const result = await BulkAcceptTicketsService({
      companyId: 1,
      userId: 10
    });

    expect(result).toEqual({ accepted: 0, skipped: 1 });
    expect(UpdateTicketService).not.toHaveBeenCalled();
  });

  it("admin aceita tickets de qualquer fila", async () => {
    (ShowUserService as jest.Mock).mockResolvedValue({
      id: 10,
      profile: "admin",
      queues: [{ id: 1 }]
    });
    (Ticket.findAll as jest.Mock).mockResolvedValue([
      { id: 1, status: "pending", queueId: 99, userId: null, isGroup: false, channel: "whatsapp" }
    ]);

    const result = await BulkAcceptTicketsService({
      companyId: 1,
      userId: 10
    });

    expect(result).toEqual({ accepted: 1, skipped: 0 });
  });
});
