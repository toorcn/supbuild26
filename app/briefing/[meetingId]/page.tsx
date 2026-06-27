import { notFound } from "next/navigation";
import { AppShell } from "@/components/ui";
import { VoiceBriefing } from "@/components/voice-briefing";
import { getResearchDelta } from "@/lib/exa-research";
import { getClientContextForMeeting } from "@/lib/neo4j-memory";

export default async function BriefingPage({
  params
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  let context;
  try {
    context = await getClientContextForMeeting(meetingId);
  } catch {
    notFound();
  }
  const researchDelta = await getResearchDelta(context.contact);
  context = { ...context, researchDelta };

  return (
    <AppShell fitViewport>
      <VoiceBriefing context={context} fillViewport />
    </AppShell>
  );
}
