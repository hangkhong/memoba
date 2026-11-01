import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  // The docs pages read Markdown from docs/ at request time, which tracing cannot see on its own.
  outputFileTracingIncludes: { "/docs/**": ["./docs/product/*.md", "./docs/engine/*.md"], "/workspace/docs/**": ["./docs/product/*.md", "./docs/engine/*.md"] },
  devIndicators: { position: "bottom-right" },
  turbopack: {
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
};
export default nextConfig;
