import { NextResponse } from "next/server";

const realtimeClientSecretUrl = "https://api.openai.com/v1/realtime/client_secrets";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime-2";
  const body = await readOptionalJson(request);

  if (!apiKey) {
    return NextResponse.json({
      mode: "demo",
      model,
      client_secret: null,
      message:
        "OPENAI_API_KEY is not set. Realtime voice is disabled, but deterministic briefing context remains available."
    });
  }

  // Transcription mode (L2 live companion): listen, transcribe both speakers,
  // and let gpt-realtime-2 emit founder-only tool calls. Text-only output plus
  // tool-only instructions prevent spoken audio from being produced.
  const transcribeModel = process.env.OPENAI_REALTIME_TRANSCRIPTION_MODEL ?? "gpt-realtime-whisper";
  const audio = body.transcribe
    ? {
        input: {
          noise_reduction: { type: "near_field" },
          transcription: { model: transcribeModel, language: "en" },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 600,
            create_response: true,
            interrupt_response: false
          }
        }
      }
    : {
        output: {
          voice: body.voice ?? "alloy"
        }
      };

  const response = await fetch(realtimeClientSecretUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      expires_after: {
        anchor: "created_at",
        seconds: 600
      },
      session: {
        type: "realtime",
        model,
        instructions: body.instructions ?? buildDefaultInstructions(),
        ...(body.transcribe ? { output_modalities: ["text"], max_output_tokens: 512 } : {}),
        tools: body.tools ?? (body.transcribe ? buildLiveCompanionTools() : undefined),
        tool_choice: body.tool_choice ?? (body.transcribe ? "auto" : undefined),
        audio
      }
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      {
        error: "Failed to create realtime client secret",
        detail
      },
      { status: response.status }
    );
  }

  const clientSecret = await response.json();
  const value = extractClientSecretValue(clientSecret);
  const expiresAt = extractClientSecretExpiry(clientSecret);

  return NextResponse.json({
    ...clientSecret,
    value,
    expires_at: expiresAt,
    client_secret: {
      value,
      expires_at: expiresAt
    }
  });
}

async function readOptionalJson(request: Request) {
  try {
    return (await request.json()) as {
      voice?: string;
      instructions?: string;
      tools?: unknown[];
      tool_choice?: string | Record<string, unknown>;
      transcribe?: boolean;
    };
  } catch {
    return {};
  }
}

function extractClientSecretValue(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.value === "string") return record.value;
  const nested = record.client_secret;
  if (nested && typeof nested === "object" && typeof (nested as Record<string, unknown>).value === "string") {
    return (nested as Record<string, string>).value;
  }
  return null;
}

function extractClientSecretExpiry(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.expires_at === "number") return record.expires_at;
  const nested = record.client_secret;
  if (nested && typeof nested === "object" && typeof (nested as Record<string, unknown>).expires_at === "number") {
    return (nested as Record<string, number>).expires_at;
  }
  return null;
}

function buildDefaultInstructions() {
  return [
    "You are a founder-only pre-meeting assistant for Forebrief, helping a startup founder prepare for an investor meeting.",
    "Answer only from the provided contact memory context.",
    "If the context does not contain the answer, say that the memory graph does not contain it.",
    "Keep responses brief, concrete, and useful for the founder.",
    "Do not address, message, or pitch to the investor or contact directly."
  ].join(" ");
}

function buildLiveCompanionTools() {
  return [
    {
      type: "function",
      name: "search_client_memory",
      description: "Search relationship memory for a small number of contact-specific memories, actions, and relationship graph facts that are relevant to the current conversation.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["query", "reason"],
        properties: {
          query: {
            type: "string",
            description: "Focused search terms for the exact topic, person, goal, concern, action, or referral being discussed."
          },
          reason: {
            type: "string",
            description: "Why this lookup is useful for the founder right now."
          },
          limit: {
            type: "number",
            minimum: 1,
            maximum: 8,
            description: "Maximum number of results to return. Prefer 3 to 5."
          }
        }
      }
    },
    {
      type: "function",
      name: "suggest_follow_up_question",
      description: "Suggest one high-value question the founder could ask right now. Do not use for greetings, identity checks, call routing, generic confirmations, or before at least three substantive conversational turns.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["title", "reason", "source", "priority"],
        properties: {
          title: { type: "string", minLength: 6, maxLength: 180 },
          reason: { type: "string", minLength: 8, maxLength: 260 },
          source: { type: "string", minLength: 4, maxLength: 160 },
          priority: { type: "string", enum: ["high", "medium", "low"] }
        }
      }
    },
    {
      type: "function",
      name: "surface_relevant_partner",
      description: "Surface founder-network partners such as solutions engineers, executive sponsors, go-to-market advisors, investor intros, or candidate referrers only when the live conversation contains a concrete specialist or referral need. Do not use for greetings, generic rapport, or vague context.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["need", "reason", "sourceSnippet"],
        properties: {
          need: {
            type: "string",
            minLength: 6,
            maxLength: 220,
            description: "Focused specialist need from the current conversation, for example solutions engineer for a technical proof, executive sponsor to unblock a deal, or investor intro for the next raise."
          },
          reason: {
            type: "string",
            minLength: 8,
            maxLength: 260,
            description: "Why surfacing a partner would help the founder right now."
          },
          sourceSnippet: {
            type: "string",
            minLength: 4,
            maxLength: 320,
            description: "Short quote or close paraphrase from the live conversation that triggered the partner lookup."
          },
          limit: {
            type: "number",
            minimum: 1,
            maximum: 5,
            description: "Maximum partners to return. Prefer 2 to 3."
          }
        }
      }
    },
    {
      type: "function",
      name: "capture_useful_memory",
      description: "Capture useful contact information worth saving for future meetings. Only call for durable, high-confidence facts: commitments, material concerns, explicit goals, milestones, people, referrals, or concrete follow-ups. Do not capture greetings, generic positive mood, identity checks, or topic recaps.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["category", "summary", "sourceSnippet", "confidence"],
        properties: {
          category: {
            type: "string",
            enum: [
              "Milestone",
              "Signal",
              "Unresolved Concern",
              "Goal/Objective",
              "Promise/Commitment",
              "Relationship Mention",
              "Referral Opportunity",
              "Follow-Up Action"
            ]
          },
          summary: { type: "string", minLength: 8, maxLength: 280 },
          sourceSnippet: { type: "string", minLength: 4, maxLength: 320 },
          confidence: { type: "number", minimum: 0.72, maximum: 1 },
          proposedGraphMutation: { type: "string", maxLength: 500 }
        }
      }
    }
  ];
}
