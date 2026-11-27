import type { Scenario } from "../domain/model/scenario";
import { validateRun } from "../domain/simulation/validate-run";
import { servicesNamed } from "./edit-target";

type Outage = Scenario["faults"][number];

export type OutageExperiment = {
  kind: "outage" | "repair";
  targetId: string;
  baseline: Scenario;
  faulted: Scenario;
};

export function isOutagePrompt(instruction: string) {
  return /^(?:take\s+.+\s+down\b|(?:repair|restore)\s+.+)/i.test(instruction.trim());
}

export function previewOutage(scenario: Scenario, instruction: string) {
  const text = instruction.trim().replace(/[.!?]$/, "");
  const repair = /^(?:repair|restore)\s+(.+)$/i.exec(text);
  const outage = /^take\s+(.+?)\s+down\s+for\s+(\d+(?:\.\d+)?)\s*(ms|milliseconds?|s|seconds?)(?:\s+starting at\s+(\d+(?:\.\d+)?)\s*(ms|milliseconds?|s|seconds?))?$/i.exec(text);
  const name = repair?.[1] ?? outage?.[1];
  if (!name) throw new Error("Specify a duration, for example “Take the thumbnail worker down for 10 seconds”.");
  const targets = servicesNamed(scenario, name);
  const [target, ...others] = targets.length ? targets : servicesNamed(scenario, name.replace(/^the\s+/i, ""));
  if (!target) throw new Error("No service matches that name in this canvas view. Check its name or ID.");
  if (others.length) throw new Error("Several services match. Use a unique service ID.");

  const existing = scenario.faults.filter(fault => fault.targetId === target.id);
  const baseline = { ...scenario, faults: scenario.faults.filter(fault => fault.targetId !== target.id) };
  let faulted = scenario;
  if (outage) {
    if (existing.length) throw new Error(`${target.name} already has a scheduled outage. Repair it before scheduling another.`);
    const milliseconds = (value: string, unit: string) => Number(value) * (unit.toLowerCase().startsWith("s") ? 1000 : 1);
    const startMs = outage[4] ? milliseconds(outage[4], outage[5]) : 0;
    const endMs = startMs + milliseconds(outage[2], outage[3]);
    const fault: Outage = { kind: "outage", targetId: target.id, startMs, endMs };
    faulted = { ...scenario, faults: [...scenario.faults, fault] };
  } else if (!existing.length) {
    throw new Error(`${target.name} has no scheduled outage to repair.`);
  }
  validateRun(faulted);
  const experiment: OutageExperiment = { kind: repair ? "repair" : "outage", targetId: target.id, baseline, faulted };
  const schedule = faulted.faults.filter(fault => fault.targetId === target.id)
    .map(fault => `[${fault.startMs}, ${fault.endMs}) ms`).join(", ");
  return { experiment, name: target.name, schedule };
}
