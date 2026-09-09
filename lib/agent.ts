import { createAgent } from "@lucid-agents/core";
import { http } from "@lucid-agents/http";
import { identity } from "@lucid-agents/identity";
import { payments, paymentsFromEnv } from "@lucid-agents/payments";
import { z } from "zod";

import { dataset, datasetStatus, getSlice } from "./dataset";
import { compareSlice, rankSlice } from "./rank";

const sourceSchema = z.object({
  repository: z.string(),
  commit: z.string(),
  path: z.string(),
  url: z.string(),
  sha256: z.string(),
});

const rankInput = z.object({
  sliceId: z.string().min(1),
  vendor: z.string().optional(),
  submitter: z.string().optional(),
  accuracyTarget: z.string().optional(),
  metricView: z.enum(["official", "derived"]).default("official"),
  grouping: z.enum(["all-systems", "best-per-accelerator"]).default("all-systems"),
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(25),
});

const compareInput = z.object({
  sliceId: z.string().min(1),
  acceleratorSlugs: z.array(z.string().min(1)).min(2).max(8),
  baselineSlug: z.string().optional(),
});

const previewInput = z.object({
  sliceId: z.string().optional(),
});

function failClosedPaid(): never {
  throw new Error("Paid entrypoint invoked without a verified x402 payment. Fail closed.");
}

const payCfg = paymentsFromEnv();

let builder = createAgent({
  name: "inference-chip-index",
  version: "0.1.0",
  description:
    "Exact-slice MLPerf Inference v6.0 Closed-division index of inference accelerators. Rankings are never universal.",
});

if (payCfg) {
  builder = builder.use(
    payments({
      config: {
        ...payCfg,
        network: payCfg.network ?? "eip155:84532",
      },
    }),
  );
}

const runtime = await builder
  .use(
    identity({
      config: {
        registration: {
          selectedServices: ["web", "OASF"],
          oasf: {
            authors: ["Inference Chip Index"],
            skills: ["exact-slice-ranking", "mlperf-inference-v6-closed"],
            domains: ["machine-learning", "accelerator-benchmarks"],
            modules: [],
            locators: [],
          },
        },
      },
    }),
  )
  .use(http({ basePath: "/api/agent", servicePage: false }))
  .addEntrypoint({
    key: "get-dataset-status",
    description: "Free dataset manifest, freshness, slice IDs, and source links.",
    input: z.object({}),
    output: z.object({
      datasetVersion: z.string(),
      generatedAt: z.string(),
      lastReviewedAt: z.string(),
      freshness: z.string(),
      release: z.string(),
      sourceCommit: z.string(),
      sourceRepository: z.string(),
      counts: z.record(z.string(), z.number()),
      coverage: z.record(z.string(), z.boolean()),
      sliceIds: z.array(z.string()),
      sourceLinks: z.array(z.object({ label: z.string(), url: z.string() })),
      metrics: z.array(z.record(z.string(), z.unknown())),
    }),
    handler: async () => ({ output: datasetStatus() }),
  })
  .addEntrypoint({
    key: "preview-inference-chips",
    description: "Free preview of up to five verified rows for an optional exact slice.",
    input: previewInput,
    output: z.object({
      sliceId: z.string().nullable(),
      comparability: z.string(),
      datasetVersion: z.string(),
      rows: z.array(z.record(z.string(), z.unknown())),
      note: z.string(),
    }),
    handler: async ({ input }) => {
      const sliceId = input.sliceId ?? dataset.slices[0]?.id;
      if (!sliceId) {
        return {
          output: {
            sliceId: null,
            comparability: "No comparable verified slices in this dataset version.",
            datasetVersion: dataset.datasetVersion,
            rows: [],
            note: "empty",
          },
        };
      }
      const ranked = rankSlice({ sliceId, limit: 5 });
      if ("error" in ranked) {
        return {
          output: {
            sliceId,
            comparability: ranked.error,
            datasetVersion: dataset.datasetVersion,
            rows: [],
            note: ranked.code,
          },
        };
      }
      return {
        output: {
          sliceId,
          comparability: ranked.comparability,
          datasetVersion: ranked.datasetVersion,
          rows: ranked.rows,
          note: "preview-max-5",
        },
      };
    },
  })
  .addEntrypoint({
    key: "rank-inference-chips",
    description: "Paid exact-slice ranking of official submitted-system results.",
    input: rankInput,
    output: z.record(z.string(), z.unknown()),
    price: "0.02",
    network: "eip155:84532",
    paymentProtocol: "x402",
    handler: async ({ input }) => {
      if (!payCfg) failClosedPaid();
      const ranked = rankSlice(input);
      if ("error" in ranked) {
        return { output: ranked };
      }
      const encoded = JSON.stringify(ranked);
      if (Buffer.byteLength(encoded, "utf8") >= 1024 * 1024) {
        return { output: { error: "Response would exceed 1 MiB", code: "payload_too_large" } };
      }
      return { output: ranked };
    },
  })
  .addEntrypoint({
    key: "compare-inference-chips",
    description: "Paid exact-slice comparison of 2–8 accelerator slugs.",
    input: compareInput,
    output: z.record(z.string(), z.unknown()),
    price: "0.03",
    network: "eip155:84532",
    paymentProtocol: "x402",
    handler: async ({ input }) => {
      if (!payCfg) failClosedPaid();
      return {
        output: compareSlice({
          sliceId: input.sliceId,
          slugs: input.acceleratorSlugs,
          baseline: input.baselineSlug,
        }),
      };
    },
  })
  .build();

export { getSlice, runtime };
export const handlers = runtime.http.handlers;
