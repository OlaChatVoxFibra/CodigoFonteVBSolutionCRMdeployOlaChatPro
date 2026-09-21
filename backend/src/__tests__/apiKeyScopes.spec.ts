import {
  hasApiScope,
  normalizeScopes,
  ALL_API_SCOPES
} from "../helpers/apiKeyScopes";

describe("apiKeyScopes", () => {
  it("full scope grants any permission", () => {
    expect(hasApiScope(["full"], "contacts:read")).toBe(true);
    expect(hasApiScope(["full"], "tools:execute")).toBe(true);
  });

  it("denies scope when not included", () => {
    expect(hasApiScope(["contacts:read"], "contacts:write")).toBe(false);
    expect(hasApiScope(["activities:read"], "leads:read")).toBe(false);
  });

  it("grants specific scope when listed", () => {
    expect(hasApiScope(["contacts:read", "leads:write"], "contacts:read")).toBe(
      true
    );
    expect(hasApiScope(["contacts:read", "leads:write"], "leads:write")).toBe(
      true
    );
  });

  it("normalizes invalid scopes to full", () => {
    expect(normalizeScopes(null)).toEqual(["full"]);
    expect(normalizeScopes(["invalid"])).toEqual(["full"]);
    expect(normalizeScopes(["contacts:read"])).toEqual(["contacts:read"]);
  });

  it("lists all known scopes", () => {
    expect(ALL_API_SCOPES).toContain("tools:execute");
    expect(ALL_API_SCOPES).toContain("full");
  });
});
