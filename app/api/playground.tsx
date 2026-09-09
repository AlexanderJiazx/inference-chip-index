"use client";

import { useState } from "react";

type Probe = { label: string; state: string; status?: number; body: string };

export function ApiPlayground({ sliceId }: { sliceId: string }) {
  const [probes, setProbes] = useState<Probe[]>([]);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const origin = window.location.origin;
    const out: Probe[] = [];
    const post = async (key: string, input: unknown) => {
      const res = await fetch(`${origin}/api/agent/entrypoints/${key}/invoke`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const text = await res.text();
      return { status: res.status, body: text.slice(0, 1200) };
    };
    try {
      const status = await post("get-dataset-status", {});
      out.push({ label: "Free status", state: "paid-success", ...status });
      const previewErr = await post("preview-inference-chips", { sliceId: "not-a-slice" });
      out.push({ label: "API error / invalid filters", state: "api-error", ...previewErr });
      const paid = await post("rank-inference-chips", { sliceId });
      out.push({
        label: "Payment required (rank, no x402)",
        state: "payment-required",
        ...paid,
      });
    } catch (err) {
      out.push({
        label: "API error",
        state: "api-error",
        body: err instanceof Error ? err.message : "request failed",
      });
    }
    setProbes(out);
    setBusy(false);
  }

  return (
    <div className="notice" data-state="api-live">
      <strong>Live invoke against this preview</strong>
      <div>Runs free status, an invalid-slice preview, and unpaid rank (fail closed / payment required).</div>
      <p>
        <button type="button" onClick={run} disabled={busy}>
          {busy ? "Running…" : "Probe payment and error states"}
        </button>
      </p>
      {probes.map((p) => (
        <div key={p.label} className={p.state === "api-error" || p.state === "payment-required" ? "notice error" : "notice"} data-state={p.state}>
          <strong>
            {p.label}
            {p.status != null ? ` · HTTP ${p.status}` : ""}
          </strong>
          <pre>{p.body}</pre>
        </div>
      ))}
    </div>
  );
}
