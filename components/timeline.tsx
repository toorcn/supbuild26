import type { ClientContext } from "@/lib/types";
import type { CSSProperties } from "react";
import { Badge, Panel } from "./ui";

export function Timeline({ context }: { context: ClientContext }) {
  const topMemory = context.memories.slice().sort((a, b) => b.salience - a.salience)[0];
  const rows = [
    {
      date: formatDate(context.upcomingMeeting.startsAt),
      title: "Upcoming review meeting",
      body: context.upcomingMeeting.objective,
      tone: "signal" as const
    },
    {
      date: formatDate(context.lastMeeting.startsAt),
      title: "Last meeting",
      body: context.lastMeeting.objective,
      tone: "amber" as const
    },
    {
      date: topMemory?.validFrom ? formatDate(topMemory.validFrom) : "Memory",
      title: topMemory?.title ?? "High-salience memory",
      body: topMemory?.summary ?? "No high-salience memory is available from the selected data source.",
      tone: "neutral" as const
    }
  ];

  return (
    <Panel title="Timeline" eyebrow="Recent context">
      <ol className="divide-y divide-line overflow-hidden rounded-[1.2rem] border border-line bg-paper/80">
        {rows.map((row, index) => (
          <li
            key={`${row.date}-${row.title}`}
            className="stagger-item grid gap-3 p-3 sm:grid-cols-[7.5rem_1fr] sm:p-4"
            style={{ "--index": index } as CSSProperties & Record<"--index", number>}
          >
            <Badge tone={row.tone}>{row.date}</Badge>
            <div>
              <p className="text-sm font-semibold text-ink">{row.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted">{row.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function formatDate(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeZone: "Asia/Singapore"
  }).format(new Date(timestamp));
}
