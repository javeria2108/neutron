import type { Scenario } from '../domain/model/scenario'
import { runSimulation, type RunResult } from '../domain/simulation/run-simulation'
import type { OutageExperiment } from './outage-experiment'

export type RunSeries = Partial<Record<'Baseline' | 'Faulted' | 'Mitigated' | 'Repaired', RunResult>> & {
  outageTargetId?: string;
}

function matchingRun(previous: RunResult | undefined, scenario: Scenario) {
  return previous && JSON.stringify(previous.scenario) === JSON.stringify(scenario)
    ? previous : runSimulation(scenario)
}

export function compareOutage(experiment: OutageExperiment, previous: RunSeries) {
  const baseline = matchingRun(previous.Baseline, experiment.baseline)
  const faulted = matchingRun(previous.Faulted, experiment.faulted)
  const series: RunSeries = { Baseline: baseline, Faulted: faulted, outageTargetId: experiment.targetId }
  if (experiment.kind === 'outage') return { label: 'Faulted', result: faulted, series }
  const repaired = runSimulation(experiment.baseline)
  return { label: 'Repaired', result: repaired, series: { ...series, Repaired: repaired } }
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
