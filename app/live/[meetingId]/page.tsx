import { notFound } from "next/navigation";
import { User } from "lucide-react";
import { ClientContextPanel } from "@/components/context-panel";
import type { InfoTab } from "@/components/info-tabs";
import { LiveCompanion } from "@/components/live-companion";
import { RelationshipGraph } from "@/components/relationship-graph";
import { AppShell } from "@/components/ui";
import { getClientContextForMeeting } from "@/lib/neo4j-memory";

export const dynamic = "force-dynamic";

export default async function LiveMeetingPage({
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

  const referenceTabs: InfoTab[] = [
    {
      id: "context",
      label: "Context",
      icon: <User className="h-4 w-4" />,
      content: (
        <div className="space-y-3">
          <ClientContextPanel context={context} mode="profile" />
          <RelationshipGraph
            nodes={context.graph.nodes}
            edges={context.graph.edges}
            source={context.memorySource ?? "demo"}
          />
        </div>
      )
    }
  ];

  return (
    <AppShell>
      <LiveCompanion context={context} extraTabs={referenceTabs} />
    </AppShell>
  );
}
