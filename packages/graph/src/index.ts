import type { ParsedSession } from "@contextops/core";

export interface WorkflowGraphNode {
  id: string;
  label: string;
  kind: string;
}

export interface WorkflowGraphEdge {
  source: string;
  target: string;
  label?: string;
}

export const sessionToGraph = (session: ParsedSession) => {
  const nodes: WorkflowGraphNode[] = session.replayEvents.map((event) => ({
    id: event.id,
    label: event.label,
    kind: event.kind,
  }));
  const edges: WorkflowGraphEdge[] = nodes.slice(1).map((node, index) => ({
    source: nodes[index].id,
    target: node.id,
    label: "next",
  }));
  return { nodes, edges };
};
