import { CalendarDays, Database } from "lucide-react";
import { AppShell, Badge, EmptyState, IconPill, Panel, SecondaryButton } from "@/components/ui";

type CalendarSource = "demo" | "neo4j";

export function NoUpcomingMeetings({
  source,
  warning
}: {
  source: CalendarSource;
  warning?: string;
}) {
  return (
    <AppShell>
      <section className="mx-auto grid min-h-[min(38rem,calc(100dvh-8rem))] w-full max-w-3xl place-items-center">
        <Panel
          title="No Upcoming Meetings"
          eyebrow="Calendar"
          action={<Badge tone={source === "neo4j" ? "signal" : "amber"}>{source === "neo4j" ? "Live calendar" : "Demo calendar"}</Badge>}
          className="w-full"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <IconPill
              icon={<CalendarDays className="h-4 w-4" />}
              label="Queue"
              value="No active meetings"
              tone="amber"
            />
            <IconPill
              icon={<Database className="h-4 w-4" />}
              label="Source"
              value={source === "neo4j" ? "Calendar feed" : "Demo"}
              tone={source === "neo4j" ? "signal" : "amber"}
            />
          </div>

          <div className="mt-5">
            <EmptyState>
              {warning ?? "The active calendar source returned no meetings ready for briefing."}
            </EmptyState>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <SecondaryButton href="/api/demo/calendar">View calendar data</SecondaryButton>
          </div>
        </Panel>
      </section>
    </AppShell>
  );
}
