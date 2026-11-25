import type { EditTarget } from "@/contracts/architecture-edit";
import type { Dependency, Scenario, ServiceNode } from "@/domain/model/scenario";

export function getEditTarget(scenario: Scenario, service?: ServiceNode, edge?: Dependency): EditTarget | undefined {
  if (service) {
    return {
      type: "service", id: service.id, name: service.name,
      processingLatencyMs: service.processingLatencyMs,
    };
  } else if (edge) {
    return {
      type: "dependency", id: edge.id,
      from: scenario.nodes.find(node => node.id === edge.source)?.name ?? edge.source,
      to: scenario.nodes.find(node => node.id === edge.target)?.name ?? edge.target,
      timeoutMs: edge.timeoutMs, maxRetries: edge.maxRetries,
      breaker: {
        failureThreshold: edge.circuitBreaker?.failureThreshold ?? 3,
        windowMs: edge.circuitBreaker?.windowMs ?? 5000,
        openDurationMs: edge.circuitBreaker?.openDurationMs ?? 2000,
      },
    };
  }
}
