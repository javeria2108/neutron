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
