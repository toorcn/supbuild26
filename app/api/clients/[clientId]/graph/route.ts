import { NextResponse } from "next/server";
import { getClientContextWithMemoryLayer } from "@/lib/neo4j-memory";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;

  try {
    const context = await getClientContextWithMemoryLayer(clientId);
    return NextResponse.json(context.graph);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown contact" },
      { status: 404 }
    );
  }
}
