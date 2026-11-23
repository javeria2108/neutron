export const serviceKinds = ['Gateway', 'Service', 'Database', 'Cache', 'External API'] as const
export type ServiceKind = typeof serviceKinds[number]

export interface ServiceNode {
  id: string
  name: string
  kind: ServiceKind
  processingLatencyMs: number
  maxConcurrent: number
  queueCapacity: number
  baseFailureRate: number
}

export interface Dependency {
  id: string
  source: string
  target: string
  timeoutMs: number
  maxRetries: number
  retryBackoffMs: number
  circuitBreaker?: {
    failureThreshold: number
    windowMs: number
    openDurationMs: number
    halfOpenMaxProbes: number
  }
}

export interface Scenario {
  schemaVersion: 1
  nodes: ServiceNode[]
  edges: Dependency[]
  workload: { durationMs: number; arrivalRatePerSecond: number; rootId: string; seed: number }
  faults: { kind: 'outage'; targetId: string; startMs: number; endMs: number }[]
}

export function newService(id: string, name: string, kind: ServiceKind): ServiceNode {
  return { id, name, kind, processingLatencyMs: 10, maxConcurrent: 8, queueCapacity: 16, baseFailureRate: 0 }
}

export function newDependency(source: string, target: string): Dependency {
  return { id: JSON.stringify([source, target]), source, target, timeoutMs: 500, maxRetries: 0, retryBackoffMs: 50 }
}

export function connectionError(nodes: ServiceNode[], edges: Dependency[], source: string, target: string) {
  if (![source, target].every(id => nodes.some(node => node.id === id))) return 'Select two existing services.'
  if (nodes.find(node => node.id === target)?.kind === 'Gateway') return 'The gateway must be the root.'
  if (edges.some(edge => edge.source === source && edge.target === target)) return 'This dependency already exists.'
  if (edges.filter(edge => edge.source === source).length >= 8) return 'A service supports up to eight dependencies.'
  const pending = [target]
  const visited = new Set<string>()
  while (pending.length) {
    const current = pending.pop()!
    if (current === source) return 'This dependency would create a cycle.'
    if (visited.has(current)) continue
    visited.add(current)
    pending.push(...edges.filter(edge => edge.source === current).map(edge => edge.target))
  }
  return null
}
