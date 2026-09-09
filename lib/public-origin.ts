const LOCAL_ORIGIN = /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/g;

export function publicOriginFromRequest(request: Request): string {
  const fromEnv = process.env.AGENT_PUBLIC_ORIGIN?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const xfHost = request.headers.get("x-forwarded-host");
  const xfProto = request.headers.get("x-forwarded-proto") || "https";
  if (xfHost) return `${xfProto}://${xfHost.split(",")[0]!.trim()}`;
  try {
    return new URL(request.url).origin;
  } catch {
    return "";
  }
}

export function rewriteLocalOrigins(text: string, origin: string): string {
  if (!origin) return text;
  LOCAL_ORIGIN.lastIndex = 0;
  return text.replace(LOCAL_ORIGIN, origin);
}

export function rewriteDiscoveryJson(text: string, origin: string): string {
  if (!origin) return text;
  let next = rewriteLocalOrigins(text, origin);
  try {
    const body = JSON.parse(next) as Record<string, unknown>;
    if (body && typeof body === "object" && Array.isArray(body.locators) && body.locators.length === 0) {
      body.locators = [`${origin}/.well-known/oasf-record.json`];
      next = JSON.stringify(body);
    }
  } catch {
    /* keep string rewrite if the payload is not JSON */
  }
  return next;
}

export async function withPublicOrigin(res: Response, request: Request): Promise<Response> {
  const origin = publicOriginFromRequest(request);
  const ct = res.headers.get("content-type") || "";
  if (!origin || !ct.includes("json")) return res;
  const text = await res.text();
  return new Response(rewriteDiscoveryJson(text, origin), {
    status: res.status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
