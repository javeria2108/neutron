import { expect, test } from "vitest";
import { checkoutScenario } from "../domain/model/checkout";
import { newDependency, newService } from "../domain/model/scenario";
import { compareOutage } from "./compare-scenario";
import { previewOutage } from "./outage-experiment";
import { buildRunEvidence, readRunExplanation } from "./run-evidence";

test("grounds a worker-outage explanation in sampled events and measured metrics", async () => {
  const checkout = checkoutScenario();
  const scenario = {
    ...checkout,
    nodes: [checkout.nodes[0], newService("jobs", "Uploads", "Message Queue"), newService("thumb", "Thumbnail worker", "Worker")],
    edges: [newDependency("gateway", "jobs"), newDependency("jobs", "thumb")],
    workload: { ...checkout.workload, durationMs: 200 },
  };
  const experiment = previewOutage(scenario, "Take the thumbnail worker down for 180 ms").experiment;
  const { series } = compareOutage(experiment, {});
  const evidence = await buildRunEvidence(series);
  expect(await buildRunEvidence(series)).toEqual(evidence);
  expect(evidence[0].scenarioHash).not.toBe(evidence[1].scenarioHash);
  const finished = evidence[1].events.find(event => event.kind === "job-finished")!;
  const claim = {
    text: "Both uploads succeeded while pending thumbnail deliveries accumulated.",
    metricKeys: ["Faulted:success", "Faulted:jobsCompleted", "Faulted:peakBacklog"],
    eventIds: [finished.ref],
  };
  const explanation = readRunExplanation({ claims: [claim] }, evidence);
  expect(explanation[0].metrics.map(metric => metric.value)).toEqual([2, 2, 2]);
  expect(explanation[0].events[0]).toMatchObject({ kind: "job-finished", outcome: "success", nodeId: "jobs" });
  expect(finished.timeMs).toBeGreaterThan(180);

  const unsampled = series.Faulted!.trace.find(event => !evidence[1].events.some(sample => sample.id === event.id))!;
  expect(() => readRunExplanation({ claims: [{ ...claim, eventIds: [`Faulted:${unsampled.id}`] }] }, evidence)).toThrow("outside the evidence sample");
  expect(() => readRunExplanation({ claims: [{ ...claim, metricKeys: ["Faulted:invented"] }] }, evidence)).toThrow("unknown metric");
  expect(() => readRunExplanation({ claims: [{ ...claim, metricKeys: [], eventIds: [] }] }, evidence)).toThrow();
});
