import type { ReactNode } from "react";
import { AlertCircle, CalendarClock, GitFork, ListChecks, Quote, Sparkles } from "lucide-react";
import type { GraphEdge, GraphNode, MemoryQueryVisualResponse } from "@/lib/types";
import { Badge, EmptyState } from "./ui";

type AdaptiveMemoryDisplayProps = {
  response: MemoryQueryVisualResponse | null;
  variant?: "compact" | "hero";
  emptyText?: string;
  title?: string;
};

const knownPositions: Record<string, { x: number; y: number }> = {
  "founder-maya": { x: 16, y: 20 },
  "contact-priya": { x: 48, y: 42 },
  "person-marcus": { x: 76, y: 32 }
};

export function AdaptiveMemoryDisplay({
  response,
  variant = "compact",
  emptyText = "Ask a typed or voice question to render client memory here.",
  title
}: AdaptiveMemoryDisplayProps) {
  const hero = variant === "hero";

  if (!response) {
    return (
      <div className={containerClass(hero)}>
        <p className={eyebrowClass}>L1.5 adaptive answer</p>
        <h3 className={hero ? "mt-1 text-xl font-semibold text-ink" : "mt-1 text-sm font-semibold text-ink"}>
          {title ?? "Ask to show graph, table, cards, or next step"}
        </h3>
        <EmptyState>{emptyText}</EmptyState>
      </div>
    );
  }

  const icon = displayModeIcon(response.displayMode);

  return (
    <div className={containerClass(hero)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={eyebrowClass}>{title ?? (hero ? "Latest answer" : "Adaptive view")}</p>
          <h3 className={`${hero ? "text-2xl" : "text-sm"} mt-1 flex items-center gap-2 font-semibold text-ink`}>
            {icon}
            {displayModeLabel(response.displayMode)}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={response.source === "neo4j" ? "signal" : "neutral"}>
            {response.source === "neo4j" ? "Graph memory" : "Demo memory"}
          </Badge>
          <Badge tone="cobalt">{response.displayMode}</Badge>
        </div>
      </div>

      <div className={`${hero ? "mt-4 rounded-[1.15rem] bg-paper p-4 text-base" : "mt-3 text-sm"} leading-6 text-ink`}>
        {response.answer}
      </div>

      {response.missingInfo ? (
        <div className="mt-3 rounded-lg border border-amber/40 bg-amber/15 p-3">
          <p className="text-sm font-semibold text-ink">{response.missingInfo.title}</p>
          <p className="mt-1 text-sm leading-5 text-muted">{response.missingInfo.reason}</p>
          <p className="mt-2 text-sm leading-5 text-ink">{response.missingInfo.suggestedNextStep}</p>
        </div>
      ) : null}

      {response.researchDelta ? (
        <div className="mt-3 rounded-lg border border-cobalt/30 bg-cobalt/10 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">External research</p>
            <Badge tone={response.researchDelta.source === "exa" ? "signal" : "amber"}>
              {response.researchDelta.source === "exa" ? "Live Exa" : response.researchDelta.source}
            </Badge>
          </div>
          <p className="mt-2 text-sm leading-5 text-ink">{response.researchDelta.summary}</p>
          {response.researchDelta.signals.length ? (
            <div className="mt-3 grid gap-2">
              {response.researchDelta.signals.slice(0, hero ? 3 : 2).map((signal) => (
                <blockquote key={signal.id} className="rounded-lg border border-line bg-panel p-3 text-sm leading-5 text-muted">
                  <span className="font-semibold text-ink">{signal.label}: </span>
                  {signal.snippet}
                  {signal.source ? <span className="mt-2 block text-xs font-semibold text-muted">{signal.source}</span> : null}
                </blockquote>
              ))}
            </div>
          ) : null}
          {response.researchDelta.warning ? (
            <p className="mt-2 text-xs leading-5 text-amber">{response.researchDelta.warning}</p>
          ) : null}
        </div>
      ) : null}

      {response.graph ? <CompactRelationshipGraph graph={response.graph} hero={hero} /> : null}

      {response.cards?.length ? (
        <div className={`mt-3 grid gap-2 ${hero ? "lg:grid-cols-2" : ""}`}>
          {response.cards.slice(0, hero ? 6 : 4).map((card) => (
            <div key={card.id} className="rounded-lg border border-line bg-paper p-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">{card.eyebrow}</p>
              <p className="mt-1 text-sm font-semibold text-ink">{card.title}</p>
              <p className="mt-1 text-sm leading-5 text-muted">{card.body}</p>
              {card.meta ? <p className="mt-2 text-xs text-muted">{card.meta}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      {response.rows?.length ? (
        <div className="mt-3 overflow-hidden rounded-lg border border-line">
          {response.rows.slice(0, hero ? 8 : 5).map((row) => (
            <div key={`${row.label}-${row.value}`} className="border-b border-line bg-paper p-3 last:border-b-0">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <p className="text-sm font-semibold text-ink">{row.label}</p>
                <p className="text-xs font-semibold text-muted">{row.value}</p>
              </div>
              {row.detail ? <p className="mt-1 text-sm leading-5 text-muted">{row.detail}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      {response.actions?.length ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Next steps</p>
          {response.actions.slice(0, hero ? 4 : 3).map((action) => (
            <div key={action.id} className="rounded-lg border border-line bg-paper p-3">
              <p className="text-sm font-semibold text-ink">{action.title}</p>
              <p className="mt-1 text-sm leading-5 text-muted">{action.reason}</p>
              {action.dueAt || action.status ? (
                <p className="mt-2 text-xs font-semibold text-muted">
                  {[action.status, action.dueAt].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {response.citations.length ? (
        <div className="mt-3 space-y-2">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            <Quote className="h-3.5 w-3.5" />
            Evidence
          </p>
          {response.citations.slice(0, hero ? 4 : 3).map((citation) => (
            <blockquote key={citation.id} className="rounded-lg border border-line bg-paper p-3 text-sm leading-5 text-muted">
              <span className="font-semibold text-ink">{citation.label}: </span>
              {citation.snippet}
            </blockquote>
          ))}
        </div>
      ) : null}

      {response.warning ? <p className="mt-3 text-xs leading-5 text-amber">{response.warning}</p> : null}
    </div>
  );
}

export function CompactRelationshipGraph({
  graph,
  hero
}: {
  graph: { nodes: GraphNode[]; edges: GraphEdge[] };
  hero: boolean;
}) {
  const positions = buildPositions(graph.nodes);
  const visibleEdges = graph.edges.filter((edge) => positions[edge.source] && positions[edge.target]);

  return (
    <div className="mt-3 rounded-lg border border-line bg-paper p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Relationship map</p>
          <p className="mt-1 text-sm leading-5 text-muted">
            {graph.nodes.length} nodes · {graph.edges.length} relationships
          </p>
        </div>
        <Badge tone="cobalt">graph</Badge>
      </div>

      <div className={`${hero ? "min-h-[440px]" : "min-h-[360px]"} relative mt-3 overflow-hidden rounded-[1rem] border border-line bg-panel`}>
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {visibleEdges.map((edge) => {
            const source = positions[edge.source];
            const target = positions[edge.target];
            return (
              <g key={edge.id}>
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke="oklch(64% 0.045 230)"
                  strokeWidth="0.32"
                  strokeOpacity="0.68"
                />
              </g>
            );
          })}
        </svg>

        {graph.nodes.map((node) => {
          const position = positions[node.id] ?? { x: 50, y: 50 };
          return (
            <div
              key={node.id}
              className={`absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center ${
                hero ? "w-28" : "w-24"
              }`}
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
              title={`${node.label} - ${formatNodeType(node.type)}${node.note ? `: ${node.note}` : ""}`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 bg-paper shadow-soft ${
                  hero ? "h-7 w-7" : ""
                } ${nodeTone(node.type)}`}
                aria-hidden
              >
                <span className={`block rounded-full ${hero ? "h-3 w-3" : "h-2.5 w-2.5"} ${nodeDot(node.type)}`} />
              </span>
              <p className="mt-1.5 w-full truncate text-[0.72rem] font-semibold leading-4 text-ink">
                {node.label}
              </p>
              <p className="mt-0.5 line-clamp-2 w-full text-[0.62rem] leading-3 text-muted">
                {node.note || formatNodeType(node.type)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {graph.edges.slice(0, 8).map((edge) => (
          <p key={edge.id} className="rounded-lg border border-line bg-panel px-3 py-2 text-xs leading-5 text-muted">
            <span className="font-semibold text-ink">{nodeLabel(graph.nodes, edge.source)}</span>
            <span> → {edge.label} → </span>
            <span className="font-semibold text-ink">{nodeLabel(graph.nodes, edge.target)}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function buildPositions(nodes: GraphNode[]) {
  const positions: Record<string, { x: number; y: number }> = {};
  const unknown = nodes.filter((node) => !knownPositions[node.id]);

  for (const node of nodes) {
    if (knownPositions[node.id]) positions[node.id] = knownPositions[node.id];
  }

  unknown.forEach((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(unknown.length, 1) - Math.PI / 2;
    const radius = unknown.length > 6 ? 38 : 32;
    positions[node.id] = {
      x: clamp(50 + Math.cos(angle) * radius, 13, 87),
      y: clamp(50 + Math.sin(angle) * radius, 14, 86)
    };
  });

  return positions;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function containerClass(hero: boolean) {
  return hero
    ? "space-y-3 rounded-[1.35rem] border border-signal/30 bg-signal/10 p-4 shadow-soft sm:p-5"
    : "space-y-3 rounded-lg border border-line bg-panel p-3";
}

const eyebrowClass = "text-xs font-semibold uppercase tracking-[0.14em] text-muted";

function displayModeLabel(mode: MemoryQueryVisualResponse["displayMode"]) {
  const labels: Record<MemoryQueryVisualResponse["displayMode"], string> = {
    brief: "Brief answer",
    cards: "Memory cards",
    table: "Action table",
    graph: "Relationship graph",
    timeline: "Timeline",
    recommendation: "Recommendation",
    missing_info: "Missing info"
  };
  return labels[mode];
}

function displayModeIcon(mode: MemoryQueryVisualResponse["displayMode"]): ReactNode {
  if (mode === "recommendation") return <Sparkles className="h-4 w-4 text-signal" />;
  if (mode === "graph") return <GitFork className="h-4 w-4 text-cobalt" />;
  if (mode === "table") return <ListChecks className="h-4 w-4 text-signal" />;
  if (mode === "timeline") return <CalendarClock className="h-4 w-4 text-amber" />;
  if (mode === "missing_info") return <AlertCircle className="h-4 w-4 text-amber" />;
  return <Quote className="h-4 w-4 text-muted" />;
}

function nodeTone(type: GraphNode["type"]) {
  if (type === "Contact") return "border-signal/50";
  if (type === "Founder") return "border-cobalt/45";
  if (type === "Opportunity") return "border-amber/55";
  if (type === "Partner") return "border-rose/45";
  return "border-ink/25";
}

function nodeDot(type: GraphNode["type"]) {
  if (type === "Contact") return "bg-signal";
  if (type === "Founder") return "bg-cobalt";
  if (type === "Opportunity") return "bg-amber";
  if (type === "Partner") return "bg-rose";
  return "bg-ink";
}

function formatNodeType(type: GraphNode["type"]) {
  return type === "Opportunity" ? "Opportunity" : type;
}

function nodeLabel(nodes: GraphNode[], id: string) {
  return nodes.find((node) => node.id === id)?.label ?? id;
}
