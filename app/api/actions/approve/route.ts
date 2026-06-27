import { NextResponse } from "next/server";
import { saveApprovedAction } from "@/lib/neo4j-memory";
import type { ActionItem } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as { action?: ActionItem };

  if (!body.action) {
    return NextResponse.json({ error: "Missing action payload" }, { status: 400 });
  }

  const writeResult = await saveApprovedAction(body.action);

  return NextResponse.json({
    status: "approved",
    action: body.action,
    sendMode: "founder_approval_required",
    ...writeResult
  });
}
