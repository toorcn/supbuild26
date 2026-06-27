import { NextResponse } from "next/server";
import { extractMeetingSignals } from "@/lib/demo-data";
import { getClientContextForMeeting } from "@/lib/neo4j-memory";
import type { TranscriptEvent } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const { meetingId } = await params;
  try {
    await getClientContextForMeeting(meetingId);
  } catch {
    return NextResponse.json({ error: "Unknown meeting" }, { status: 404 });
  }

  const body = (await request.json()) as { events?: TranscriptEvent[] };
  const signals = extractMeetingSignals(body.events ?? []);

  return NextResponse.json({
    meetingId,
    ...signals
  });
}
