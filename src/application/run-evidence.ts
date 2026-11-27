import { z } from "zod";
import type { RunSeries } from "./compare-scenario";
import type { RunResult } from "../domain/simulation/run-simulation";

const labels = ["Baseline", "Faulted", "Mitigated", "Repaired"] as const;
const eventKinds = new Set([
  "arrival", "outage-hit", "timeout", "queue-drop", "retry", "fast-fail",
  "circuit-open", "circuit-half-open", "circuit-close", "root-finished",
  "job-accepted", "job-finished",
]);

async function evidenceFor(label: string, run: RunResult) {
  const { scenario, trace } = run;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(scenario)));
  const workers = new Set(scenario.nodes.filter(node => node.kind === "Worker").map(node => node.id));
  const byKind = new Map<string, (typeof trace)[number]>();
  for (const event of trace) {
    const workerFinished = event.kind === "service-finished" && workers.has(event.nodeId);
    if (!workerFinished && !eventKinds.has(event.kind)) continue;
    const terminal = workerFinished || event.kind === "job-finished" || event.kind === "root-finished";
    const kind = terminal ? `${event.kind}:${event.outcome}` : event.kind;
    if (!byKind.has(kind)) byKind.set(kind, event);
  }
  const events = [...byKind.values()].sort((a, b) => a.id - b.id).map(event => ({
    ...event, ref: `${label}:${event.id}`,
  }));
  const relevantIds = new Set(events.flatMap(event => [event.nodeId, event.callerId]));
  for (const fault of scenario.faults.slice(0, 8)) relevantIds.add(fault.targetId);
  return {
    label,
    engineVersion: run.engineVersion,
    scenarioHash: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join(""),
    workload: scenario.workload,
    faults: scenario.faults.slice(0, 8),
    components: scenario.nodes.filter(node => relevantIds.has(node.id)).map(node => ({
      ...node, name: node.name.slice(0, 80),
    })),
    dependencies: scenario.edges.filter(edge => relevantIds.has(edge.source) && relevantIds.has(edge.target)).slice(0, 8),
    metrics: Object.entries(run.metrics).map(([key, value]) => ({ ref: `${label}:${key}`, value })),
    events,
  };
}

export async function buildRunEvidence(series: RunSeries) {
  return Promise.all(labels.flatMap(label => {
    const run = series[label];
    return run ? [evidenceFor(label, run)] : [];
  }));
}

export type RunEvidence = Awaited<ReturnType<typeof buildRunEvidence>>;

const claimSchema = z.strictObject({
  text: z.string().trim().min(1).max(500),
  metricKeys: z.array(z.string()).max(8),
  eventIds: z.array(z.string()).max(8),
}).refine(claim => claim.metricKeys.length + claim.eventIds.length > 0);

export function readRunExplanation(value: unknown, evidence: RunEvidence) {
  const { claims } = z.strictObject({ claims: z.array(claimSchema).min(1).max(6) }).parse(value);
  const metrics = new Map(evidence.flatMap(run => run.metrics).map(metric => [metric.ref, metric]));
  const events = new Map(evidence.flatMap(run => run.events).map(event => [event.ref, event]));
  return claims.map(claim => ({
    text: claim.text,
    metrics: [...new Set(claim.metricKeys)].map(ref => {
      const metric = metrics.get(ref);
      if (!metric) throw new Error("The explanation cited an unknown metric.");
      return metric;
    }),
    events: [...new Set(claim.eventIds)].map(ref => {
      const event = events.get(ref);
      if (!event) throw new Error("The explanation cited an event outside the evidence sample.");
      return event;
    }),
  }));
}
