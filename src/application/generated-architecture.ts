import { z } from 'zod'
import { newDependency, newService, serviceKinds, type Scenario } from '../domain/model/scenario'
import { validateRun } from '../domain/simulation/validate-run'

const id = z.string().regex(/^[a-z][a-z0-9-]{0,59}$/)
const graphSchema = z.strictObject({
  title: z.string().trim().min(1).max(80),
  assumptions: z.string().max(800),
  nodes: z.array(z.strictObject({ id, name: z.string().trim().min(1).max(80), kind: z.enum(serviceKinds) })).min(1).max(20),
  edges: z.array(z.strictObject({ source: id, target: id })).max(160),
})

export function readArchitecture(value: unknown, workload: Scenario['workload']) {
  const graph = graphSchema.parse(value)
  const nodes = graph.nodes.map(node => newService(node.id, node.name, node.kind))
  const draft: Scenario = {
    schemaVersion: 1, nodes, edges: graph.edges.map(edge => newDependency(edge.source, edge.target)),
    workload: { ...workload, rootId: nodes.find(node => node.kind === 'Gateway')?.id ?? '' }, faults: [],
  }
  validateRun(draft)
  return { title: graph.title, assumptions: graph.assumptions, draft }
}
