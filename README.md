# Inference Chip Index

Exact-slice index of MLPerf Inference **v6.0 Closed** results for `llama3.1-8b`, `gpt-oss-120b`, and `deepseek-r1`.

The product promise is: **find the fastest verified inference hardware for your workload** — never a universal ranking.

## Commands

```bash
bun install
bun run dataset:fixture    # parse checked-in fixtures, write data/generated/*
bun test
bun run type-check
bun run dev                # http://127.0.0.1:3000
bun run build && bun run start
```

Pinned Lucid packages: `@lucid-agents/core@5.0.0`, `@lucid-agents/http@4.0.0`, `@lucid-agents/payments@5.0.0`. OASF discovery uses `@lucid-agents/identity@5.0.0` (no auto-register).

Stable public preview: https://inference-chip-index-phi.vercel.app

Live tunnel (hostname rotates if restarted): https://annotation-ear-paint-join.trycloudflare.com

Deployment notes: `docs/DEPLOYMENT.md`.

Update / rollback: `docs/UPDATE.md`. Payments: `docs/PAYMENTS.md`. Sources: `DATA_SOURCES.md`.
