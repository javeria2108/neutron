import { MarkerType, type Node } from "@xyflow/react";
import type { Dependency } from "@/domain/model/scenario";
import type { RunResult } from "@/domain/simulation/run-simulation";
import type { indexTrail } from "./request-replay";

export function renderGraph(
  nodes: Node[],
  dependencies: Dependency[],
  selected: string,
  onGraph: RunResult["trace"][number] | undefined,
  trail: ReturnType<typeof indexTrail>,
  step: number,
) {
  const reply =
    onGraph?.kind === "response" || onGraph?.kind === "late-response";
  const call = onGraph?.kind === "attempt";
  const focusNode =
    reply || onGraph?.kind === "timeout" || onGraph?.kind === "retry"
      ? onGraph.callerId
      : onGraph?.nodeId;
  return {
    nodes: nodes.map((node) => {
      const visited =
        onGraph && (trail.nodes.get(node.id) ?? Infinity) <= step;
      const state =
        node.id === focusNode
          ? " replay-node"
          : visited
            ? " replay-visited"
            : "";
      return {
        ...node,
        className: node.className + state,
        selected: node.id === selected,
      };
    }),
    edges: dependencies.map((item) => {
      const visited =
        onGraph &&
        (trail.edges.get(
          JSON.stringify([item.source, item.target]),
        ) ?? Infinity) <= step;
      const moving =
        (call || reply) &&
        onGraph?.callerId === item.source &&
        onGraph.nodeId === item.target;
      const returning = moving && reply;
      const selectedEdge = [
        item.id,
        item.source,
        item.target,
      ].includes(selected);
      const color = moving
        ? "#dba743"
        : visited
          ? "#3b9b8b"
          : !onGraph && selectedEdge
            ? "#8f80b5"
            : "#a19bad";
      const marker = {
        type: MarkerType.ArrowClosed,
        color,
        orient: "auto-start-reverse",
      };
      return {
        ...item,
        className: moving
          ? "replay-hop"
          : visited
            ? "replay-trail"
            : "",
        label: moving ? (returning ? "Reply" : "Call") : undefined,
        labelStyle: { fill: "#182338", fontWeight: 700 },
        labelBgStyle: { fill: "#dba743" },
        style: {
          stroke: color,
          strokeWidth: moving
            ? 4
            : visited || selectedEdge
              ? 2.6
              : 1.8,
        },
        markerStart: returning ? marker : undefined,
        markerEnd: returning ? undefined : marker,
      };
    }),
  };
}
