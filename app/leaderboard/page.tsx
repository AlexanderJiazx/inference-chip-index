import { compareSlice, rankSlice } from "@/lib/rank";
import {
  SCENARIOS,
  WORKLOADS,
  dataset,
  resolveSliceId,
  uniqueAccuracyTargets,
  uniqueSubmitters,
  uniqueVendors,
} from "@/lib/dataset";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pick = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const defaultSlice = dataset.slices.find((s) => s.workload === "gpt-oss-120b" && s.scenario === "Server");
  const workload = pick("workload") ?? defaultSlice?.workload ?? "gpt-oss-120b";
  const scenario = pick("scenario") ?? defaultSlice?.scenario ?? "Server";
  const accuracyTarget = pick("accuracyTarget") || "as-submitted";
  const submitter = pick("submitter") || undefined;
  const vendor = pick("vendor") || undefined;
  const grouping = (pick("grouping") as "all-systems" | "best-per-accelerator" | undefined) ?? "all-systems";
  const metricView = (pick("metricView") as "official" | "derived" | undefined) ?? "official";
  const resolved = resolveSliceId({ sliceId: pick("sliceId"), workload, scenario });
  const ranked =
    resolved.error && resolved.code === "invalid_filters"
      ? { error: resolved.error, code: resolved.code }
      : resolved.error && resolved.code === "no_comparable"
        ? { error: resolved.error, code: resolved.code }
        : rankSlice({
            sliceId: resolved.sliceId,
            vendor,
            submitter,
            accuracyTarget,
            grouping,
            metricView,
            limit: 50,
          });
  const compare =
    !("error" in ranked) && ranked.rows[0]?.acceleratorSlug
      ? compareSlice({
          sliceId: resolved.sliceId,
          slugs: [ranked.rows[0].acceleratorSlug, "tpu-v5p-unverified"],
        })
      : null;
  const stale = dataset.freshness.startsWith("frozen") || dataset.freshness.includes("stale");

  return (
    <>
      <h1>Closed-division leaderboard</h1>
      <p className="lede">
        Release is fixed to v6.0. Division is fixed to Closed. Workload, scenario, and accuracy target select an exact
        slice. Rankings never mix incompatible dimensions.
      </p>
      <form className="filters" method="get">
        <label>
          Workload
          <select name="workload" defaultValue={workload}>
            {WORKLOADS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </label>
        <label>
          Scenario
          <select name="scenario" defaultValue={scenario}>
            {SCENARIOS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Accuracy target
          <select name="accuracyTarget" defaultValue={accuracyTarget}>
            {uniqueAccuracyTargets().map((a) => (
              <option key={a} value={a}>
                {a === "as-submitted" ? "As submitted (official log)" : a}
              </option>
            ))}
            <option value="99.9-not-in-snapshot">99.9% (not in this snapshot)</option>
          </select>
        </label>
        <label>
          Submitter
          <select name="submitter" defaultValue={submitter ?? ""}>
            <option value="">All submitters</option>
            {uniqueSubmitters().map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Vendor
          <select name="vendor" defaultValue={vendor ?? ""}>
            <option value="">All vendors</option>
            {uniqueVendors().map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Grouping
          <select name="grouping" defaultValue={grouping}>
            <option value="all-systems">All systems</option>
            <option value="best-per-accelerator">Best per accelerator</option>
          </select>
        </label>
        <label>
          Metric view
          <select name="metricView" defaultValue={metricView}>
            <option value="official">Official submitted system</option>
            <option value="derived">Derived per accelerator (gated)</option>
          </select>
        </label>
        <button type="submit">Apply</button>
      </form>
      <div className="meta">
        <div>Dataset {dataset.datasetVersion}</div>
        <div>Commit {dataset.sourceCommit.slice(0, 12)}</div>
        <div>Reviewed {dataset.lastReviewedAt}</div>
        <div>Freshness {dataset.freshness}</div>
        <div>Results {dataset.counts.results}</div>
        <div>Quarantined {dataset.counts.quarantined}</div>
      </div>
      {stale ? (
        <div className="notice stale" data-state="stale-data">
          <strong>Stale data</strong>
          <div>
            Freshness is <code>{dataset.freshness}</code>. Rankings are valid only for pinned commit{" "}
            <code>{dataset.sourceCommit}</code> until a new immutable snapshot is promoted.
          </div>
        </div>
      ) : null}
      <div className="notice error" data-state="invalid-filters">
        <strong>Invalid filters</strong>
        <div>
          Unknown slice IDs and incompatible control combinations are rejected — rankings never mix dimensions.
          Live example:{" "}
          <a href="/leaderboard?sliceId=not-a-slice">unknown slice ID</a>
          {" · "}
          <a href="/leaderboard?workload=gpt-oss-120b&scenario=Interactive">no comparable Interactive slice</a>
          {" · "}
          <a href="/leaderboard?metricView=derived">derived view gated off</a>.
        </div>
      </div>
      {"error" in ranked ? (
        <div className="notice error" data-state={ranked.code === "invalid_filters" || ranked.code === "derived_forbidden" ? "invalid-filters" : "no-comparable"}>
          <strong>{ranked.code === "no_comparable" ? "No comparable results" : "Invalid filters"}</strong>
          <div>{ranked.error}</div>
        </div>
      ) : ranked.rows.length === 0 ? (
        <div className="notice" data-state="no-comparable">
          <strong>No comparable results</strong>
          <div>
            No verified official rows for this exact slice
            {vendor ? ` and vendor ${vendor}` : ""}
            {submitter ? ` and submitter ${submitter}` : ""}
            {accuracyTarget && accuracyTarget !== "as-submitted" ? ` and accuracy ${accuracyTarget}` : ""}.
          </div>
        </div>
      ) : (
        <>
          <p>{ranked.comparability}</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Pos</th>
                  <th>Vendor</th>
                  <th>Family</th>
                  <th>Submitter</th>
                  <th>Official tokens/s</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {ranked.rows.map((r) => (
                  <tr key={r.resultLogicalId}>
                    <td>{r.rank}{r.tied ? "*" : ""}</td>
                    <td>{r.position}</td>
                    <td>{r.vendor}</td>
                    <td>{r.family}</td>
                    <td>{r.submitter}</td>
                    <td>
                      {r.value.toLocaleString()} {r.unit}
                    </td>
                    <td>
                      <a href={r.source.url}>commit path</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ranked.rows.some((r) => r.tied) ? <p className="lede">* Tied official values share a rank; position stays stable.</p> : null}
        </>
      )}
      {compare && "missingEvidence" in compare ? (
        <div className="notice" data-state="partial-evidence">
          <strong>Partial evidence</strong>
          <div>
            Compare against an accelerator with no verified row in this slice. Missing evidence is excluded from
            deltas — never invented.
          </div>
          <pre>{JSON.stringify(compare.missingEvidence, null, 2)}</pre>
        </div>
      ) : null}
    </>
  );
}
