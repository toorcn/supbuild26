import type { SilentSuggestion } from "@/lib/types";
import { Badge, EmptyState, Panel } from "./ui";

export function SuggestionFeed({ suggestions }: { suggestions: SilentSuggestion[] }) {
  return (
    <Panel title="Silent Suggestions" eyebrow="Founder-only">
      {suggestions.length === 0 ? (
        <EmptyState>Suggestions appear here when live conversation touches known memory.</EmptyState>
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-[1.2rem] border border-line bg-paper">
          {suggestions.map((suggestion) => (
            <article key={suggestion.id} className="p-3 sm:p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  tone={
                    suggestion.priority === "high"
                      ? "rose"
                      : suggestion.priority === "medium"
                        ? "amber"
                        : "neutral"
                  }
                >
                  {suggestion.priority}
                </Badge>
                <span className="text-xs font-medium text-muted">{suggestion.source}</span>
              </div>
              <h3 className="mt-2 text-sm font-semibold text-ink">{suggestion.title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted">{suggestion.reason}</p>
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}
