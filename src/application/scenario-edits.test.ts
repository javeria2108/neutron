import { describe, expect, it } from "vitest";
import { checkoutScenario } from "../domain/model/checkout";
import { runSimulation } from "../domain/simulation/run-simulation";
import { previewEdit } from "./scenario-edits";

describe("AI edit previews", () => {
  it("previews a latency change and preserves the original scenario", () => {
    const original = checkoutScenario();
    const baseline = runSimulation(original);
    const preview = previewEdit(original, "payments", {
      kind: "setNodeLatency",
      nodeId: "payments",
      latencyMs: 750,
    });

    const latency = (scenario: typeof original) =>
      scenario.nodes.find((node) => node.id === "payments")
        ?.processingLatencyMs;

    expect(preview.before).toBe("10 ms");
    expect(preview.after).toBe("750 ms");
    expect(latency(original)).toBe(10);
    expect(latency(preview.draft)).toBe(750);
    const rerun = runSimulation(preview.draft);
    expect(latency(baseline.scenario)).toBe(10);
    expect(latency(rerun.scenario)).toBe(750);
    expect(rerun.metrics).not.toEqual(baseline.metrics);
  });

  it.each([
    { kind: "setNodeLatency", nodeId: "orders", latencyMs: 750 },
    { kind: "setNodeLatency", nodeId: "payments", latencyMs: -1 },
    {
      kind: "setNodeLatency",
      nodeId: "payments",
      latencyMs: 750,
      successRate: 100,
    },
    { kind: "setSuccessRate", successRate: 100 },
  ])("rejects an invalid unauthorized proposal: %j", (command) => {
    expect(() =>
      previewEdit(checkoutScenario(), "payments", command),
    ).toThrow();
  });

  it("sets retries on exactly one selected dependency", () => {
    const original = checkoutScenario();
    const edge = original.edges.find(
      (item) => item.source === "orders" && item.target === "payments",
    )!;
    const preview = previewEdit(original, edge.id, {
      kind: "setMaxRetries",
      edgeId: edge.id,
      maxRetries: 2,
    });

    expect(
      preview.draft.edges.find((item) => item.id === edge.id)?.maxRetries,
    ).toBe(2);
    expect(original.edges.every((item) => item.maxRetries === 0)).toBe(true);
  });
});
