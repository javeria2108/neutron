import type { RunResult } from '@/domain/simulation/run-simulation'

export function describeStep(run: RunResult, event: RunResult['trace'][number]) {
  const name = (id?: string) => run.scenario.nodes.find(node => node.id === id)?.name ?? id
  const service = name(event.nodeId)
  const caller = name(event.callerId)
  const request = `Checkout #${event.requestId}`
  switch (event.kind) {
    case 'outage-hit': return `${service} started this call during its outage. This attempt will fail.`
    case 'fast-fail': return `${caller} rejected the call to ${service} at the circuit breaker.`
    case 'circuit-open': return `The circuit from ${caller} to ${service} opened.`
    case 'circuit-half-open': return `${caller} can probe ${service} for recovery.`
    case 'circuit-close': return `The probe succeeded. The circuit from ${caller} to ${service} closed.`
    case 'job-accepted': return service + ' accepted a background delivery.'
    case 'job-finished': return service + ' background delivery finished: ' + event.outcome
    case 'arrival': return `${request} arrived at ${service}.`
    case 'attempt': return `${caller} called ${service} for ${request.toLowerCase()}.`
    case 'response': return `${service} replied to ${caller} with outcome: ${event.outcome}.`
    case 'queued': return `${request} is waiting for a free slot at ${service}.`
    case 'queue-drop': return `${service} rejected the call because its queue was full.`
    case 'timeout': return `${caller} reached its deadline waiting for ${service}.`
    case 'retry': return `${caller} is retrying its call to ${service}.`
    case 'late-response': return `${service} replied after ${caller}'s deadline. The late reply was ignored.`
    case 'root-finished': return `${request} finished at ${service} with outcome: ${event.outcome}.`
    case 'service-start': return `${service} started work.`
    case 'service-complete': return `${service} completed local processing.`
    case 'service-finished': return `${service} finished its call.`
  }
}


// Index the first traversal once per checkout so rewinding only changes the step comparison.
export function indexTrail(steps: RunResult['trace']) {
  const nodes = new Map<string, number>()
  const edges = new Map<string, number>()
  steps.forEach((event, index) => {
    if (!nodes.has(event.nodeId)) nodes.set(event.nodeId, index)
    if (event.kind === 'attempt' && event.callerId) {
      const key = JSON.stringify([event.callerId, event.nodeId])
      if (!edges.has(key)) edges.set(key, index)
    }
  })
  return { nodes, edges }
}
