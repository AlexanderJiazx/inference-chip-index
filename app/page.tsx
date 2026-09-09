import Link from "next/link";

import { dataset } from "@/lib/dataset";

export default function HomePage() {
  const slice = dataset.slices.find((s) => s.workload === "gpt-oss-120b" && s.scenario === "Server") ?? dataset.slices[0];
  return (
    <>
      <h1>Find the fastest verified inference hardware for your workload.</h1>
      <p className="lede">
        Rankings compare one exact benchmark slice: the same MLPerf Inference release, Closed division, workload,
        scenario, accuracy target, metric, and unit. No chip is universally fastest.
      </p>
      <div className="meta">
        <div>Release <strong>v6.0</strong></div>
        <div>Division <strong>Closed</strong></div>
        <div>Commit <strong>{dataset.sourceCommit.slice(0, 12)}</strong></div>
        <div>Freshness <strong>{dataset.freshness}</strong></div>
        <div>Reviewed <strong>{dataset.lastReviewedAt}</strong></div>
        <div>Records <strong>{dataset.counts.results}</strong> results / {dataset.counts.quarantined} quarantined</div>
      </div>
      <p>
        Default comparable slice: <code>{slice.id}</code> ({slice.resultCount} official systems, vendors{" "}
        {slice.vendors.join(", ")}).
      </p>
      <p>
        <Link href={`/leaderboard?sliceId=${encodeURIComponent(slice.id)}`}>Open the leaderboard →</Link>
      </p>
    </>
  );
}
