import ListTicketsService from "../services/TicketServices/ListTicketsService";
import Ticket from "../models/Ticket";
import ShowUserService from "../services/UserServices/ShowUserService";
import FindCompanySettingOneService from "../services/CompaniesSettings/FindCompanySettingOneService";
import { Op } from "sequelize";

jest.mock("../models/Ticket", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    findAndCountAll: jest.fn()
  }
}));
jest.mock("../services/UserServices/ShowUserService", () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock("../services/CompaniesSettings/FindCompanySettingOneService", () => ({
  __esModule: true,
  default: jest.fn()
}));

describe("ListTicketsService - open tab persistence", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (FindCompanySettingOneService as jest.Mock).mockResolvedValue([]);
  });

  it("não restringe por userId em status 'open' e inclui tickets do bot/integração", async () => {
    (ShowUserService as jest.Mock).mockResolvedValue({
      id: 1,
      profile: "user",
      super: false,
      allHistoric: "disabled",
      allTicket: "enable",
      allowGroup: false,
      allUserChat: "disabled",
      queues: [{ id: 1 }]
    });

    const findAndCountAllMock = jest.fn().mockResolvedValue({
      count: 0,
      rows: []
    });
    (Ticket.findAndCountAll as unknown as jest.Mock).mockImplementation(findAndCountAllMock);

    await ListTicketsService({
      searchParam: "",
      pageNumber: "1",
      queueIds: [1],
      tags: [],
      users: [],
      status: "open",
      date: undefined,
      dateStart: undefined,
      dateEnd: undefined,
      updatedAt: undefined,
      showAll: "false",
      userId: 1,
      withUnreadMessages: "false",
      whatsappIds: [],
      statusFilters: [],
      companyId: 1,
      sortTickets: "DESC",
      searchOnMessages: "false"
    } as any);

    expect(findAndCountAllMock).toHaveBeenCalledTimes(1);
    const callArg = findAndCountAllMock.mock.calls[0][0];
    const where = callArg.where;
    expect(where.status).toBe("open");
    // Não deve haver filtro direto por userId no nível raiz
    expect(where.userId).toBeUndefined();
    // Deve conter uma condição OR incluindo userId, userId null, isBot true ou useIntegration true
    const or = where[Op.or];
    expect(or).toEqual(expect.arrayContaining([expect.objectContaining({ userId: 1 })]));
    expect(or.some((condition: any) => condition[Op.and]?.some((item: any) => item.isBot === true))).toBe(true);
    expect(or.some((condition: any) => condition[Op.and]?.some((item: any) => item.useIntegration === true))).toBe(true);
  });

  it("inclui tickets do bot/integração sem fila quando allTicket está desabilitado", async () => {
    (ShowUserService as jest.Mock).mockResolvedValue({
      id: 1,
      profile: "user",
      super: false,
      allHistoric: "disabled",
      allTicket: "disabled",
      allowGroup: false,
      allUserChat: "disabled",
      queues: [{ id: 1 }]
    });

    const findAndCountAllMock = jest.fn().mockResolvedValue({
      count: 0,
      rows: []
    });
    (Ticket.findAndCountAll as unknown as jest.Mock).mockImplementation(findAndCountAllMock);

    await ListTicketsService({
      searchParam: "",
      pageNumber: "1",
      queueIds: [1],
      tags: [],
      users: [],
      status: "open",
      date: undefined,
      dateStart: undefined,
      dateEnd: undefined,
      updatedAt: undefined,
      showAll: "false",
      userId: 1,
      withUnreadMessages: "false",
      whatsappIds: [],
      statusFilters: [],
      companyId: 1,
      sortTickets: "DESC",
      searchOnMessages: "false"
    } as any);

    const or = findAndCountAllMock.mock.calls[0][0].where[Op.or];
    const botClause = or.find(
      (condition: any) =>
        condition[Op.and]?.some((item: any) => item.isBot === true) &&
        condition[Op.and]?.some((item: any) => item.userId === null) &&
        !condition[Op.and]?.some((item: any) => Object.prototype.hasOwnProperty.call(item, "queueId"))
    );
    expect(botClause).toBeTruthy();
  });

  it("com showAll e filtro de fila, mantém tickets atribuídos a mim (API Oficial / F5)", async () => {
    (ShowUserService as jest.Mock).mockResolvedValue({
      id: 1,
      profile: "admin",
      super: false,
      allHistoric: "disabled",
      allTicket: "enable",
      allowGroup: false,
      allUserChat: "enabled",
      queues: [{ id: 1 }, { id: 2 }]
    });

    const findAndCountAllMock = jest.fn().mockResolvedValue({
      count: 0,
      rows: []
    });
    (Ticket.findAndCountAll as unknown as jest.Mock).mockImplementation(findAndCountAllMock);

    await ListTicketsService({
      searchParam: "",
      pageNumber: "1",
      queueIds: [1],
      tags: [],
      users: [],
      status: "open",
      date: undefined,
      dateStart: undefined,
      dateEnd: undefined,
      updatedAt: undefined,
      showAll: "true",
      userId: 1,
      withUnreadMessages: "false",
      whatsappIds: [],
      statusFilters: [],
      companyId: 1,
      sortTickets: "DESC",
      searchOnMessages: "false"
    } as any);

    const or = findAndCountAllMock.mock.calls[0][0].where[Op.or];
    expect(or).toEqual(
      expect.arrayContaining([expect.objectContaining({ userId: 1 })])
    );
    expect(
      or.some((condition: any) =>
        condition[Op.and]?.some((item: any) => item.channel === "whatsapp_oficial")
      )
    ).toBe(true);
  });

  it("mantém tickets finalizados visíveis para o usuário responsável mesmo fora do filtro de fila", async () => {
    (ShowUserService as jest.Mock).mockResolvedValue({
      id: 1,
      profile: "user",
      super: false,
      allHistoric: "disabled",
      allTicket: "disabled",
      allowGroup: false,
      allUserChat: "disabled",
      queues: [{ id: 1 }]
    });

    (Ticket.findAll as unknown as jest.Mock).mockResolvedValue([{ id: 99 }]);
    const findAndCountAllMock = jest.fn().mockResolvedValue({
      count: 1,
      rows: []
    });
    (Ticket.findAndCountAll as unknown as jest.Mock).mockImplementation(findAndCountAllMock);

    await ListTicketsService({
      searchParam: "",
      pageNumber: "1",
      queueIds: [1],
      tags: [],
      users: [],
      status: "closed",
      date: undefined,
      dateStart: undefined,
      dateEnd: undefined,
      updatedAt: undefined,
      showAll: "false",
      userId: 1,
      withUnreadMessages: "false",
      whatsappIds: [],
      statusFilters: [],
      companyId: 1,
      sortTickets: "DESC",
      searchOnMessages: "false"
    } as any);

    const latestClosedWhere = (Ticket.findAll as unknown as jest.Mock).mock.calls[0][0].where;
    expect(latestClosedWhere.userId).toBeUndefined();
    expect(latestClosedWhere[Op.or]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: 1 })
      ])
    );
    expect(findAndCountAllMock.mock.calls[0][0].where).toMatchObject({
      companyId: 1,
      id: [99]
    });
  });
});
