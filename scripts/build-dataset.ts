import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const COMMIT = "4d3916ac9cf474b679cdfcf492d43a0559418ad1";
const REPO = "https://github.com/mlcommons/inference_results_v6.0";
const RAW = `${REPO}/blob/${COMMIT}`;
const WORKLOADS = new Set(["llama3.1-8b", "llama3_1-8b", "gpt-oss-120b", "deepseek-r1"]);
const SCENARIOS = new Set(["Server", "Interactive", "Offline"]);

type SourceRef = {
  repository: string;
  commit: string;
  path: string;
  url: string;
  sha256: string;
};

type Accelerator = {
  logicalId: string;
  contentVersionId: string;
  slug: string;
  vendor: string;
  family: string;
  modelName: string;
  source: SourceRef;
  reviewRequired: boolean;
  reviewReasons: string[];
};

type SystemRec = {
  logicalId: string;
  contentVersionId: string;
  submitter: string;
  systemName: string;
  vendor: string;
  acceleratorsPerNode: number | null;
  acceleratorSlug: string | null;
  nodes: number;
  source: SourceRef;
  reviewRequired: boolean;
  reviewReasons: string[];
  status: string;
};

type ResultRec = {
  logicalId: string;
  contentVersionId: string;
  systemLogicalId: string;
  acceleratorSlug: string | null;
  submitter: string;
  vendor: string;
  family: string;
  workload: string;
  scenario: string;
  metricId: string;
  unit: string;
  value: number;
  accuracyTarget: string | null;
  valid: boolean;
  reviewRequired: boolean;
  reviewReasons: string[];
  source: SourceRef;
};

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function sourceRef(abs: string, buf: Buffer): SourceRef {
  const rel = relative(join(ROOT, "data/fixtures"), abs).replaceAll("\\", "/");
  const path = rel.startsWith("logs/") ? rel.slice("logs/".length) : guessRepoPath(rel);
  return {
    repository: REPO,
    commit: COMMIT,
    path,
    url: `${RAW}/${path}`,
    sha256: sha256(buf),
  };
}

function guessRepoPath(rel: string): string {
  if (rel.startsWith("nvidia/")) return `closed/NVIDIA/systems/${rel.split("/").slice(1).join("/")}`;
  if (rel.startsWith("amd/")) return `closed/AMD/systems/${rel.split("/").slice(1).join("/")}`;
  if (rel.startsWith("intel/")) return `closed/Intel/systems/${rel.split("/").slice(1).join("/")}`;
  return rel;
}

function cid(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 16);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(r\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function vendorOf(submitter: string, model: string): string {
  const m = model.toLowerCase();
  if (m.includes("nvidia") || submitter === "NVIDIA") return "NVIDIA";
  if (m.includes("amd") || submitter === "AMD") return "AMD";
  if (m.includes("intel") || submitter === "Intel") return "Intel";
  return submitter || "unknown";
}

function familyOf(model: string): string {
  const m = model.toLowerCase();
  if (m.includes("b300")) return "NVIDIA-B300";
  if (m.includes("b200")) return "NVIDIA-B200";
  if (m.includes("gb200")) return "NVIDIA-GB200";
  if (m.includes("gb300")) return "NVIDIA-GB300";
  if (m.includes("mi355")) return "AMD-MI355X";
  if (m.includes("mi300")) return "AMD-MI300";
  if (m.includes("b70") || m.includes("b60") || m.includes("b50") || m.includes("arc")) return "Intel-Battlemage";
  if (m.includes("gaudi")) return "Intel-Gaudi";
  return "unknown";
}

function normalizeWorkload(name: string): string {
  if (name === "llama3_1-8b" || name === "llama3.1-8b") return "llama3.1-8b";
  return name;
}

function parseIntish(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true, encoding: "utf8" });
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) out.push(...(await walk(p)));
      else out.push(p);
    }
  } catch {
    return out;
  }
  return out;
}

function parseSummary(text: string): { valid: boolean; scenario: string | null; tokensPerSecond: number | null } {
  const valid = /Result is\s*:\s*VALID/i.test(text);
  const sc = text.match(/Scenario\s*:\s*(\S+)/);
  const tok =
    text.match(/Completed tokens per second\s*:\s*([0-9.]+)/i) ||
    text.match(/Tokens per second\s*:\s*([0-9.]+)/i);
  return {
    valid,
    scenario: sc ? sc[1] : null,
    tokensPerSecond: tok ? Number(tok[1]) : null,
  };
}

