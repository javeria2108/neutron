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

test('repairs a rejected thumbnail graph and runs the background workflow', async () => {
  const { requestArchitecture } = await import('./request-architecture')
  const nodes = [
    { id: 'Entry', kind: 'Gateway', name: 'API' },
    { id: 'upload_api', kind: 'Service', name: 'Upload' },
    { id: 'jobs', kind: 'Message Queue', name: 'Thumbnail jobs' },
    { id: 'worker', kind: 'Worker', name: 'Thumbnail processor' },
  ]
  const edges = nodes.slice(1).map((node, index) => ({ source: nodes[index].id, target: node.id }))
  const graph = { nodes, edges, title: 'Image uploads', assumptions: 'One job per upload.', workflows: [{ name: 'Upload', edges }] }
  const attempts: number[] = []
  const result = await requestArchitecture(async correction => ({
    text: JSON.stringify(correction ? graph : { ...graph, assumptions: ['one job'] }),
    source: 'Cloud', elapsedMs: 10,
  }), checkoutScenario().workload, (_, attempt) => attempts.push(attempt), reason => expect(reason).toContain('assumptions'))
  expect(attempts).toEqual([1, 2])
  expect(runSimulation(result.workflows[0].draft).metrics.jobsCompleted).toBe(600)
})
