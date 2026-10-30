import { describe, expect, it } from "vitest";
import { resolveTarget } from "./target";

describe("seed target", () => {
  it("names the missing variable for a remote target", () => {
    expect(() => resolveTarget(["--remote"], {})).toThrow("SUPABASE_URL");
    expect(() => resolveTarget(["--remote"], { SUPABASE_URL: "https://abc.supabase.co" })).toThrow("SUPABASE_SECRET_KEY");
  });
  it("rejects a non-https remote URL", () => {
    expect(() => resolveTarget(["--remote"], { SUPABASE_URL: "http://abc.supabase.co", SUPABASE_SECRET_KEY: "k" })).toThrow("SUPABASE_URL");
  });
  it("reads a remote target from the environment", () => {
    expect(resolveTarget(["--remote"], { SUPABASE_URL: "https://abc.supabase.co", SUPABASE_SECRET_KEY: "k" })).toEqual({ url: "https://abc.supabase.co", secretKey: "k", kind: "remote" });
  });
});
