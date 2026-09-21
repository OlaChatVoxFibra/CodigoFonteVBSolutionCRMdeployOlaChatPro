import ShowUserService from "../services/UserServices/ShowUserService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import ListTicketsService from "../services/TicketServices/ListTicketsService";

jest.mock("../services/UserServices/ShowUserService", () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock("../services/TicketServices/UpdateTicketService", () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock("../services/TicketServices/ListTicketsService", () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock("../models/Ticket", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn()
  }
}));
jest.mock("../libs/socket", () => ({
  getIO: jest.fn().mockReturnValue({
    of: jest.fn().mockReturnValue({ emit: jest.fn() })
  })
}));

import BulkCloseTicketsService from "../services/TicketServices/BulkCloseTicketsService";
import { getIO } from "../libs/socket";
import Ticket from "../models/Ticket";

describe("BulkCloseTicketsService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (getIO as jest.Mock).mockReturnValue({
      of: jest.fn().mockReturnValue({ emit: jest.fn() })
    });
    (Ticket.findAll as jest.Mock).mockResolvedValue([]);
    (UpdateTicketService as jest.Mock).mockResolvedValue({
      ticket: { id: 1 },
      oldStatus: "open",
      oldUserId: 1
    });
  });

  it("fecha tickets open visíveis na lista sem despedida", async () => {
    (ShowUserService as jest.Mock).mockResolvedValue({
      id: 1,
      profile: "admin"
    });
    (ListTicketsService as jest.Mock).mockResolvedValueOnce({
      tickets: [
        { id: 1, status: "open", userId: 1, queueId: 1 },
        { id: 2, status: "open", userId: 2, queueId: 1 }
      ],
      hasMore: false
    });

    const result = await BulkCloseTicketsService({
      companyId: 1,
      userId: 1,
      queueIds: [1]
    });

    expect(result).toEqual({ closed: 2 });
    expect(ListTicketsService).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "open",
        queueIds: [1]
      })
    );
    expect(UpdateTicketService).toHaveBeenCalledTimes(2);
    expect(UpdateTicketService).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketData: expect.objectContaining({
          status: "closed",
          sendFarewellMessage: false,
          isBot: false
        })
      })
    );
  });

  it("inclui tickets do agente IA fora do filtro de fila da lista", async () => {
    (ShowUserService as jest.Mock).mockResolvedValue({
      id: 1,
      profile: "admin"
    });
    (ListTicketsService as jest.Mock).mockResolvedValueOnce({
      tickets: [],
      hasMore: false
    });
    (Ticket.findAll as jest.Mock).mockResolvedValue([
      { id: 99, status: "open", userId: null, queueId: 77, isBot: true }
    ]);

    const result = await BulkCloseTicketsService({
      companyId: 1,
      userId: 1,
      queueIds: [1]
    });

    expect(result).toEqual({ closed: 1 });
    expect(UpdateTicketService).toHaveBeenCalledWith(
      expect.objectContaining({ ticketId: 99 })
    );
  });
});
