import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { applications } from "@/db/schema";
import { isAuthorized } from "@/lib/auth";
import { ensureSchema } from "@/lib/db-bootstrap";

const STATUSES = ["new", "contacted", "accepted", "rejected"] as const;

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
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

  const { id } = await ctx.params;
  const num = Number(id);
  if (!Number.isInteger(num) || num <= 0) {
    return NextResponse.json({ error: "bad-id" }, { status: 400 });
  }

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }
  const status = body.status as (typeof STATUSES)[number];
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: "bad-status" }, { status: 400 });
  }

  const [row] = await db
    .update(applications)
    .set({ status })
    .where(eq(applications.id, num))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  return NextResponse.json(row);
}
