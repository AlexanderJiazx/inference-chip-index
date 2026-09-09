import { describe, expect, test } from "bun:test";

import { publicOriginFromRequest, rewriteDiscoveryJson, rewriteLocalOrigins } from "../lib/public-origin";

describe("public origin rewrite", () => {
  test("replaces localhost OASF endpoint with the public origin", () => {
    const src =
      '{"endpoint":"https://localhost:3000/.well-known/oasf-record.json","name":"inference-chip-index"}';
    const out = rewriteLocalOrigins(src, "https://example.trycloudflare.com");
    expect(out).toContain("https://example.trycloudflare.com/.well-known/oasf-record.json");
    expect(out).not.toContain("localhost");
  });

  test("fills empty OASF locators with the public record URL", () => {
    const src = '{"endpoint":"https://localhost:3000/.well-known/oasf-record.json","locators":[]}';
    const out = rewriteDiscoveryJson(src, "https://example.trycloudflare.com");
    const body = JSON.parse(out) as { endpoint: string; locators: string[] };
    expect(body.endpoint).toBe("https://example.trycloudflare.com/.well-known/oasf-record.json");
    expect(body.locators).toEqual(["https://example.trycloudflare.com/.well-known/oasf-record.json"]);
  });

  test("prefers AGENT_PUBLIC_ORIGIN over the request host", () => {
    const prev = process.env.AGENT_PUBLIC_ORIGIN;
    process.env.AGENT_PUBLIC_ORIGIN = "https://southeast-signatures-nascar-seriously.trycloudflare.com";
    try {
      const origin = publicOriginFromRequest(
        new Request("http://127.0.0.1:3000/api/agent/.well-known/oasf-record.json"),
      );
      expect(origin).toBe("https://southeast-signatures-nascar-seriously.trycloudflare.com");
    } finally {
      if (prev === undefined) delete process.env.AGENT_PUBLIC_ORIGIN;
      else process.env.AGENT_PUBLIC_ORIGIN = prev;
    }
  });
});
