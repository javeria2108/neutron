import type { RunSeries } from '@/application/compare-scenario'
import type { RunResult } from '@/domain/simulation/run-simulation'

const rows: { label: string; value: (r: RunResult) => number | null; unit: string }[] = [
  { label: 'Success rate', value: r => r.metrics.attempted ? 100 * r.metrics.success / r.metrics.attempted : null, unit: '%' },
  { label: 'Successful p95', value: r => r.metrics.p95Ms, unit: ' ms' },
  { label: 'Root timeouts', value: r => r.metrics.timeout, unit: '' },
  { label: 'Root timeout rate', value: r => r.metrics.attempted ? 100 * r.metrics.timeout / r.metrics.attempted : null, unit: '%' },
  { label: 'Retry attempts', value: r => r.metrics.retries, unit: '' },
  { label: 'Breaker fast failures', value: r => r.metrics.fastFailures, unit: '' },
  { label: 'Circuit opens', value: r => r.metrics.circuitOpens, unit: '' },
  { label: 'Jobs completed', value: r => r.metrics.jobsCompleted, unit: '' },
  { label: 'Jobs failed', value: r => r.metrics.jobsFailed, unit: '' },
  { label: 'Peak pending deliveries', value: r => r.metrics.peakBacklog, unit: '' },
  { label: 'Queue drops', value: r => r.metrics.queueDrops, unit: '' },
]

export default function RunComparison({ series }: { series: RunSeries }) {
  const outageTarget = series.outageTargetId
  const thirdLabel = outageTarget ? 'Repaired' : 'Mitigated'
  const runs = [series.Baseline, series.Faulted, series[thirdLabel]]
  const reference = series.Faulted?.scenario
  const repaired = series.Mitigated?.scenario
  const name = (id: string) => reference?.nodes.find(node => node.id === id)?.name ?? id
  return <details className="comparison" open={!!reference}><summary>Run comparison</summary>
    {reference && <p>Matched workload: seed {reference.workload.seed}, {reference.workload.arrivalRatePerSecond} req/s
      for {reference.workload.durationMs / 1000} s.
      {outageTarget
        ? <> Baseline and repaired runs omit the {name(outageTarget)} outage. Other scheduled outages are shared.
          {reference.faults.filter(f => f.targetId === outageTarget).map((f, index) =>
            <span key={index}> Faulted schedule [{f.startMs}, {f.endMs}) ms.</span>)}</>
        : <> Baseline has no outage.
          {reference.faults.map((f, index) => <span key={index}> Faulted and mitigation scenarios use {name(f.targetId)} outage [{f.startMs}, {f.endMs}) ms.</span>)}</>}</p>}
    {repaired?.edges.filter(edge => edge.circuitBreaker).map(edge => {
      const policy = edge.circuitBreaker!
      return <p key={edge.id}>Change: breaker enabled on {name(edge.source)} → {name(edge.target)}.
        Threshold {policy.failureThreshold} in {policy.windowMs} ms, open {policy.openDurationMs} ms,
        up to {policy.halfOpenMaxProbes} recovery probes.</p>
    })}
    <div className="trace-scroll"><table><thead><tr><th>Metric</th><th>Baseline</th><th>Faulted</th><th>{thirdLabel}</th><th>{thirdLabel} − faulted</th></tr></thead>
      <tbody>{rows.map(row => {
        const values = runs.map(run => run ? row.value(run) : null)
        const delta = values[1] !== null && values[2] !== null ? values[2] - values[1] : null
        return <tr key={row.label}><th>{row.label}</th>{values.map((value, index) =>
          <td key={index}>{value === null ? '—' : Number(value.toFixed(2)) + row.unit}</td>)}
          <td>{delta === null ? '—' : (delta > 0 ? '+' : '') + Number(delta.toFixed(2)) + (row.unit === '%' ? ' pp' : row.unit)}</td></tr>
      })}</tbody></table></div>
  </details>
}
