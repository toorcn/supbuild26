import { NextResponse } from "next/server";
import { recommendClientPartners } from "@/lib/neo4j-memory";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    contactId?: string;
    need?: string;
    reason?: string;
    limit?: number;
  };

  if (!body.contactId) {
    return NextResponse.json({ error: "Missing contactId" }, { status: 400 });
  }

  const need = body.need?.trim();
  if (!need) {
    return NextResponse.json({ error: "Missing need" }, { status: 400 });
  }

  const result = await recommendClientPartners(body.contactId, need, body.reason ?? "", body.limit ?? 1);
  return NextResponse.json(result);
}
