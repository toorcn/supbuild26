import type { GraphEdge, GraphNode } from "@/lib/types";
import { Badge, Panel } from "./ui";

const preferredPositions: Record<string, { x: number; y: number }> = {
  "founder-maya": { x: 18, y: 18 },
  "contact-priya": { x: 48, y: 38 },
  "person-marcus": { x: 74, y: 34 }
};

export function RelationshipGraph({
  nodes,
  edges,
  source = "demo"
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  source?: "neo4j" | "demo";
}) {
  const layoutPositions = buildNodePositions(nodes, edges);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const visibleEdges = edges.filter((edge) => nodeById.has(edge.source) && nodeById.has(edge.target));

  return (
    <Panel title="Network" eyebrow={source === "neo4j" ? "Memory graph" : "Demo relationships"}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={source === "neo4j" ? "signal" : "amber"}>
          {source === "neo4j" ? "Graph memory" : "Demo fallback"}
        </Badge>
        <span className="text-xs font-medium text-muted">
          {nodes.length} nodes / {visibleEdges.length} relationships
        </span>
      </div>

      {nodes.length === 0 ? (
        <div className="rounded-[1.2rem] border border-dashed border-line bg-paper p-5 text-sm leading-6 text-muted">
          No relationship nodes are available for this client yet.
        </div>
      ) : (
        <div className="relative min-h-[280px] overflow-hidden rounded-[1.35rem] border border-line bg-paper sm:min-h-[330px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(255,255,255,0.9),rgba(255,255,255,0)_42%)]" />
          <svg className="absolute inset-0 z-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {visibleEdges.map((edge) => {
              const source = layoutPositions[edge.source];
              const target = layoutPositions[edge.target];
              if (!source || !target) return null;
              return (
                <g key={edge.id}>
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="oklch(72% 0.035 230)"
                    strokeWidth="0.3"
                    strokeOpacity="0.72"
                  />
                </g>
              );
            })}
          </svg>
          {nodes.map((node) => {
            const position = layoutPositions[node.id];
            if (!position) return null;
            return (
              <div
                key={node.id}
                className="absolute z-10 flex w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center sm:w-24"
                style={{ left: `${position.x}%`, top: `${position.y}%` }}
                title={`${node.label} - ${formatNodeType(node.type)}`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border shadow-soft sm:h-7 sm:w-7 ${nodeClassName(node.type)}`}
                  aria-hidden
                />
                <p className="mt-1.5 max-w-full text-balance text-[0.68rem] font-semibold leading-tight text-ink sm:text-[0.72rem]">
                  {node.label}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {visibleEdges.length > 0 ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {visibleEdges.map((edge) => {
            const sourceNode = nodeById.get(edge.source);
            const targetNode = nodeById.get(edge.target);
            if (!sourceNode || !targetNode) return null;

            return (
              <div key={`${edge.id}-row`} className="rounded-[1rem] border border-line bg-paper p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  {edge.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {sourceNode.label} <span className="text-muted">-&gt;</span> {targetNode.label}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}
    </Panel>
  );
}

function buildNodePositions(nodes: GraphNode[], edges: GraphEdge[]) {
  const layout: Record<string, { x: number; y: number }> = {};
  const connectedIds = new Set(edges.flatMap((edge) => [edge.source, edge.target]));
  const orderedNodes = nodes
    .filter((node) => {
      const fixed = preferredPositions[node.id];
      if (!fixed) return true;
      layout[node.id] = fixed;
      return false;
    })
    .sort((left, right) => {
      const connectedDelta = Number(connectedIds.has(right.id)) - Number(connectedIds.has(left.id));
      if (connectedDelta !== 0) return connectedDelta;
      return typeRank(left.type) - typeRank(right.type) || left.label.localeCompare(right.label);
    });

  const contactNodes = orderedNodes.filter((node) => node.type === "Contact");
  const founderNodes = orderedNodes.filter((node) => node.type === "Founder");
  const personNodes = orderedNodes.filter((node) => node.type === "Person");
  const opportunityNodes = orderedNodes.filter((node) => node.type === "Opportunity");
  const partnerNodes = orderedNodes.filter((node) => node.type === "Partner");
  const otherNodes = orderedNodes.filter(
    (node) =>
      !contactNodes.includes(node) &&
      !founderNodes.includes(node) &&
      !personNodes.includes(node) &&
      !opportunityNodes.includes(node) &&
      !partnerNodes.includes(node)
  );

  place(contactNodes, 50, 50, 0, 10, layout);
  place(founderNodes, 18, 22, 0, 13, layout);
  place(personNodes, 22, 73, 0, 13, layout);
  place(opportunityNodes, 75, 24, 0, 12, layout);
  place(partnerNodes, 78, 72, 0, 14, layout);
  place(otherNodes, 50, 84, 14, 9, layout);

  return layout;
}

function place(
  nodes: GraphNode[],
  x: number,
  y: number,
  xStep: number,
  yStep: number,
  layout: Record<string, { x: number; y: number }>
) {
  const start = y - ((nodes.length - 1) * yStep) / 2;
  nodes.forEach((node, index) => {
    layout[node.id] = {
      x: clamp(x + index * xStep, 10, 90),
      y: clamp(start + index * yStep, 12, 88)
    };
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function typeRank(type: GraphNode["type"]) {
  if (type === "Contact") return 0;
  if (type === "Founder") return 1;
  if (type === "Person") return 2;
  if (type === "Opportunity") return 3;
  return 4;
}

function formatNodeType(type: GraphNode["type"]) {
  return type;
}

function nodeClassName(type: GraphNode["type"]) {
  if (type === "Contact") return "border-signal/40 bg-signal";
  if (type === "Founder") return "border-cobalt/30 bg-cobalt";
  if (type === "Opportunity") return "border-amber/40 bg-amber";
  if (type === "Partner") return "border-rose/30 bg-rose";
  return "border-line bg-ink";
}
