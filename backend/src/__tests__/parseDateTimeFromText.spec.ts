import { parseDateTimeFromText } from "../helpers/parseDateTimeFromText";

describe("parseDateTimeFromText", () => {
  it("interpreta só horário como hoje", () => {
    const { date, matched } = parseDateTimeFromText("às 15h30");
    expect(matched).toBe(true);
    expect(date).not.toBeNull();
    expect(date!.getHours()).toBe(15);
    expect(date!.getMinutes()).toBe(30);
  });

  it("mantém dd/mm com hora", () => {
    const { date, matched } = parseDateTimeFromText("12/05/2026 às 10h");
    expect(matched).toBe(true);
    expect(date!.getDate()).toBe(12);
    expect(date!.getMonth()).toBe(4);
    expect(date!.getFullYear()).toBe(2026);
  });
});
