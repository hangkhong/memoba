import { describe, expect, it } from "vitest";
import { findStudioUrl, formatLocalEndpoints, parseNativeStack } from "./local-stack";

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

describe("local endpoint summary", () => {
  const stackWith = (endpoints: Record<string, { url: string }>) =>
    parseNativeStack({ runtime: "native", env: { API_URL: "http://127.0.0.1:19999", PUBLISHABLE_KEY: "public-key-value", SECRET_KEY: "secret-key-value" }, endpoints });
  it("prints app, studio and API URLs without keys", () => {
    const output = formatLocalEndpoints(stackWith({ "studio.http": { url: "http://127.0.0.1:30801" }, "database.sql": { url: "tcp://127.0.0.1:17777" } }), "http://localhost:3000");
    expect(output).toContain("App: http://localhost:3000");
    expect(output).toContain("Studio: http://127.0.0.1:30801");
    expect(output).toContain("API: http://127.0.0.1:19999");
    expect(output).not.toContain("public-key-value");
    expect(output).not.toContain("secret-key-value");
  });
  it("reports studio as unavailable when the CLI returns no studio endpoint", () => {
    const output = formatLocalEndpoints(stackWith({ "database.sql": { url: "tcp://127.0.0.1:17777" } }), "http://localhost:3000");
    expect(output).toContain("Studio: unavailable");
    expect(findStudioUrl({})).toBeUndefined();
  });
});
