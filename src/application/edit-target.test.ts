import { expect, test } from "vitest";
import { checkoutScenario } from "../domain/model/checkout";
import { newDependency, newService } from "../domain/model/scenario";
import { getEditTarget, resolveEditTarget } from "./edit-target";
import { previewEdit } from "./scenario-edits";

test("resolves a named dependency independently of selection and previews an immutable edit", () => {
  const scenario = checkoutScenario();
  const selected = getEditTarget(scenario, scenario.nodes[0]);
  const target = resolveEditTarget(scenario, "Enable the circuit breaker between database and ORDERS.", selected);
  expect(target).toMatchObject({ type: "dependency", from: "Orders", to: "Database" });
  if (target.type !== "dependency") throw new Error("Expected a dependency");
  const preview = previewEdit(scenario, target.id, { kind: "enableCircuitBreaker", edgeId: target.id, ...target.breaker });
  expect(preview.before).toBe("Disabled");
  expect(preview.draft.edges.find(edge => edge.id === target.id)?.circuitBreaker).toMatchObject(target.breaker);
  expect(scenario.edges.every(edge => !edge.circuitBreaker)).toBe(true);
});

test("asks for clarification on ambiguous or missing names and retains selection for unnamed edits", () => {
  const scenario = checkoutScenario();
  const selected = getEditTarget(scenario, scenario.nodes[0]);
  expect(resolveEditTarget(scenario, "Set processing latency to 750 ms", selected)).toBe(selected);
  expect(resolveEditTarget(scenario, "Set latency to 25 ms on Orders", selected).id).toBe("orders");
  expect(() => resolveEditTarget(scenario, "Set latency to 25 ms on Unknown", selected)).toThrow("No service");
  expect(() => resolveEditTarget(scenario, "Enable the circuit breaker between Gateway and Database", selected)).toThrow("No dependency");

  const ambiguous = {
    ...scenario,
    nodes: [...scenario.nodes, newService("other-orders", "Orders", "Service")],
    edges: [...scenario.edges, newDependency("other-orders", "database")],
  };
  expect(() => resolveEditTarget(ambiguous, "Set latency to 25 ms on Orders", selected)).toThrow("Several services");
  expect(() => resolveEditTarget(ambiguous, "Enable the circuit breaker between Orders and Database", selected)).toThrow("Several dependencies");
  expect(resolveEditTarget(ambiguous, "Enable the circuit breaker from other-orders to Database").id)
    .toBe(newDependency("other-orders", "database").id);
});
