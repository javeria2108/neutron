import { expect, test } from "vitest";
import { checkoutScenario } from "../domain/model/checkout";
import { newDependency, newService } from "../domain/model/scenario";
import { compareOutage } from "./compare-scenario";
import { previewOutage } from "./outage-experiment";

test("compares a named worker outage and repair under the same upload workload", () => {
  const checkout = checkoutScenario();
  const scenario = {
    ...checkout,
    nodes: [checkout.nodes[0], { ...newService("jobs", "Uploads", "Message Queue"), queueCapacity: 128 }, newService("thumb", "Thumbnail worker", "Worker")],
    edges: [newDependency("gateway", "jobs"), newDependency("jobs", "thumb")],
  };
  const outage = previewOutage(scenario, "Take the thumbnail worker down for 10 seconds");
  expect(outage.schedule).toBe("[0, 10000) ms");
  expect(scenario.faults).toEqual([]);
  const faulted = compareOutage(outage.experiment, {});
  const repair = previewOutage(outage.experiment.faulted, "Repair Thumbnail worker");
  const { series } = compareOutage(repair.experiment, faulted.series);
  expect(series.Faulted).toBe(faulted.result);
  expect(series.Repaired?.scenario.workload).toEqual(series.Faulted?.scenario.workload);
  expect(series.Repaired?.metrics).toEqual(series.Baseline?.metrics);
  expect(series.Faulted!.metrics.peakBacklog).toBeGreaterThan(series.Baseline!.metrics.peakBacklog);
  expect(series.Faulted!.metrics.success).toBe(series.Baseline!.metrics.success);
  expect(series.Faulted!.metrics.jobsCompleted).toBeLessThan(series.Baseline!.metrics.jobsCompleted);
  expect(series.Faulted!.metrics.jobsFailed).toBeGreaterThan(0);
  expect(series.Faulted!.trace.find(event => event.kind === "job-finished" && event.outcome === "success")?.timeMs)
    .toBeGreaterThan(10000);
});

test("rejects invalid schedules and repairs without an outage", () => {
  const scenario = checkoutScenario();
  expect(previewOutage(scenario, "Take Orders down for 1.5 seconds starting at 2 seconds").schedule).toBe("[2000, 3500) ms");
  expect(() => previewOutage(scenario, "Take Orders down for 61 seconds")).toThrow("Outage end");
  expect(() => previewOutage(scenario, "Take Unknown down for 1 second")).toThrow("No service");
  expect(() => previewOutage(scenario, "Repair Orders")).toThrow("no scheduled outage");
});
