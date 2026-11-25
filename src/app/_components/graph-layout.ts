import type { Scenario } from '@/domain/model/scenario'

// A validated graph is acyclic. Put each service after its deepest caller.
export function graphLayout(scenario: Scenario, vertical: boolean) {
  const levels = new Map<string, number>()
  function level(id: string): number {
    const known = levels.get(id)
    if (known !== undefined) return known
    const callers = scenario.edges.filter(edge => edge.target === id)
    const depth = Math.max(0, ...callers.map(edge => level(edge.source) + 1))
    levels.set(id, depth)
    return depth
  }
  const depths = scenario.nodes.map(node => level(node.id))
  const rows = new Map<number, number>()
  return depths.map(depth => {
    const row = rows.get(depth) ?? 0
    rows.set(depth, row + 1)
    const count = depths.filter(item => item === depth).length
    const lane = row - (count - 1) / 2
    return vertical ? { x: lane * 195, y: depth * 105 } : { x: depth * 240, y: lane * 145 }
  })
}
