import { NextResponse } from "next/server";
import {
  adminToken,
  clientIp,
  passcodeMatches,
  rateLimited,
  setAdminCookie,
} from "@/lib/auth";

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (rateLimited(ip, 5, 60_000)) {
    return NextResponse.json({ error: "too-many" }, { status: 429 });
  }

  let body: { passcode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }
  const given = typeof body.passcode === "string" ? body.passcode : "";
  if (!given || !passcodeMatches(given)) {
    return NextResponse.json({ error: "bad-passcode" }, { status: 401 });
  }

  await setAdminCookie();
  // Bearer token fallback for environments where cookies are blocked
  // (cross-site iframes, strict browser profiles, etc.)
  return NextResponse.json({ ok: true, token: adminToken() });
}
