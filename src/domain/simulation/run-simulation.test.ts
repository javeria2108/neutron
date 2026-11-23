import { CircuitBreaker } from './circuit-breaker'
import { expect, test } from 'vitest'
import { checkoutScenario } from '../model/checkout'
import { runSimulation } from './run-simulation'

test('replay checkout from an independent snapshot', () => {
  const scenario = checkoutScenario()
  const run = runSimulation(scenario)
  expect(run.metrics).toMatchObject({ attempted: 600, success: 600, p95Ms: 50 })
  expect(runSimulation(scenario)).toEqual(run)
  scenario.nodes[0].processingLatencyMs = 20
  expect(run.scenario.nodes[0].processingLatencyMs).toBe(10)
})

test('deadline ties succeed and late responses cannot finish a root twice', () => {
  const scenario = checkoutScenario()
  scenario.workload.durationMs = 1
  scenario.edges[0].timeoutMs = 40
  expect(runSimulation(scenario).metrics.success).toBe(1)
  scenario.edges[0].timeoutMs = 39
  scenario.edges[0].maxRetries = 1
  const run = runSimulation(scenario)
  expect(run.metrics).toMatchObject({ attempted: 1, timeout: 1, retries: 1, p95Ms: null })
  expect(run.trace.filter(event => event.kind === 'root-finished')).toHaveLength(1)
  expect(run.trace.filter(event => event.kind === 'late-response')).toHaveLength(2)
})

test('a saturated gateway queues one arrival and rejects overflow', () => {
  const scenario = checkoutScenario()
  scenario.workload.durationMs = 3
  scenario.workload.arrivalRatePerSecond = 1000
  scenario.nodes[0].maxConcurrent = 1
  scenario.nodes[0].queueCapacity = 1
  const { metrics } = runSimulation(scenario)
  expect(metrics).toMatchObject({ attempted: 3, success: 2, rejected: 1, queueDrops: 1, p95Ms: 99 })
  scenario.edges = scenario.edges.filter(edge => edge.target !== 'database')
  expect(() => runSimulation(scenario)).toThrow('Connect Database')
})

test('the provider outage degrades checkout and the breaker fast-fails then recovers', () => {
  const scenario = checkoutScenario()
  scenario.faults.push({ kind: 'outage', targetId: 'provider', startMs: 15000, endMs: 35000 })
  const faulted = runSimulation(scenario)
  expect(faulted.metrics).toMatchObject({ attempted: 600, success: 400, failed: 200 })
  expect(faulted.trace.find(e => e.kind === 'outage-hit')?.requestId).toBe(151)
  scenario.edges[1].circuitBreaker = { failureThreshold: 3, windowMs: 5000, openDurationMs: 2000, halfOpenMaxProbes: 1 }
  const repaired = runSimulation(scenario)
  expect(repaired.metrics.fastFailures).toBeGreaterThan(0)
  expect(repaired.trace.some(e => e.kind === 'circuit-close')).toBe(true)
  expect(repaired.trace.filter(e => e.kind === 'root-finished').at(-1)?.outcome).toBe('success')
})

test('start time determines the outage outcome at both boundaries', () => {
  const scenario = checkoutScenario()
  scenario.workload = { ...scenario.workload, durationMs: 3, arrivalRatePerSecond: 1000 }
  scenario.faults = [{ kind: 'outage', targetId: 'gateway', startMs: 1, endMs: 2 }]
  const run = runSimulation(scenario)
  expect(run.trace.filter(e => e.kind === 'outage-hit').map(e => e.requestId)).toEqual([2])
  expect(run.metrics.success).toBe(2)
})

test('only current probes can settle a half-open circuit at the recovery boundary', () => {
  const breaker = new CircuitBreaker({ failureThreshold: 2, windowMs: 10, openDurationMs: 20, halfOpenMaxProbes: 2 })
  const changes: string[] = []
  const enter = (now: number) => breaker.enter(now, event => changes.push(event))
  expect(breaker.finish(enter(0)!, 0, 'failed')).toBeUndefined()
  expect(breaker.finish(enter(10)!, 10, 'timeout')).toBeUndefined()
  expect(breaker.finish(enter(11)!, 11, 'rejected')).toBe('circuit-open')
  expect(enter(30)).toBeNull()
  const probe = enter(31)!
  const concurrentProbe = enter(31)!
  expect(enter(31)).toBeNull()
  expect(changes).toEqual(['circuit-half-open'])
  expect(breaker.finish(probe, 32, 'failed')).toBe('circuit-open')
  expect(breaker.finish(concurrentProbe, 33, 'success')).toBeUndefined()
  expect(enter(51)).toBeNull()
  expect(breaker.finish(enter(52)!, 53, 'success')).toBe('circuit-close')
})
