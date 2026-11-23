import type { Scenario } from '../domain/model/scenario'
import { runSimulation, type RunResult } from '../domain/simulation/run-simulation'

export type RunSeries = Partial<Record<'Baseline' | 'Faulted' | 'Mitigated', RunResult>>

function matchingRun(previous: RunResult | undefined, scenario: Scenario) {
  return previous && JSON.stringify(previous.scenario) === JSON.stringify(scenario)
    ? previous : runSimulation(scenario)
}

// Generate references from the same draft so later edits cannot invalidate the comparison.
export function compareScenario(scenario: Scenario, previous: RunSeries) {
  if (!scenario.faults.length) {
    const result = matchingRun(previous.Baseline, scenario)
    return { label: 'Baseline', result, series: { Baseline: result } }
  }
  const reference = { ...scenario, edges: scenario.edges.map(edge => ({ ...edge, circuitBreaker: undefined })) }
  const baseline = matchingRun(previous.Baseline, { ...reference, faults: [] })
  const faulted = matchingRun(previous.Faulted, reference)
  const series: RunSeries = { Baseline: baseline, Faulted: faulted }
  if (!scenario.edges.some(edge => edge.circuitBreaker)) return { label: 'Faulted', result: faulted, series }
  const mitigated = matchingRun(previous.Mitigated, scenario)
  return { label: 'Mitigated', result: mitigated, series: { ...series, Mitigated: mitigated } }
}
