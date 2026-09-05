import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { applications } from "@/db/schema";
import { clientIp, isAuthorized, rateLimited } from "@/lib/auth";
import { ensureSchema } from "@/lib/db-bootstrap";
import { FREQ_VALUES, LANG_VALUES } from "@/lib/i18n";

const TIKTOK_RE = /^https?:\/\/(www\.|m\.)?tiktok\.com\/@?[A-Za-z0-9_.]+/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function boundedInt(v: unknown, max: number): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > max) return null;
  return Math.round(n);
}

export async function POST(req: Request) {
  if (rateLimited(clientIp(req), 10, 60_000)) {
    return NextResponse.json({ error: "too-many" }, { status: 429 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "db-not-configured" }, { status: 500 });
  }
  try {
    await ensureSchema(db);
  } catch {
    return NextResponse.json({ error: "db-error" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;

  const tiktokUrl = typeof b.tiktokUrl === "string" ? b.tiktokUrl.trim().slice(0, 300) : "";
  const email = typeof b.email === "string" ? b.email.trim().slice(0, 254) : "";
  const discord = typeof b.discord === "string" ? b.discord.trim().slice(0, 64) : "";
  const postingFrequency =
    typeof b.postingFrequency === "string" ? b.postingFrequency.slice(0, 20) : "";
  const priorAgents =
    b.priorAgents === null || b.priorAgents === undefined
      ? null
      : typeof b.priorAgents === "string"
        ? b.priorAgents.trim().slice(0, 500)
        : null;
  const screenshot = typeof b.screenshot === "string" ? b.screenshot : null;

  const languages = Array.isArray(b.languages)
    ? (b.languages as unknown[])
        .filter((l): l is string => typeof l === "string")
        .filter((l) => (LANG_VALUES as readonly string[]).includes(l))
        .slice(0, 8)
    : [];

  const followers = boundedInt(b.followers, 1_000_000_000);
  const invitedUsers =
    b.invitedUsers === null || b.invitedUsers === undefined
      ? null
      : boundedInt(b.invitedUsers, 1_000_000_000);
  const activeUsers =
    b.activeUsers === null || b.activeUsers === undefined
      ? null
      : boundedInt(b.activeUsers, 1_000_000_000);

  if (!TIKTOK_RE.test(tiktokUrl)) {
    return NextResponse.json({ error: "bad-tiktok" }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "bad-email" }, { status: 400 });
  }
  if (discord.length < 2) {
    return NextResponse.json({ error: "bad-discord" }, { status: 400 });
  }
  if (followers === null) {
    return NextResponse.json({ error: "bad-followers" }, { status: 400 });
  }
  if (languages.length === 0) {
    return NextResponse.json({ error: "bad-languages" }, { status: 400 });
  }
  if (!(FREQ_VALUES as readonly string[]).includes(postingFrequency)) {
    return NextResponse.json({ error: "bad-frequency" }, { status: 400 });
  }
  if (invitedUsers === null && b.invitedUsers !== null && b.invitedUsers !== undefined) {
    return NextResponse.json({ error: "bad-invited" }, { status: 400 });
  }
  if (activeUsers === null && b.activeUsers !== null && b.activeUsers !== undefined) {
    return NextResponse.json({ error: "bad-active" }, { status: 400 });
  }
  if (screenshot && screenshot.length > 1_500_000) {
    return NextResponse.json({ error: "screenshot-too-big" }, { status: 400 });
  }

  const [row] = await db
    .insert(applications)
    .values({
      tiktokUrl,
      followers,
      postingFrequency,
      languages: JSON.stringify(languages),
      hasPriorCollab: Boolean(b.hasPriorCollab),
      priorAgents,
      invitedUsers,
      activeUsers,
      discord,
      email,
      screenshot,
      status: "new",
    })
    .returning({ id: applications.id });

  return NextResponse.json({ id: row.id }, { status: 201 });
}

export async function GET(req: Request) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "db-not-configured" }, { status: 500 });
  }
  try {
    await ensureSchema(db);
  } catch {
    return NextResponse.json({ error: "db-error" }, { status: 500 });
  }

  const rows = await db.select().from(applications).orderBy(desc(applications.createdAt));
  return NextResponse.json(rows);
}
