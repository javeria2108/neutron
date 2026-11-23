import { connectionError, serviceKinds, simulationLimits, type Dependency, type Scenario } from '../model/scenario'

export class SimulationError extends Error {}

function integer(value: number, min: number, max: number, label: string) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new SimulationError(`${label} must be an integer between ${min} and ${max}.`)
  }
}

export function validateRun(scenario: Scenario) {
  const { nodes, edges, workload } = scenario
  integer(nodes.length, 1, 20, 'Component count')
  if (scenario.schemaVersion !== 1) throw new SimulationError('Unsupported scenario version.')
  if (scenario.faults.length || edges.some(edge => edge.circuitBreaker)) {
    throw new SimulationError('Baseline runs require an empty fault schedule and disabled circuit breakers.')
  }
  if (nodes.filter(node => node.kind === 'Gateway').length !== 1 ||
      !nodes.some(node => node.kind === 'Gateway' && node.id === workload.rootId)) {
    throw new SimulationError('Select one gateway as the workload root.')
  }
  for (const items of [nodes, edges]) {
    if (new Set(items.map(item => item.id)).size !== items.length || items.some(item => !item.id)) {
      throw new SimulationError('Every component and dependency needs a unique ID within its collection.')
    }
  }
  for (const node of nodes) {
    if (!node.name.trim() || !serviceKinds.includes(node.kind)) throw new SimulationError('Invalid component name or type.')
    integer(node.processingLatencyMs, ...simulationLimits.processingLatencyMs, node.name + ' latency')
    integer(node.maxConcurrent, ...simulationLimits.maxConcurrent, node.name + ' concurrency')
    integer(node.queueCapacity, ...simulationLimits.queueCapacity, node.name + ' queue capacity')
    if (!Number.isFinite(node.baseFailureRate) || node.baseFailureRate < 0 || node.baseFailureRate > 1) {
      throw new SimulationError(node.name + ' failure probability must be between 0 and 1.')
    }
  }
  const validated: Dependency[] = []
  for (const edge of edges) {
    const error = connectionError(nodes, validated, edge.source, edge.target)
    if (error) throw new SimulationError(error)
    integer(edge.timeoutMs, ...simulationLimits.timeoutMs, 'Dependency timeout')
    integer(edge.maxRetries, ...simulationLimits.maxRetries, 'Retry limit')
    integer(edge.retryBackoffMs, ...simulationLimits.retryBackoffMs, 'Retry backoff')
    validated.push(edge)
  }
  const disconnected = nodes.find(node => node.id !== workload.rootId && !edges.some(edge => edge.target === node.id))
  if (disconnected) throw new SimulationError(`Connect ${disconnected.name} to the gateway path before running.`)
  integer(workload.durationMs, 1, 600000, 'Workload duration')
  integer(workload.arrivalRatePerSecond, 0, 1000, 'Arrival rate')
  integer(workload.seed, 0, 0xffffffff, 'Seed')
  integer(Math.ceil(workload.durationMs * workload.arrivalRatePerSecond / 1000), 0, 10000, 'Request count')
}
