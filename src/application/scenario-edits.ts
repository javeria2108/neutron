import { z } from "zod";
import { simulationLimits, type Dependency, type Scenario, type ServiceNode } from "../domain/model/scenario";

const integer = (min: number, max: number) =>
  z.coerce.number().int().min(min).max(max);
export const serviceSettings = z.object({
  name: z.string().trim().min(1).max(80),
  processingLatencyMs: integer(...simulationLimits.processingLatencyMs),
  maxConcurrent: integer(...simulationLimits.maxConcurrent),
  queueCapacity: integer(...simulationLimits.queueCapacity),
  baseFailureRate: z.coerce.number().min(0).max(1),
});
export const edgeSettings = z.object({
  timeoutMs: integer(...simulationLimits.timeoutMs),
  maxRetries: integer(...simulationLimits.maxRetries),
  retryBackoffMs: integer(...simulationLimits.retryBackoffMs),
});
export const breakerSettings = z.object({
  failureThreshold: integer(1, 10000),
  windowMs: integer(1, 60000),
  openDurationMs: integer(1, 60000),
  halfOpenMaxProbes: integer(1, 100),
});

const strictInteger = ([min, max]: readonly [number, number]) =>
  z.number().int().min(min).max(max);

const editCommand = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("setNodeLatency"),
    nodeId: z.string(),
    latencyMs: strictInteger(simulationLimits.processingLatencyMs),
  }),
  z.strictObject({
    kind: z.literal("setEdgeTimeout"),
    edgeId: z.string(),
    timeoutMs: strictInteger(simulationLimits.timeoutMs),
  }),
  z.strictObject({
    kind: z.literal("setMaxRetries"),
    edgeId: z.string(),
    maxRetries: strictInteger(simulationLimits.maxRetries),
  }),
  z.strictObject({
    kind: z.literal("enableCircuitBreaker"),
    edgeId: z.string(),
    failureThreshold: strictInteger([1, 10000]),
    windowMs: strictInteger([1, 60000]),
    openDurationMs: strictInteger([1, 60000]),
  }),
  z.strictObject({
    kind: z.literal("disableCircuitBreaker"),
    edgeId: z.string(),
  }),
]);

export function updateService(
  scenario: Scenario,
  service: ServiceNode,
): Scenario {
  const settings = serviceSettings.parse(service);
  return {
    ...scenario,
    nodes: scenario.nodes.map((node) =>
      node.id === service.id ? { ...node, ...settings } : node,
    ),
  };
}

export function updateDependency(
  scenario: Scenario,
  edge: Dependency,
): Scenario {
  const settings = edgeSettings.parse(edge);
  const circuitBreaker = edge.circuitBreaker
    ? breakerSettings.parse(edge.circuitBreaker)
    : undefined;

  return {
    ...scenario,
    edges: scenario.edges.map((item) =>
      item.id === edge.id ? { ...item, ...settings, circuitBreaker } : item,
    ),
  };
}

function describeBreaker(policy: Dependency["circuitBreaker"]) {
  if (!policy) return "Disabled";
  return (
    `Enabled: ${policy.failureThreshold} failures in ${policy.windowMs} ms, ` +
    `open for ${policy.openDurationMs} ms, ${policy.halfOpenMaxProbes} half-open probe(s)`
  );
}

export interface EditPreview {
  field: string;
  before: string;
  after: string;
  draft: Scenario;
}

export function previewEdit(
  scenario: Scenario,
  selectedId: string,
  input: unknown,
): EditPreview {
  const command = editCommand.parse(input);

  if (command.kind === "setNodeLatency") {
    const node = scenario.nodes.find((item) => item.id === selectedId);
    if (!node || command.nodeId !== node.id) {
      throw new Error("The command must target the selected service.");
    }
    return {
      field: `${node.name} processing latency`,
      before: `${node.processingLatencyMs} ms`,
      after: `${command.latencyMs} ms`,
      draft: updateService(scenario, {
        ...node,
        processingLatencyMs: command.latencyMs,
      }),
    };
  }

  const edge = scenario.edges.find((item) => item.id === selectedId);
  if (!edge || command.edgeId !== edge.id) {
    throw new Error("The command must target the selected dependency.");
  }

  switch (command.kind) {
    case "setEdgeTimeout":
      return {
        field: "Dependency timeout",
        before: `${edge.timeoutMs} ms`,
        after: `${command.timeoutMs} ms`,
        draft: updateDependency(scenario, {
          ...edge,
          timeoutMs: command.timeoutMs,
        }),
      };
    case "setMaxRetries":
      return {
        field: "Maximum retries",
        before: String(edge.maxRetries),
        after: String(command.maxRetries),
        draft: updateDependency(scenario, {
          ...edge,
          maxRetries: command.maxRetries,
        }),
      };

    case "enableCircuitBreaker": {
      const circuitBreaker = {
        failureThreshold: command.failureThreshold,
        windowMs: command.windowMs,
        openDurationMs: command.openDurationMs,
        halfOpenMaxProbes: edge.circuitBreaker?.halfOpenMaxProbes ?? 1,
      };
      return {
        field: "Circuit breaker",
        before: describeBreaker(edge.circuitBreaker),
        after: describeBreaker(circuitBreaker),
        draft: updateDependency(scenario, { ...edge, circuitBreaker }),
      };
    }

    case "disableCircuitBreaker":
      return {
        field: "Circuit breaker",
        before: describeBreaker(edge.circuitBreaker),
        after: "Disabled",
        draft: updateDependency(scenario, {
          ...edge,
          circuitBreaker: undefined,
        }),
      };
  }
}
