import { NextResponse } from "next/server";
import { searchClientMemory } from "@/lib/neo4j-memory";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    contactId?: string;
    query?: string;
    reason?: string;
    limit?: number;
  };

  if (!body.contactId) {
    return NextResponse.json({ error: "Missing contactId" }, { status: 400 });
  }

  const query = body.query?.trim();
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const result = await searchClientMemory(body.contactId, query, body.reason ?? "", body.limit ?? 5);
  return NextResponse.json(result);
}
