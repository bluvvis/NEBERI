import { describe, expect, it } from "vitest";
import { buildFetchUrl } from "./buildApiUrl";

describe("buildFetchUrl", () => {
  it("uses origin for relative path", () => {
    const u = buildFetchUrl("/v1/events", "http://localhost:5173");
    expect(u).toBe("http://localhost:5173/v1/events");
  });

  it("preserves host for absolute VITE_API_BASE (e2e / k8s)", () => {
    const u = buildFetchUrl("/v1/events", "http://localhost:5173", {
      viteApiBase: "http://api.internal:8000",
    });
    expect(u).toBe("http://api.internal:8000/v1/events");
  });

  it("merges search params", () => {
    const u = buildFetchUrl("/v1/events", "http://web", {
      viteApiBase: "http://api:8000",
      search: { risk_level: "high" },
    });
    expect(u).toBe("http://api:8000/v1/events?risk_level=high");
  });

  it("resolves auth avatar path with API base (отдельный хост API)", () => {
    const u = buildFetchUrl("/v1/auth/avatars/550e8400-e29b-41d4-a716-446655440000", "https://app.example", {
      viteApiBase: "https://api.example",
    });
    expect(u).toBe("https://api.example/v1/auth/avatars/550e8400-e29b-41d4-a716-446655440000");
  });
});
