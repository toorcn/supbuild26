import { NextResponse } from "next/server";
import { buildMemoryQueryVisualResponse } from "@/lib/memory-query-response";
import { getResearchDelta } from "@/lib/exa-research";
import { getClientContextWithMemoryLayer } from "@/lib/neo4j-memory";

export async function POST(request: Request) {
  const body = (await request.json()) as { clientId?: string; contactId?: string; query?: string };
  const contactId = body.contactId ?? body.clientId;

  if (!contactId) {
    return NextResponse.json({ error: "Missing contactId" }, { status: 400 });
  }

  const context = await getClientContextWithMemoryLayer(contactId);
  const researchDelta = await getResearchDelta(context.contact);
  return NextResponse.json({
    ...buildMemoryQueryVisualResponse({ ...context, researchDelta }, body.query ?? ""),
    researchDelta
  });
}
