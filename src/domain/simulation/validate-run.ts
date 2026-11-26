import { componentCatalog } from '../model/component-catalog'
import { connectionError, serviceKinds, simulationLimits, type Dependency, type Scenario } from '../model/scenario'

export class SimulationError extends Error {}

function integer(value: number, min: number, max: number, label: string) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new SimulationError(`${label} must be an integer between ${min} and ${max}.`)
  }
}

export function validateRun(scenario: Scenario) {
  validateTopology(scenario)
  const planned = scenario.nodes.filter(node => componentCatalog.some(entry => entry.kind === node.kind && entry.model === 'planned'))
  if (planned.length) throw new SimulationError('Diagram-only components: ' + planned.map(node => node.name).join(', '))
  for (const node of scenario.nodes.filter(node => node.kind === 'Message Queue' || node.kind === 'Pub/Sub Topic')) {
    const consumers = scenario.edges.filter(edge => edge.source === node.id)
    if (!consumers.length || consumers.some(edge => scenario.nodes.find(item => item.id === edge.target)?.kind !== 'Worker')) {
      throw new SimulationError('Connect ' + node.name + ' to at least one Worker. All outgoing connections must target workers.')
    }
  }
}

export function validateTopology(scenario: Scenario) {
  const { nodes, edges, workload } = scenario
  integer(nodes.length, 1, 20, 'Component count')
  if (scenario.schemaVersion !== 1) throw new SimulationError('Unsupported scenario version.')
  for (const fault of scenario.faults) {
    if (fault.kind !== 'outage' || !nodes.some(node => node.id === fault.targetId)) {
      throw new SimulationError('An outage must target an existing component.')
    }
    integer(fault.startMs, 0, workload.durationMs - 1, 'Outage start')
    integer(fault.endMs, fault.startMs + 1, workload.durationMs, 'Outage end')
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
    const policy = edge.circuitBreaker
    if (policy) {
      integer(policy.failureThreshold, 1, 10000, 'Breaker failure threshold')
      integer(policy.windowMs, 1, 60000, 'Breaker rolling window')
      integer(policy.openDurationMs, 1, 60000, 'Breaker open duration')
      integer(policy.halfOpenMaxProbes, 1, 100, 'Breaker probe limit')
    }
    validated.push(edge)
  }
  const disconnected = nodes.find(node => node.id !== workload.rootId && !edges.some(edge => edge.target === node.id))
  if (disconnected) throw new SimulationError(`Connect ${disconnected.name} to the gateway path before running.`)
  integer(workload.durationMs, 1, 600000, 'Workload duration')
  integer(workload.arrivalRatePerSecond, 0, 1000, 'Arrival rate')
  integer(workload.seed, 0, 0xffffffff, 'Seed')
  integer(Math.ceil(workload.durationMs * workload.arrivalRatePerSecond / 1000), 0, 10000, 'Request count')
}
