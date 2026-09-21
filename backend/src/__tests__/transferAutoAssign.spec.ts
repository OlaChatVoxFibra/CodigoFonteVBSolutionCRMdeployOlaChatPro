import { shouldAutoAssignOnTransfer } from "../helpers/transferAutoAssign";

describe("transferAutoAssign", () => {
  it("permite auto-assign em fluxo normal", () => {
    expect(
      shouldAutoAssignOnTransfer({
        isTransfered: false,
        userId: null,
        oldQueueId: 1,
        newQueueId: 2
      })
    ).toBe(true);
  });

  it("bloqueia auto-assign em transferência para usuário específico", () => {
    expect(
      shouldAutoAssignOnTransfer({
        isTransfered: true,
        userId: 5,
        oldQueueId: 1,
        newQueueId: 2
      })
    ).toBe(false);
  });

  it("permite auto-assign em transferência só de fila", () => {
    expect(
      shouldAutoAssignOnTransfer({
        isTransfered: true,
        userId: null,
        oldQueueId: 1,
        newQueueId: 2
      })
    ).toBe(true);
  });
});
