import {
  generateApiKey,
  hashApiKey,
  verifyApiKey,
  extractApiKeyFromRequest,
  API_KEY_PREFIX
} from "../helpers/apiKeyUtils";

describe("apiKeyUtils", () => {
  it("generates keys with vb_live prefix", () => {
    const { key, keyPrefix } = generateApiKey();
    expect(key).toMatch(/^vb_live_[a-f0-9]{8}_[a-f0-9]{48}$/);
    expect(keyPrefix).toMatch(/^vb_live_[a-f0-9]{8}$/);
    expect(key.startsWith(keyPrefix)).toBe(true);
    expect(API_KEY_PREFIX).toBe("vb_live_");
  });

  it("hashes and verifies api keys", async () => {
    const { key } = generateApiKey();
    const hash = await hashApiKey(key);
    expect(await verifyApiKey(key, hash)).toBe(true);
    expect(await verifyApiKey(`${key}x`, hash)).toBe(false);
  });

  it("extracts key from Authorization Bearer header", () => {
    const key = "vb_live_abcd1234_secretpart";
    expect(
      extractApiKeyFromRequest(`Bearer ${key}`, undefined)
    ).toBe(key);
  });

  it("extracts key from X-API-Key header", () => {
    const key = "vb_live_abcd1234_secretpart";
    expect(extractApiKeyFromRequest(undefined, key)).toBe(key);
  });
});
