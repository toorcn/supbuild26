import { NextResponse } from "next/server";
import { getCalendar } from "@/lib/neo4j-memory";

export async function GET() {
  return NextResponse.json(await getCalendar());
}
