import { ApiPlayground } from "./playground";
import { dataset } from "@/lib/dataset";
import { rankSlice } from "@/lib/rank";

export default function ApiPage() {
  const slice =
    dataset.slices.find((s) => s.workload === "gpt-oss-120b" && s.scenario === "Server")?.id ?? "";
  const invoke = `curl -sS -X POST "$ORIGIN/api/agent/entrypoints/get-dataset-status/invoke" -H 'content-type: application/json' -d '{"input":{}}'`;
  const paid = `curl -sS -D - -X POST "$ORIGIN/api/agent/entrypoints/rank-inference-chips/invoke" -H 'content-type: application/json' -d '{"input":{"sliceId":"${slice}"}}'`;
  const ranked = rankSlice({ sliceId: slice, limit: 3 });
  return (
    <article className="prose">
      <h1>Lucid Agents API</h1>
      <p>
        Routes are mounted at <code>/api/agent</code> and delegate to <code>runtime.http.handlers</code>. Free
        operations boot without payment configuration. Paid operations advertise x402 on Base Sepolia when configured
        and fail closed otherwise — they never silently become free.
      </p>
      <div className="grid-2">
        <div className="notice">
          <strong>Free</strong>
          <div>get-dataset-status · preview-inference-chips</div>
        </div>
        <div className="notice">
          <strong>Paid (x402 · eip155:84532)</strong>
          <div>rank-inference-chips $0.02 · compare-inference-chips $0.03</div>
        </div>
      </div>
      <h2>Discovery</h2>
      <ul>
        <li><code>GET /api/agent/health</code></li>
        <li><code>GET /api/agent/entrypoints</code></li>
        <li><code>POST /api/agent/entrypoints/:key/invoke</code></li>
        <li><code>POST /api/agent/entrypoints/:key/stream</code></li>
        <li><code>GET /api/agent/.well-known/agent-card.json</code></li>
        <li><code>GET /api/agent/.well-known/agent.json</code></li>
        <li><code>GET /api/agent/.well-known/oasf-record.json</code></li>
      </ul>
      <h2>Copyable requests</h2>
      <pre>{invoke}</pre>
      <p>Paid invoke without PAYMENT_* env (fail closed / payment required):</p>
      <pre>{paid}</pre>
      <h2>Required states</h2>
      <div className="notice stale" data-state="stale-data">
        <strong>Stale data</strong>
        <div>
          Dataset freshness is <code>{dataset.freshness}</code> at commit <code>{dataset.sourceCommit}</code>.
        </div>
      </div>
      <div className="notice error" data-state="payment-required">
        <strong>Payment required</strong>
        <div>
          Unpaid <code>rank-inference-chips</code> / <code>compare-inference-chips</code> calls fail closed. This
          preview has no PAYMENT_* config, so they never silently become free.
        </div>
      </div>
      <div className="notice error" data-state="api-error">
        <strong>API error</strong>
        <div>
          Unknown slice IDs, incompatible filters, and gated derived views return structured errors instead of mixed
          rankings. Probe below for a live HTTP example.
        </div>
      </div>
      <div className="notice" data-state="paid-success">
        <strong>Paid success</strong>
        <div>After a verified x402 receipt, rank returns compact JSON under 1 MiB:</div>
        <pre>{JSON.stringify("error" in ranked ? ranked : { sliceId: ranked.sliceId, total: ranked.total, rows: ranked.rows }, null, 2)}</pre>
      </div>
      <ApiPlayground sliceId={slice} />
      <h2>x402 flow</h2>
      <ol>
        <li>Client POSTs a paid entrypoint with no payment header.</li>
        <li>Runtime answers with an x402 challenge when PAYMENT_* is configured, or a fail-closed error when it is not.</li>
        <li>Client retries with a verified Base Sepolia receipt.</li>
        <li>Handler returns ranked or compared JSON. Paid routes never degrade to free.</li>
      </ol>
    </article>
  );
}
