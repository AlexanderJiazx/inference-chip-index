import { dataset, getSlice, resultsForSlice } from "./dataset";

export type RankRow = {
  rank: number;
  position: number;
  tied: boolean;
  resultLogicalId: string;
  contentVersionId: string;
  systemLogicalId: string;
  acceleratorSlug: string | null;
  submitter: string;
  vendor: string;
  family: string;
  value: number;
  unit: string;
  metricView: "official" | "derived";
  source: (typeof dataset.results)[number]["source"];
};

export type RankPage = {
  sliceId: string;
  comparability: string;
  datasetVersion: string;
  sourceCommit: string;
  metricView: "official" | "derived";
  grouping: "all-systems" | "best-per-accelerator";
  total: number;
  offset: number;
  limit: number;
  rows: RankRow[];
  sourceLinks: string[];
  notes: string[];
};

function denseRank(values: number[]): number[] {
  const ranks: number[] = [];
  let rank = 1;
  for (let i = 0; i < values.length; i++) {
    if (i > 0 && values[i] !== values[i - 1]) rank = i + 1;
    ranks.push(rank);
  }
  return ranks;
}

export function rankSlice(opts: {
  sliceId: string;
  vendor?: string;
  submitter?: string;
  accuracyTarget?: string;
  metricView?: "official" | "derived";
  grouping?: "all-systems" | "best-per-accelerator";
  offset?: number;
  limit?: number;
}): RankPage | { error: string; code: string } {
  const slice = getSlice(opts.sliceId);
  if (!slice) return { error: "Unknown comparison slice ID", code: "invalid_filters" };
  const metricView = opts.metricView ?? "official";
  const grouping = opts.grouping ?? "all-systems";
  const offset = Math.max(0, opts.offset ?? 0);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 25));
  const notes: string[] = [];

  if (metricView === "derived") {
    const metric = dataset.metrics.find((m) => m.id === slice.metricId);
    if (!metric?.derivationAllowed) {
      return {
        error: "Derived per-accelerator values are not permitted for this metric. Official submitted-system results are the ranking metric.",
        code: "derived_forbidden",
      };
    }
  }

  let rows = resultsForSlice(opts.sliceId);
  if (opts.vendor) {
    rows = rows.filter((r) => r.vendor === opts.vendor);
  }
  if (opts.submitter) {
    rows = rows.filter((r) => r.submitter === opts.submitter);
  }
  if (opts.accuracyTarget && opts.accuracyTarget !== "as-submitted") {
    rows = rows.filter((r) => r.accuracyTarget === opts.accuracyTarget);
  }
  if (grouping === "best-per-accelerator") {
    const best = new Map<string, (typeof rows)[number]>();
    for (const r of rows) {
      const key = r.acceleratorSlug ?? r.systemLogicalId;
      const prev = best.get(key);
      if (!prev || r.value > prev.value) best.set(key, r);
    }
    rows = [...best.values()];
  }

  rows = [...rows].sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    return a.logicalId.localeCompare(b.logicalId);
  });

  const ranks = denseRank(rows.map((r) => r.value));
  const ranked: RankRow[] = rows.map((r, i) => ({
    rank: ranks[i],
    position: i + 1,
    tied: ranks.filter((x) => x === ranks[i]).length > 1,
    resultLogicalId: r.logicalId,
    contentVersionId: r.contentVersionId,
    systemLogicalId: r.systemLogicalId,
    acceleratorSlug: r.acceleratorSlug,
    submitter: r.submitter,
    vendor: r.vendor,
    family: r.family,
    value: r.value,
    unit: r.unit,
    metricView,
    source: r.source,
  }));

  const page = ranked.slice(offset, offset + limit);
  return {
    sliceId: slice.id,
    comparability: slice.comparability,
    datasetVersion: dataset.datasetVersion,
    sourceCommit: dataset.sourceCommit,
    metricView,
    grouping,
    total: ranked.length,
    offset,
    limit,
    rows: page,
    sourceLinks: [...new Set(page.map((r) => r.source.url))],
    notes,
  };
}

export function compareSlice(opts: {
  sliceId: string;
  slugs: string[];
  baseline?: string;
}): Record<string, unknown> | { error: string; code: string } {
  if (opts.slugs.length < 2 || opts.slugs.length > 8) {
    return { error: "Provide 2–8 accelerator slugs", code: "invalid_filters" };
  }
  const ranked = rankSlice({ sliceId: opts.sliceId, grouping: "best-per-accelerator", limit: 100 });
  if ("error" in ranked) return ranked;
  const wanted = new Set(opts.slugs);
  const found = ranked.rows.filter((r) => r.acceleratorSlug && wanted.has(r.acceleratorSlug));
  const missing = opts.slugs.filter((s) => !found.some((r) => r.acceleratorSlug === s)).map((slug) => ({
    slug,
    reason: "No verified official result for this accelerator in the exact comparison slice.",
  }));
  const baseline = opts.baseline ? found.find((r) => r.acceleratorSlug === opts.baseline) : undefined;
  const withDelta = found.map((r) => ({
    ...r,
    deltaVsBaseline:
      baseline && r.unit === baseline.unit
        ? { baseline: baseline.acceleratorSlug, delta: r.value - baseline.value, unit: r.unit }
        : null,
  }));
  return {
    sliceId: opts.sliceId,
    comparability: ranked.comparability,
    datasetVersion: ranked.datasetVersion,
    sourceCommit: ranked.sourceCommit,
    sourceLinks: ranked.sourceLinks,
    results: withDelta,
    missingEvidence: missing,
  };
}
