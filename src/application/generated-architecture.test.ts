import { expect, test } from 'vitest'
import { checkoutScenario } from '../domain/model/checkout'
import { runSimulation } from '../domain/simulation/run-simulation'
import { readArchitecture } from './generated-architecture'

test('a generated graph runs with its own gateway and rejects an unknown dependency', () => {
  const graph = {
    title: 'Booking', assumptions: 'Synchronous calls',
    nodes: [{ id: 'entry', name: 'Entry', kind: 'Gateway' }, { id: 'seats', name: 'Seats', kind: 'Database' }],
    edges: [{ source: 'entry', target: 'seats' }],
  }
  const workload = checkoutScenario().workload
  const { draft } = readArchitecture(graph, workload)
  expect(draft.workload.rootId).toBe('entry')
  expect(runSimulation(draft).metrics.p95Ms).toBe(20)
  expect(() => readArchitecture({ ...graph, edges: [{ source: 'entry', target: 'missing' }] }, workload)).toThrow()
})
