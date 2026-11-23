import type { Dependency, Scenario, ServiceNode } from '../model/scenario'
import { CircuitBreaker, type BreakerTransition } from './circuit-breaker'
import { EventQueue } from './event-queue'
import { SimulationError, validateRun } from './validate-run'

type Outcome = 'success' | 'failed' | 'timeout' | 'rejected'
type Kind = BreakerTransition | 'outage-hit' | 'fast-fail' | 'arrival' | 'service-start' | 'service-complete' | 'service-finished' | 'queued' | 'queue-drop'
  | 'attempt' | 'timeout' | 'response' | 'retry' | 'late-response' | 'root-finished'
interface TraceEvent {
  callerId?: string
  id: number
  timeMs: number
  requestId: number
  attemptId: string
  nodeId: string
  kind: Kind
  outcome?: Outcome
}
interface Call {
  callerId?: string
  node: ServiceNode
  requestId: number
  attemptId: string
  reply: (outcome: Outcome) => void
}

function failureSample(seed: number, key: string) {
  let hash = (2166136261 ^ seed) >>> 0
  for (let index = 0; index < key.length; index++) {
    hash = Math.imul(hash ^ key.charCodeAt(index), 16777619)
  }
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b)
  return ((hash ^ (hash >>> 13)) >>> 0) / 0x100000000
}

function freezeTree<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeTree(child)
    Object.freeze(value)
  }
  return value
}

export function runSimulation(draft: Scenario) {
  validateRun(draft)
  const scenario = structuredClone(draft)
  const { workload } = scenario
  const queue = new EventQueue<() => void>()
  const services = new Map(scenario.nodes.map(node => [node.id, {
    node, active: 0, waiting: [] as Call[], dependencies: scenario.edges.filter(edge => edge.source === node.id),
  }]))
  const breakers = new Map(scenario.edges.flatMap(edge => edge.circuitBreaker
    ? [[edge.id, new CircuitBreaker(edge.circuitBreaker)] as const] : []))
  const faultTimeline: { timeMs: number; targetId: string; kind: 'outage-start' | 'outage-end' }[] = []
  const trace: TraceEvent[] = []
  const latencies: number[] = []
  const metrics = { attempted: 0, success: 0, failed: 0, timeout: 0, rejected: 0, retries: 0, queueDrops: 0, fastFailures: 0, circuitOpens: 0 }
  let now = 0
  let scheduled = 0

  function schedule(delay: number, priority: number, action: () => void) {
    if (++scheduled > 100000) throw new SimulationError('Event limit reached. Reduce traffic, duration or retries.')
    queue.enqueue(now + delay, priority, action)
  }

  function record(call: Call, kind: Kind, outcome?: Outcome) {
    if (trace.length >= 200000) throw new SimulationError('Trace limit reached. Reduce the workload.')
    trace.push({ id: trace.length + 1, timeMs: now, requestId: call.requestId,
      callerId: call.callerId, attemptId: call.attemptId, nodeId: call.node.id, kind, outcome })
  }

  function admit(call: Call) {
    const service = services.get(call.node.id)!
    if (service.active < call.node.maxConcurrent) return start(call)
    if (service.waiting.length < call.node.queueCapacity) {
      service.waiting.push(call)
      record(call, 'queued')
      return
    }
    metrics.queueDrops++
    record(call, 'queue-drop', 'rejected')
    call.reply('rejected')
  }

  function start(call: Call) {
    const service = services.get(call.node.id)!
    service.active++
    record(call, 'service-start')
    let nextEdge = 0

    function advance(outcome: Outcome) {
      const dependency = service.dependencies[nextEdge++]
      if (outcome === 'success' && dependency) {
        attempt(call, dependency, 0, advance)
        return
      }
      service.active--
      record(call, 'service-finished', outcome)
      const waiting = service.waiting.shift()
      if (waiting) start(waiting)
      call.reply(outcome)
    }

    const outage = scenario.faults.some(fault => fault.targetId === call.node.id && fault.startMs <= now && now < fault.endMs)
    if (outage) record(call, 'outage-hit')
    schedule(call.node.processingLatencyMs, 0, () => {
      const failed = outage || failureSample(workload.seed, call.attemptId) < call.node.baseFailureRate
      record(call, 'service-complete', failed ? 'failed' : 'success')
      advance(failed ? 'failed' : 'success')
    })
  }

  function attempt(parent: Call, edge: Dependency, retry: number, resume: (outcome: Outcome) => void) {
    let pending = true
    const child: Call = {
      callerId: parent.node.id, node: services.get(edge.target)!.node, requestId: parent.requestId,
      attemptId: `${parent.attemptId}/${edge.target}#${retry}`,
      reply(outcome) {
        if (!pending) return record(child, 'late-response', outcome)
        settle('response', outcome)
      },
    }
    const breaker = breakers.get(edge.id)
    const epoch = breaker?.enter(now, event => record(child, event))
    if (epoch === null) {
      metrics.fastFailures++
      record(child, 'fast-fail', 'rejected')
      resume('rejected')
      return
    }
    function settle(kind: 'timeout' | 'response', outcome: Outcome) {
      pending = false
      record(child, kind, outcome)
      if (breaker && typeof epoch === 'number') {
        const transition = breaker.finish(epoch, now, outcome)
        if (transition) record(child, transition)
        if (transition === 'circuit-open') metrics.circuitOpens++
      }
      if (outcome !== 'success' && retry < edge.maxRetries) {
        schedule(edge.retryBackoffMs, 2, () => {
          metrics.retries++
          record(child, 'retry')
          attempt(parent, edge, retry + 1, resume)
        })
      } else {
        resume(outcome)
      }
    }
    record(child, 'attempt')
    schedule(edge.timeoutMs, 1, () => { if (pending) settle('timeout', 'timeout') })
    admit(child)
  }

  const count = Math.ceil(workload.durationMs * workload.arrivalRatePerSecond / 1000)
  function arrive(index: number) {
    const arrivalMs = now
    const root: Call = {
      node: services.get(workload.rootId)!.node, requestId: index + 1, attemptId: String(index + 1),
      reply(outcome) {
        metrics[outcome]++
        if (outcome === 'success') latencies.push(now - arrivalMs)
        record(root, 'root-finished', outcome)
      },
    }
    metrics.attempted++
    record(root, 'arrival')
    admit(root)
    if (index + 1 < count) {
      const next = Math.floor((index + 1) * 1000 / workload.arrivalRatePerSecond)
      schedule(next - now, 3, () => arrive(index + 1))
    }
  }
  for (const fault of scenario.faults) {
    schedule(fault.startMs, -1, () => faultTimeline.push({ timeMs: now, targetId: fault.targetId, kind: 'outage-start' }))
    schedule(fault.endMs, -1, () => faultTimeline.push({ timeMs: now, targetId: fault.targetId, kind: 'outage-end' }))
  }
  if (count) schedule(0, 3, () => arrive(0))
  for (let event = queue.dequeue(); event; event = queue.dequeue()) {
    now = event.timeMs
    event.payload()
  }
  latencies.sort((a, b) => a - b)
  const percentile = (fraction: number) => latencies[Math.ceil(fraction * latencies.length) - 1] ?? null
  return freezeTree({ engineVersion: '1.1', scenario, faultTimeline, trace,
    metrics: { ...metrics, p50Ms: percentile(0.5), p95Ms: percentile(0.95), p99Ms: percentile(0.99) } })
}

export type RunResult = ReturnType<typeof runSimulation>
