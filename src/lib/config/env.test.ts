import { describe, expect, it } from "vitest";
import { readAIConfig, readAppConfig } from "./env";

const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:12345",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "local-public-key",
};

describe("configuration boundary", () => {
  it("rejects invalid and non-HTTP Supabase URLs", () => {
    expect(readAppConfig({ ...publicEnv, NEXT_PUBLIC_SUPABASE_URL: "bad" }).kind).toBe("invalid");
    expect(readAppConfig({ ...publicEnv, NEXT_PUBLIC_SUPABASE_URL: "file:///tmp/db" }).kind).toBe("invalid");
  });
  it("keeps the application configured without AI access", () => {
    expect(readAppConfig(publicEnv).kind).toBe("configured");
    expect(readAIConfig(publicEnv).kind).toBe("unavailable");
  });
  it("distinguishes absent configuration from invalid configuration", () => {
    expect(readAppConfig({}).kind).toBe("unavailable");
    expect(readAppConfig({ NEXT_PUBLIC_SUPABASE_URL: publicEnv.NEXT_PUBLIC_SUPABASE_URL }).kind).toBe("invalid");
  });
  it("requires explicit models and a positive embedding dimension", () => {
    expect(readAIConfig({ AI_GATEWAY_API_KEY: "secret" }).kind).toBe("unavailable");
    const configured = { AI_GATEWAY_API_KEY: "secret", AI_REASONING_MODEL: "provider/reasoning", AI_EMBEDDING_MODEL: "provider/embedding", AI_EMBEDDING_DIMENSIONS: "1536" };
    expect(readAIConfig(configured).kind).toBe("configured");
    expect(readAIConfig({ ...configured, AI_EMBEDDING_DIMENSIONS: "0" }).kind).toBe("unavailable");
  });
  it("reports missing names without returning secrets in failures", () => {
    const result = readAIConfig({ AI_GATEWAY_API_KEY: "do-not-log-this" });
    expect(JSON.stringify(result)).not.toContain("do-not-log-this");
  });
});

it("accepts Node's actual environment object", () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    expect(readAppConfig(process.env).kind).toBe("configured");
  } finally {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previousKey;
  }
});
