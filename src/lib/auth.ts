import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "lb_admin";

function secret() {
  return process.env.ADMIN_SECRET || "litbuy-creators-demo-secret";
}

/** Session token (HMAC). Safe to hand to an authenticated admin client. */
export function adminToken(): string {
  return createHmac("sha256", secret()).update("litbuy-admin-session").digest("hex");
}

export function expectedPasscode(): string {
  return process.env.ADMIN_PASSCODE || "litbuy2026";
}

/** Constant-time comparison to avoid timing attacks on the passcode. */
export function passcodeMatches(given: string): boolean {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expectedPasscode()).digest();
  return timingSafeEqual(a, b);
}

/** Accepts either the Bearer session token (header) or the httpOnly cookie. */
export async function isAuthorized(req?: Request): Promise<boolean> {
  const header = req?.headers.get("authorization") ?? "";
  if (header === `Bearer ${adminToken()}`) return true;
  const store = await cookies();
  return store.get(COOKIE)?.value === adminToken();
}

export async function setAdminCookie(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, adminToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAdminCookie(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

/* ---------- Tiny in-memory rate limiter (per IP) ---------- */

const attempts = new Map<string, number[]>();

export function rateLimited(ip: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const list = (attempts.get(ip) ?? []).filter((ts) => now - ts < windowMs);
  if (list.length >= max) {
    attempts.set(ip, list);
    return true;
  }
  list.push(now);
  attempts.set(ip, list);
  return false;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
