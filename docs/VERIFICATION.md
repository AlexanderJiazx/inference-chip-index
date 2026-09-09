# Verification report

Date: 2026-09-08T01:47Z (America/New_York evening of 7 Sep 2026)

## Commands and results

```
bun test
```

9 pass / 0 fail (ranking, quarantine, fixture hash, Lucid health handler).

```
bun run dataset:fixture
```

Wrote `data/generated/dataset.json` hash `ceb695901c39b103ae54f8fb16887b2dc464f654699f262830f612480d19461c`.

```
bun run build && bun run start --port 3000
```

Next.js 16.3.4 compiled; Ready on :3000.

```
curl http://127.0.0.1:3000/api/agent/health
```

`{"ok":true,"version":"0.1.0"}`

```
curl -X POST .../get-dataset-status/invoke -d '{"input":{}}'
```

`status=succeeded` counts accelerators 3 / systems 4 / results 10 / slices 4 / quarantined 1.

```
curl -X POST .../rank-inference-chips/invoke
```

HTTP 503 `payment_configuration_error` when x402 env is absent.

Public tunnel (2026-09-09): https://annotation-ear-paint-join.trycloudflare.com — health 200; OASF 200. Earlier hostnames `southeast-signatures-nascar-seriously` and `francis-hamilton-offerings-blend` are dead.
