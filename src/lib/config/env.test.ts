import { describe, expect, it } from "vitest";
import { readAIConfig, readAppConfig, readEmbeddingProfile } from "./env";

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
    expect(readAIConfig({ GOOGLE_GENERATIVE_AI_API_KEY: "secret" }).kind).toBe("unavailable");
    const configured = { GOOGLE_GENERATIVE_AI_API_KEY: "secret", AI_REASONING_MODEL: "gemini-3.5-flash", AI_EMBEDDING_MODEL: "gemini-embedding-2", AI_EMBEDDING_DIMENSIONS: "1536" };
    expect(readAIConfig(configured).kind).toBe("configured");
    expect(readAIConfig({ ...configured, AI_EMBEDDING_DIMENSIONS: "0" }).kind).toBe("unavailable");
    expect(readAIConfig({ ...configured, AI_EMBEDDING_MODEL: "google/gemini-embedding-2" }).kind).toBe("unavailable");
  });
  it("reports missing names without returning secrets in failures", () => {
    const result = readAIConfig({ GOOGLE_GENERATIVE_AI_API_KEY: "do-not-log-this" });
    expect(JSON.stringify(result)).not.toContain("do-not-log-this");
  });
  it("accepts OpenAI-only configuration and requires only selected provider credentials", () => {
    const values = { OPENAI_API_KEY: "openai-test-key", AI_REASONING_MODEL: "openai:gpt-6-luna", AI_EMBEDDING_MODEL: "openai:text-embedding-3-small", AI_EMBEDDING_DIMENSIONS: "1536" };
    expect(readAIConfig(values)).toMatchObject({ kind: "configured", value: { AI_REASONING_MODEL: { provider: "openai", modelId: "gpt-6-luna", registryId: "openai:gpt-6-luna" } } });
    expect(readAIConfig({ ...values, OPENAI_API_KEY: "" })).toMatchObject({ kind: "unavailable", fields: ["OPENAI_API_KEY"] });
    expect(readEmbeddingProfile({ ...values, OPENAI_API_KEY: "" })).toEqual({ kind: "configured", value: { embeddingModel: "text-embedding-3-small", dimensions: 1536 } });
    expect(readEmbeddingProfile({ ...values, AI_EMBEDDING_MODEL: "openai:wrong" }).kind).toBe("invalid");
    expect(readEmbeddingProfile({}).kind).toBe("unavailable");
    expect(readAIConfig({ ...values, AI_EMBEDDING_MODEL: "google:gemini-embedding-2" })).toMatchObject({ kind: "unavailable", fields: ["GOOGLE_GENERATIVE_AI_API_KEY"] });
    expect(readAIConfig({ ...values, GOOGLE_GENERATIVE_AI_API_KEY: "google-test-key", AI_EMBEDDING_MODEL: "google:gemini-embedding-2" }).kind).toBe("configured");
  });
  it("rejects unknown providers and unsupported embedding profiles before making calls", () => {
    const values = { OPENAI_API_KEY: "test", AI_REASONING_MODEL: "openai:gpt-6-luna", AI_EMBEDDING_MODEL: "openai:text-embedding-3-small", AI_EMBEDDING_DIMENSIONS: 1536 };
    expect(readAIConfig({ ...values, AI_REASONING_MODEL: "unknown:model" }).kind).toBe("unavailable");
    expect(readAIConfig({ ...values, AI_EMBEDDING_MODEL: "openai:text-embedding-3-large" }).kind).toBe("unavailable");
    expect(readAIConfig({ ...values, AI_EMBEDDING_DIMENSIONS: 768 }).kind).toBe("unavailable");
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
