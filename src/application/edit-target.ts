import type { EditTarget } from "../contracts/architecture-edit";
import type { Dependency, Scenario, ServiceNode } from "../domain/model/scenario";

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

const normalize = (text: string) => text.toLowerCase().trim().replace(/\s+/g, " ");
const endpoint = (text: string) => normalize(text.replace(/^["'“‘]|["'”’]$/g, ""));
const names = (node: ServiceNode) => [normalize(node.name), normalize(node.id)];

export function servicesNamed(scenario: Scenario, name: string) {
  return scenario.nodes.filter(node => names(node).includes(endpoint(name)));
}
const namedBreaker = /^(enable|disable) (?:the )?circuit breaker (?:between .+ and .+|from .+ to .+)$/;

export function namedBreakerAction(instruction: string) {
  return namedBreaker.exec(normalize(instruction))?.[1];
}

export function resolveEditTarget(scenario: Scenario, instruction: string, selected?: EditTarget): EditTarget {
  const text = normalize(instruction).replace(/[.!?]+$/, "");
  const between = /\bbetween (.+)$/.exec(text);
  const directed = /\b(?:circuit breaker|dependency|timeout|retries)\b.*\bfrom (?!\d)(.+)$/.exec(text);
  const pair = between ?? directed;
  if (pair) {
    const matches = (name: string) => new Set(servicesNamed(scenario, name).map(node => node.id));
    const separator = between ? " and " : " to ";
    const parts = pair[1].split(separator);
    const pairs = parts.slice(1).map((_, index) => ({
      from: matches(parts.slice(0, index + 1).join(separator)),
      to: matches(parts.slice(index + 1).join(separator)),
    }));
    const edges = scenario.edges.filter(edge => pairs.some(({ from, to }) =>
      (from.has(edge.source) && to.has(edge.target)) ||
      (between && to.has(edge.source) && from.has(edge.target)),
    ));
    if (edges.length === 1) return getEditTarget(scenario, undefined, edges[0])!;
    if (edges.length > 1) throw new Error("Several dependencies match. Use unique node IDs and specify the direction with “from … to …”.");
    throw new Error("No dependency matches those endpoints in this canvas view. Check the service names or IDs.");
  }

  const words = (value: string) => value.match(/[\p{L}\p{N}_-]+/gu)?.join(" ") ?? "";
  const prompt = ` ${words(text)} `;
  const explicitService = /\b(?:latency|timeout|retries)\b.*\bon (.+)$/.exec(text);
  const nodes = scenario.nodes.filter(node => names(node).some(name => {
    if (explicitService) return name === endpoint(explicitService[1]);
    const reference = words(name);
    return reference && prompt.includes(` ${reference} `);
  }));
  if (nodes.length === 1) return getEditTarget(scenario, nodes[0])!;
  if (nodes.length > 1) throw new Error("Several services match. Specify one unique service name or ID, or name both dependency endpoints.");
  if (explicitService) {
    throw new Error("No service matches that name in this canvas view. Check its name or ID.");
  }
  if (selected) return selected;
  throw new Error("Name a service or both dependency endpoints in this canvas view.");
}
