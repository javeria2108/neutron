import { z } from 'zod'
import { newDependency, newService, serviceKinds, type Scenario } from '../domain/model/scenario'
import { validateTopology } from '../domain/simulation/validate-run'

const id = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,59}$/, "Use a letter followed by letters, digits, underscores or hyphens (60 characters maximum).")
const graphSchema = z.strictObject({
  title: z.string().trim().min(1).max(80),
  assumptions: z.string().max(800),
  nodes: z.array(z.strictObject({ id, name: z.string().trim().min(1).max(80), kind: z.enum(serviceKinds) })).min(1).max(20),
  workflows: z.array(z.strictObject({ name: z.string().trim().min(1).max(80), edges: z.array(z.strictObject({ source: id, target: id })).min(1).max(160) })).max(8).default([]),
  edges: z.array(z.strictObject({ source: id, target: id })).max(160),
})

export function readArchitecture(value: unknown, workload: Scenario['workload']) {
  const graph = graphSchema.parse(value)
  const nodes = graph.nodes.map(node => newService(node.id, node.name, node.kind))
  const draft: Scenario = {
    schemaVersion: 1, nodes, edges: graph.edges.map(edge => newDependency(edge.source, edge.target)),
    workload: { ...workload, rootId: nodes.find(node => node.kind === 'Gateway')?.id ?? '' }, faults: [],
  }
  validateTopology(draft)
  const workflows = graph.workflows.map(flow => {
    const edges = flow.edges.map(ref => {
      const edge = draft.edges.find(item => item.source === ref.source && item.target === ref.target)
      if (!edge) throw new Error('Unknown connection in ' + flow.name)
      return edge
    })
    const ids = new Set(edges.flatMap(edge => [edge.source, edge.target]))
    const subset = { ...draft, nodes: nodes.filter(node => ids.has(node.id)), edges }
    validateTopology(subset)
    return { name: flow.name, draft: subset }
  })
  return { title: graph.title, assumptions: graph.assumptions, draft, workflows }
}
