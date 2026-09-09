# Deployment

## Stable public preview

https://inference-chip-index-phi.vercel.app

Health, leaderboard, methodology, and Lucid discovery are public. Paid rank/compare fail closed unless `PAYMENTS_*` is set on the host.

## Local / tunnel preview

```bash
bun run build
bun run start
cloudflared tunnel --url http://127.0.0.1:3000
```

Current tunnel (rotates on restart): https://annotation-ear-paint-join.trycloudflare.com

Keep a public URL up through requester review and seven days afterward.

## Cloudflare Workers (OpenNext)

Intended alternate production target:

```bash
bun add -d @opennextjs/cloudflare wrangler
npx wrangler login   # human
```

Then follow OpenNext Next.js on Workers. Do not commit `.env`, keys, or unredacted deploy logs.
