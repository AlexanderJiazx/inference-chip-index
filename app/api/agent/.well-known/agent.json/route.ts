import type { NextRequest } from "next/server";

import { handlers } from "@/lib/agent";
import { withPublicOrigin } from "@/lib/public-origin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withPublicOrigin(await handlers.manifest(request), request);
}
