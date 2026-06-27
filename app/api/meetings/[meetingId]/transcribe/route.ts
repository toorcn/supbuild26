import { NextResponse } from "next/server";
import { getClientContextForMeeting } from "@/lib/neo4j-memory";

export const runtime = "nodejs";

const openAiTranscriptionUrl = "https://api.openai.com/v1/audio/transcriptions";

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

  const formData = await request.formData();
  const audio = formData.get("audio");
  const durationMs = formData.get("durationMs");

  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
  }

  if (audio.size < 512) {
    return NextResponse.json({
      text: "",
      warning: "Audio chunk was too small to transcribe.",
      meetingId
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      text: "",
      warning: "OPENAI_API_KEY is not set, live mic chunks are accepted but not transcribed.",
      meetingId
    });
  }

  const upstream = new FormData();
  upstream.append("file", audio);
  upstream.append("model", process.env.OPENAI_TRANSCRIBE_MODEL ?? "whisper-1");
  upstream.append("response_format", "json");

  const response = await fetch(openAiTranscriptionUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: upstream
  });

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      {
        error: "Transcription failed",
        detail
      },
      { status: response.status }
    );
  }

  const data = (await response.json()) as { text?: string };
  const text = data.text?.trim() ?? "";
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      if (text) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: text })}\n\n`));
      }
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            done: true,
            text,
            model: process.env.OPENAI_TRANSCRIBE_MODEL ?? "whisper-1",
            durationMs: typeof durationMs === "string" ? Number(durationMs) : undefined
          })}\n\n`
        )
      );
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    }
  });
}
