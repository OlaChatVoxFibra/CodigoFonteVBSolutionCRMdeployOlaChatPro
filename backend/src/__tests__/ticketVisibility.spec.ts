import {
  canUserBulkCloseTickets,
  getTicketVisibilityFlags,
  resolveTicketVisibility,
  ticketVisibilityToFlags
} from "../helpers/ticketVisibility";
import { canUserViewTicket } from "../helpers/canUserViewTicket";

describe("ticketVisibility", () => {
  it("admin sempre tem visibilidade all", () => {
    expect(resolveTicketVisibility({ profile: "admin" })).toBe("all");
  });

  it("mapeia ticketVisibility all para flags corretas", () => {
    expect(ticketVisibilityToFlags("all")).toEqual({
      allTicket: "enable",
      allHistoric: "enabled",
      allUserChat: "enabled"
    });
  });

  it("mapeia own_only para flags restritas", () => {
    expect(ticketVisibilityToFlags("own_only")).toEqual({
      allTicket: "disable",
      allHistoric: "disabled",
      allUserChat: "disabled"
    });
  });

  it("faz backfill a partir de flags legadas", () => {
    expect(
      resolveTicketVisibility({
        allTicket: "enable",
        allHistoric: "enabled",
        allUserChat: "enabled"
      })
    ).toBe("all");
    expect(
      resolveTicketVisibility({
        allTicket: "disable",
        allHistoric: "enabled",
        allUserChat: "enabled"
      })
    ).toBe("own_queues");
  });

  it("getTicketVisibilityFlags usa ticketVisibility quando definido", () => {
    expect(
      getTicketVisibilityFlags({ ticketVisibility: "own_queues" })
    ).toEqual({
      allTicket: "disable",
      allHistoric: "enabled",
      allUserChat: "enabled"
    });
  });

  it("canUserBulkCloseTickets permite fechar em massa conforme visibilidade", () => {
    expect(canUserBulkCloseTickets({ profile: "admin" })).toBe(true);
    expect(canUserBulkCloseTickets({ ticketVisibility: "all" })).toBe(true);
    expect(canUserBulkCloseTickets({ ticketVisibility: "own_queues" })).toBe(
      true
    );
    expect(canUserBulkCloseTickets({ ticketVisibility: "own_only" })).toBe(
      true
    );
  });
});

describe("canUserViewTicket", () => {
  it("admin vê qualquer ticket", () => {
    expect(
      canUserViewTicket(
        { profile: "admin", id: 1 },
        { userId: 99, queueId: 5, status: "open", companyId: 1 }
      )
    ).toBe(true);
  });

  it("usuário vê apenas tickets próprios em open", () => {
    const user = { id: 1, allUserChat: "disabled", allHistoric: "disabled", allTicket: "disable", queues: [{ id: 1 }] };
    expect(
      canUserViewTicket(
        user,
        { userId: 1, queueId: 1, status: "open", companyId: 1 }
      )
    ).toBe(true);
    expect(
      canUserViewTicket(
        user,
        { userId: 2, queueId: 1, status: "open", companyId: 1 }
      )
    ).toBe(false);
  });

  it("pending é visível para todos", () => {
    const user = { id: 1, allUserChat: "disabled", queues: [{ id: 1 }] };
    expect(
      canUserViewTicket(
        user,
        { userId: 2, queueId: 1, status: "pending", companyId: 1 }
      )
    ).toBe(true);
  });

  it("allUserChat vê tickets de colegas na mesma fila", () => {
    const user = { id: 1, allUserChat: "enabled", allHistoric: "enabled", queues: [{ id: 3 }] };
    expect(
      canUserViewTicket(
        user,
        { userId: 2, queueId: 3, status: "open", companyId: 1 }
      )
    ).toBe(true);
    expect(
      canUserViewTicket(
        user,
        { userId: 2, queueId: 9, status: "open", companyId: 1 }
      )
    ).toBe(true);
  });
});
