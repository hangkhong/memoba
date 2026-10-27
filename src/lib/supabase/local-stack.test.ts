import { describe, expect, it } from "vitest";
import { parseNativeStack } from "./local-stack";

describe("native CLI boundary", () => {
  it("reads dynamic endpoints and credentials from CLI output", () => {
    const result = parseNativeStack({ runtime: "native", env: { API_URL: "http://127.0.0.1:19999", PUBLISHABLE_KEY: "public", SECRET_KEY: "private" }, endpoints: { "database.sql": { url: "tcp://127.0.0.1:17777" } } });
    expect(result.url).toBe("http://127.0.0.1:19999");
  });
  it("rejects a remote or nonnative stack before local seeding", () => {
    expect(() => parseNativeStack({ runtime: "docker", env: {} })).toThrow();
    expect(() => parseNativeStack({ runtime: "native", env: { API_URL: "https://production.supabase.co", PUBLISHABLE_KEY: "public", SECRET_KEY: "private" }, endpoints: {} })).toThrow();
  });
});
