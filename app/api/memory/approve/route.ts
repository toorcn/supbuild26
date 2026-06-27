import { NextResponse } from "next/server";
import { saveApprovedMemory } from "@/lib/neo4j-memory";
import type { ExtractedMemory } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as { memory?: ExtractedMemory };

  if (!body.memory) {
    return NextResponse.json({ error: "Missing memory payload" }, { status: 400 });
  }

  const writeResult = await saveApprovedMemory(body.memory);

  return NextResponse.json({
    status: "approved",
    memory: body.memory,
    ...writeResult
  });
}
