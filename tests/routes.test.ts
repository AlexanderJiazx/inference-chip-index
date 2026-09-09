import { describe, expect, test } from "bun:test";

import { createAgent } from "@lucid-agents/core";
import { http } from "@lucid-agents/http";
import { z } from "zod";

describe("lucid routes", () => {
  test("http handlers exist for required discovery paths", async () => {
    const runtime = await createAgent({ name: "t", version: "0.0.1" })
      .use(http({ basePath: "/api/agent", servicePage: false }))
      .addEntrypoint({
        key: "ping",
        input: z.object({}),
        output: z.object({ ok: z.boolean() }),
        handler: async () => ({ output: { ok: true } }),
      })
      .build();
    expect(runtime.http.handlers.health).toBeTypeOf("function");
    expect(runtime.http.handlers.entrypoints).toBeTypeOf("function");
    expect(runtime.http.handlers.invoke).toBeTypeOf("function");
    expect(runtime.http.handlers.stream).toBeTypeOf("function");
    expect(runtime.http.handlers.manifest).toBeTypeOf("function");
    const health = await runtime.http.handlers.health(new Request("http://x/api/agent/health"));
    expect(health.ok).toBe(true);
  });

  test("pinned zod can serialize rank input records for agent.json", async () => {
    const { runtime } = await import("../lib/agent");
    const res = await runtime.http.handlers.manifest(
      new Request("http://127.0.0.1:3000/api/agent/.well-known/agent.json"),
    );
    expect(res.ok).toBe(true);
    const body = await res.json();
    expect(body.name).toBe("inference-chip-index");
    expect(body.skills?.length).toBeGreaterThan(0);
  });

  test("OASF record is enabled from identity registration", async () => {
    const { runtime } = await import("../lib/agent");
    const res = await runtime.http.handlers.oasf(
      new Request("http://127.0.0.1:3000/api/agent/.well-known/oasf-record.json"),
    );
    expect(res.ok).toBe(true);
    const body = await res.json();
    expect(body.name).toBe("inference-chip-index");
    expect(Array.isArray(body.entrypoints)).toBe(true);
    expect(body.entrypoints.length).toBeGreaterThan(0);
  });
});
