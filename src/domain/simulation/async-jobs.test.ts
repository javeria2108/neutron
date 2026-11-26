import { expect, test } from 'vitest'
import { checkoutScenario } from '../model/checkout'
import { newDependency, newService } from '../model/scenario'
import { runSimulation } from './run-simulation'

test('upload succeeds during worker outage and accepted work drains after recovery', () => {
  const draft = checkoutScenario()
  draft.nodes = [draft.nodes[0], newService('jobs','Uploads','Message Queue'), newService('thumb','Thumbnail','Worker')]
  draft.edges = [newDependency('gateway','jobs'), newDependency('jobs','thumb')]
  draft.workload = { ...draft.workload, durationMs: 200, arrivalRatePerSecond: 10 }
  draft.faults = [{ kind: 'outage', targetId: 'thumb', startMs: 0, endMs: 180 }]
  const run = runSimulation(draft)
  expect(run.metrics).toMatchObject({ success: 2, p95Ms: 20, jobsCompleted: 2, peakBacklog: 2 })
  expect(run.trace.find(event => event.kind === 'job-finished')?.timeMs).toBeGreaterThan(180)
  expect(runSimulation(draft)).toEqual(run)
})

test('topic acknowledges the publisher and delivers once to each subscription', () => {
  const draft = checkoutScenario()
  draft.nodes = [draft.nodes[0], newService('topic','Events','Pub/Sub Topic'),
    newService('index','Index','Worker'), newService('notify','Notify','Worker')]
  draft.edges = [newDependency('gateway','topic'), newDependency('topic','index'), newDependency('topic','notify')]
  draft.workload.durationMs = 1
  expect(runSimulation(draft).metrics).toMatchObject({ success: 1, jobsCompleted: 2, peakBacklog: 2 })
})