const METRICS = [
  {
    id: "tokens_per_second",
    canonicalUnit: "tokens/s",
    winningDirection: "higher" as const,
    allowedWorkloads: ["llama3.1-8b", "gpt-oss-120b", "deepseek-r1"],
    allowedScenarios: ["Server", "Interactive", "Offline"],
    upstreamLogKeys: ["Completed tokens per second"],
    validity: "MLPerf log must report Result is : VALID and satisfy duration/query/early-stopping constraints in the source log.",
    derivationAllowed: false,
  },
];

async function main() {
  const mode = process.argv.includes("--mode=full-source") ? "full-source" : "fixture";
  const fixtureRoot = join(ROOT, "data/fixtures");
  const systems: SystemRec[] = [];
  const accelerators: Accelerator[] = [];
  const results: ResultRec[] = [];
  const tombstones: unknown[] = [];
  const quarantine: Array<Record<string, unknown>> = [];

  const systemFiles = [
    join(fixtureRoot, "nvidia/B300-SXM-270GBx8_TRT.json"),
    join(fixtureRoot, "amd/8xMI355X_2xEPYC_9575F.json"),
    join(fixtureRoot, "intel/1-node-4x-BMG-B70.json"),
    join(fixtureRoot, "quarantine/mystery-x8.json"),
  ];

  for (const file of systemFiles) {
    const buf = await readFile(file);
    const src = sourceRef(file, buf);
    const raw = JSON.parse(buf.toString("utf8")) as Record<string, unknown>;
    const reasons: string[] = [];
    const model = String(raw.accelerator_model_name || "");
    const submitter = String(raw.submitter || "unknown");
    const count = parseIntish(raw.accelerators_per_node);
    const name = String(raw.system_name || "");
    if (!model) reasons.push("missing accelerator_model_name");
    if (count == null) {
      reasons.push("accelerators_per_node not established in source; refusing to infer from names such as x8 or NVL72");
    }
    if (!submitter || submitter === "unknown") reasons.push("missing submitter");
    const review = reasons.length > 0;
    const vendor = vendorOf(submitter, model);
    const family = model ? familyOf(model) : "unknown";
    const accSlug = model ? slugify(model) : null;
    if (review) {
      quarantine.push({
        kind: "system",
        path: src.path,
        reasons,
        source: src,
      });
    } else if (accSlug) {
      const logicalId = `acc:${accSlug}`;
      accelerators.push({
        logicalId,
        contentVersionId: cid([logicalId, src.sha256]),
        slug: accSlug,
        vendor,
        family,
        modelName: model,
        source: src,
        reviewRequired: false,
        reviewReasons: [],
      });
    }
    const sysId = `sys:${submitter}:${slugify(name || src.path)}`;
    const rec: SystemRec = {
      logicalId: sysId,
      contentVersionId: cid([sysId, src.sha256]),
      submitter,
      systemName: name,
      vendor,
      acceleratorsPerNode: count,
      acceleratorSlug: review ? null : accSlug,
      nodes: parseIntish(raw.number_of_nodes) ?? 1,
      source: src,
      reviewRequired: review,
      reviewReasons: reasons,
      status: String(raw.status || "unknown"),
    };
    systems.push(rec);
  }

  const logRoot = join(fixtureRoot, "logs");
  const logs = (await walk(logRoot)).filter((f) => f.endsWith("mlperf_log_summary.txt"));
  const sysBySubmitter = new Map(systems.filter((s) => !s.reviewRequired).map((s) => [s.submitter, s]));

  for (const file of logs) {
    const buf = await readFile(file);
    const src = sourceRef(file, buf);
    const rel = relative(logRoot, file).replaceAll("\\", "/");
    const parts = rel.split("/");
    // closed/<submitter>/results/<system>/<workload>/<scenario>/performance/run_1/mlperf_log_summary.txt
    const submitter = parts[1];
    const workloadRaw = parts[4];
    const scenario = parts[5];
    const workload = normalizeWorkload(workloadRaw);
    if (!WORKLOADS.has(workloadRaw) && !WORKLOADS.has(workload)) continue;
    if (!SCENARIOS.has(scenario)) continue;
    const parsed = parseSummary(buf.toString("utf8"));
    const sys = sysBySubmitter.get(submitter);
    const reasons: string[] = [];
    if (!sys) reasons.push("no reviewed system identity for submitter");
    if (!parsed.valid) reasons.push("MLPerf result is not VALID");
    if (parsed.tokensPerSecond == null) reasons.push("missing Completed tokens per second");
    if (parsed.scenario && parsed.scenario !== scenario) reasons.push("scenario mismatch between path and log");
    if (reasons.length) {
      quarantine.push({ kind: "result", path: src.path, reasons, source: src });
      continue;
    }
    const logicalId = `res:${submitter}:${sys!.logicalId}:${workload}:${scenario}:tokens_per_second`;
    results.push({
      logicalId,
      contentVersionId: cid([logicalId, src.sha256]),
      systemLogicalId: sys!.logicalId,
      acceleratorSlug: sys!.acceleratorSlug,
      submitter,
      vendor: sys!.vendor,
      family: familyOf(sys!.acceleratorSlug || ""),
      workload,
      scenario,
      metricId: "tokens_per_second",
      unit: "tokens/s",
      value: parsed.tokensPerSecond as number,
      accuracyTarget: null,
      valid: true,
      reviewRequired: false,
      reviewReasons: [],
      source: src,
    });
  }

  // Fix family from accelerator records
  const famBySlug = new Map(accelerators.map((a) => [a.slug, a.family]));
  for (const r of results) {
    if (r.acceleratorSlug && famBySlug.has(r.acceleratorSlug)) {
      r.family = famBySlug.get(r.acceleratorSlug)!;
    }
  }

  const sliceKey = (r: ResultRec) =>
    `v6.0|closed|${r.workload}|${r.scenario}|official|${r.metricId}|${r.unit}`;
  const slices = [...new Set(results.map(sliceKey))].sort().map((id) => {
    const rows = results.filter((r) => sliceKey(r) === id);
    const vendors = new Set(rows.map((r) => r.vendor));
    const families = new Set(rows.map((r) => r.family));
    return {
      id,
      release: "v6.0",
      division: "closed",
      workload: rows[0].workload,
      scenario: rows[0].scenario,
      metricView: "official",
      metricId: rows[0].metricId,
      unit: rows[0].unit,
      resultCount: rows.length,
      vendors: [...vendors].sort(),
      families: [...families].sort(),
      comparability:
        `Exact slice: MLPerf Inference v6.0, Closed division, workload ${rows[0].workload}, scenario ${rows[0].scenario}, official submitted-system metric ${rows[0].metricId} in ${rows[0].unit}. Incompatible dimensions are never mixed.`,
    };
  });

  const coverage = {
    nvidiaAccepted: results.some((r) => r.vendor === "NVIDIA"),
    amdAccepted: results.some((r) => r.vendor === "AMD"),
    intelAccepted: results.some((r) => r.vendor === "Intel"),
    multiAccelerator: systems.some((s) => (s.acceleratorsPerNode ?? 0) > 1 && !s.reviewRequired),
    quarantinePresent: quarantine.length > 0,
  };

  const dataset = {
    datasetVersion: cid([mode, COMMIT, ...results.map((r) => r.contentVersionId)]),
    generatedAt: new Date().toISOString(),
    lastReviewedAt: new Date().toISOString(),
    freshness: "frozen-pinned-commit",
    mode,
    release: "v6.0",
    sourceCommit: COMMIT,
    sourceRepository: REPO,
    metrics: METRICS,
    accelerators,
    systems,
    results,
    slices,
    tombstones,
    quarantine,
    coverage,
    counts: {
      accelerators: accelerators.length,
      systems: systems.length,
      results: results.length,
      slices: slices.length,
      quarantined: quarantine.length,
    },
  };

  const outDir = join(ROOT, "data/generated");
  await mkdir(outDir, { recursive: true });
  const json = `${JSON.stringify(dataset, null, 2)}\n`;
  await writeFile(join(outDir, "dataset.json"), json);
  await writeFile(join(outDir, "changelog.md"), `# Changelog\n\n- ${dataset.generatedAt}: ${mode} snapshot from commit ${COMMIT}. Results ${results.length}, quarantined ${quarantine.length}.\n`);
  await writeFile(
    join(outDir, "coverage-matrix.json"),
    `${JSON.stringify({ coverage, slices, counts: dataset.counts }, null, 2)}\n`,
  );
  await writeFile(join(outDir, "quarantine-report.json"), `${JSON.stringify(quarantine, null, 2)}\n`);
  const hash = sha256(Buffer.from(json));
  await writeFile(join(outDir, `dataset.${mode}.sha256`), `${hash}\n`);
  console.log(JSON.stringify({ mode, hash, counts: dataset.counts, coverage }, null, 2));
}

await main();
