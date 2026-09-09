# Deployment

## Local / tunnel preview (required for review)

```bash
bun run build
bun run start
cloudflared tunnel --url http://127.0.0.1:3000
```

Keep the tunnel up through requester review and seven days afterward.

## Cloudflare Workers (OpenNext)

Intended production target:

```bash
bun add -d @opennextjs/cloudflare wrangler
npx wrangler login   # human
```

Then follow OpenNext Next.js on Workers. Do not commit `.env`, keys, or unredacted deploy logs.
