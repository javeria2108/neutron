import { useState } from 'react'
import type { RunResult } from '@/domain/simulation/run-simulation'

export default function RunSummary({ run, label, requestId, chooseRequest }: { run: RunResult; label: string; requestId: number; chooseRequest: (id: number) => void }) {
  const [page, setPage] = useState(0)
  const { metrics, scenario } = run
  const labels = new Map(scenario.nodes.map(node => [node.id, node.name]))
  const events = run.trace.filter(event => event.requestId === requestId)
  return <div id="baseline-results" className="run-summary" aria-label={label + ' run results'}>
    <h2>{label} results</h2>
    <p>Engine {run.engineVersion} · seed {scenario.workload.seed} · {scenario.workload.arrivalRatePerSecond} req/s
      {' '}for {scenario.workload.durationMs / 1000} s · {scenario.faults.length ? 'scheduled faults' : 'no scheduled faults'}</p>
    {run.faultTimeline.length > 0 && <ol aria-label="Outage timeline">{run.faultTimeline.map((event, index) =>
      <li key={index}>{event.timeMs} ms: {labels.get(event.targetId)} outage {event.kind === 'outage-start' ? 'started' : 'ended'}</li>)}</ol>}
    <dl>{Object.entries({
      Requests: metrics.attempted, Successful: metrics.success, Failed: metrics.failed,
      'Timed out': metrics.timeout, Rejected: metrics.rejected, Retries: metrics.retries,
      ...(metrics.jobsCompleted || metrics.jobsFailed ? { 'Jobs completed': metrics.jobsCompleted, 'Jobs failed': metrics.jobsFailed, 'Peak pending deliveries': metrics.peakBacklog } : {}),
      'Queue drops': metrics.queueDrops,
      'Success rate': metrics.attempted ? (100 * metrics.success / metrics.attempted).toFixed(1) + '%' : 'n/a',
    }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <p>Successful request latency ({metrics.success} samples): {[
      ['p50', metrics.p50Ms], ['p95', metrics.p95Ms], ['p99', metrics.p99Ms],
    ].map(([label, value]) => label + ' ' + (value === null ? 'n/a' : value + ' ms')).join(' / ')}</p>
    {metrics.attempted > 0 && <details open><summary>Request trace</summary>
      <label>Request number <input type="number" min={1} max={metrics.attempted} value={requestId}
        onChange={event => {
          chooseRequest(Math.max(1, Math.min(metrics.attempted, Math.trunc(Number(event.target.value)) || 1)))
          setPage(0)
        }} /></label>
      <div className="trace-scroll"><table><thead><tr><th>Time</th><th>Event</th><th>Component</th><th>Attempt</th><th>Outcome</th></tr></thead>
        <tbody>{events.slice(page * 100, (page + 1) * 100).map(event => <tr key={event.id}><td>{event.timeMs} ms</td><td>{event.kind}</td>
          <td>{labels.get(event.nodeId)}</td><td>{event.attemptId}</td><td>{event.outcome ?? '—'}</td></tr>)}</tbody>
      </table></div>
      {events.length > 100 && <nav aria-label="Trace pages">
        <button disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
        <span> Page {page + 1} of {Math.ceil(events.length / 100)} </span>
        <button disabled={(page + 1) * 100 >= events.length} onClick={() => setPage(page + 1)}>Next</button>
      </nav>}</details>}
  </div>
}
