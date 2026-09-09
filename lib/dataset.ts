import datasetJson from "../data/generated/dataset.json";

export type SourceRef = {
  repository: string;
  commit: string;
  path: string;
  url: string;
  sha256: string;
};

export type Dataset = typeof datasetJson;

export const dataset = datasetJson as Dataset;

export function getSlice(id: string) {
  return dataset.slices.find((s) => s.id === id) ?? null;
}

export function resultsForSlice(id: string) {
  const slice = getSlice(id);
  if (!slice) return [];
  return dataset.results.filter(
    (r) =>
      r.workload === slice.workload &&
      r.scenario === slice.scenario &&
      r.metricId === slice.metricId &&
      r.unit === slice.unit &&
      !r.reviewRequired &&
      r.valid,
  );
}

export const WORKLOADS = ["llama3.1-8b", "gpt-oss-120b", "deepseek-r1"] as const;
export const SCENARIOS = ["Server", "Interactive", "Offline"] as const;

export function uniqueSubmitters() {
  return [...new Set(dataset.results.map((r) => r.submitter))].sort();
}

export function uniqueVendors() {
  return [...new Set(dataset.results.map((r) => r.vendor))].sort();
}

export function uniqueAccuracyTargets() {
  const values = [...new Set(dataset.results.map((r) => r.accuracyTarget ?? "as-submitted"))];
  return values.sort();
}

export function resolveSliceId(opts: {
  sliceId?: string;
  workload?: string;
  scenario?: string;
}): { sliceId: string; error?: string; code?: string } {
  if (opts.sliceId) {
    return getSlice(opts.sliceId)
      ? { sliceId: opts.sliceId }
      : { sliceId: opts.sliceId, error: "Unknown comparison slice ID", code: "invalid_filters" };
  }
  const workload = opts.workload || "gpt-oss-120b";
  const scenario = opts.scenario || "Server";
  const match = dataset.slices.find((s) => s.workload === workload && s.scenario === scenario);
  if (!match) {
    return {
      sliceId: `v6.0|closed|${workload}|${scenario}|official|tokens_per_second|tokens/s`,
      error: `No verified Closed-division results for workload ${workload} and scenario ${scenario} in this frozen snapshot.`,
      code: "no_comparable",
    };
  }
  return { sliceId: match.id };
}

export function datasetStatus() {
  return {
    datasetVersion: dataset.datasetVersion,
    generatedAt: dataset.generatedAt,
    lastReviewedAt: dataset.lastReviewedAt,
    freshness: dataset.freshness,
    release: dataset.release,
    sourceCommit: dataset.sourceCommit,
    sourceRepository: dataset.sourceRepository,
    counts: dataset.counts,
    coverage: dataset.coverage,
    sliceIds: dataset.slices.map((s) => s.id),
    sourceLinks: [
      {
        label: "Pinned MLPerf Inference v6.0 commit",
        url: `${dataset.sourceRepository}/tree/${dataset.sourceCommit}`,
      },
    ],
    metrics: dataset.metrics,
  };
}
