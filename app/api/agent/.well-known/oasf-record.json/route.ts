import type { NextRequest } from "next/server";

import { handlers } from "@/lib/agent";
import { withPublicOrigin } from "@/lib/public-origin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!handlers.oasf) return new Response(null, { status: 404 });
  return withPublicOrigin(await handlers.oasf(request), request);
}
