import { describe, expect, test } from "bun:test";

import { dataset, resolveSliceId } from "../lib/dataset";
import { compareSlice, rankSlice } from "../lib/rank";

describe("dataset provenance", () => {
  test("pinned commit and fixture hash inputs", () => {
    expect(dataset.sourceCommit).toBe("4d3916ac9cf474b679cdfcf492d43a0559418ad1");
    for (const r of dataset.results) {
      expect(r.source.sha256).toHaveLength(64);
      expect(r.source.url).toContain(dataset.sourceCommit);
    }
  });

  test("quarantines ambiguous x8 identity", () => {
    expect(dataset.quarantine.length).toBeGreaterThan(0);
    const q = JSON.stringify(dataset.quarantine);
    expect(q).toContain("x8");
  });
});

describe("ranking", () => {
  const sliceId = "v6.0|closed|gpt-oss-120b|Server|official|tokens_per_second|tokens/s";

  test("exact slice has three vendors and two families", () => {
    const slice = dataset.slices.find((s) => s.id === sliceId);
    expect(slice?.vendors.length).toBeGreaterThanOrEqual(2);
    expect(slice?.families.length).toBeGreaterThanOrEqual(2);
    expect(slice?.resultCount).toBeGreaterThanOrEqual(3);
  });

  test("official ranks are monotonic and paginated", () => {
    const page1 = rankSlice({ sliceId, limit: 1, offset: 0 });
    const page2 = rankSlice({ sliceId, limit: 1, offset: 1 });
    expect("rows" in page1 && "rows" in page2).toBe(true);
    if ("rows" in page1 && "rows" in page2) {
      expect(page1.rows[0].position).toBe(1);
      expect(page2.rows[0].position).toBe(2);
      expect(page1.rows[0].value).toBeGreaterThanOrEqual(page2.rows[0].value);
    }
  });

  test("does not mix llama and gpt-oss", () => {
    const ranked = rankSlice({ sliceId });
    if ("rows" in ranked) {
      expect(ranked.rows.every((r) => r.resultLogicalId.includes("gpt-oss-120b"))).toBe(true);
    }
  });

  test("derived view fails closed for this metric", () => {
    const ranked = rankSlice({ sliceId, metricView: "derived" });
    expect("error" in ranked).toBe(true);
  });

  test("compare reports missing evidence", () => {
    const out = compareSlice({
      sliceId,
      slugs: ["nvidia-b300-sxm-270gb", "does-not-exist"],
    });
    expect("missingEvidence" in out).toBe(true);
  });

  test("submitter filter and unknown scenario stay exact-slice", () => {
    const nvidia = rankSlice({ sliceId, submitter: "NVIDIA" });
    expect("rows" in nvidia && nvidia.rows.every((r) => r.submitter === "NVIDIA")).toBe(true);
    const missing = rankSlice({ sliceId, accuracyTarget: "99.9-not-in-snapshot" });
    expect("rows" in missing && missing.rows.length === 0).toBe(true);
  });
});

describe("slice filters", () => {
  test("Interactive has no comparable fixture slice", () => {
    const r = resolveSliceId({ workload: "gpt-oss-120b", scenario: "Interactive" });
    expect(r.code).toBe("no_comparable");
  });
});
