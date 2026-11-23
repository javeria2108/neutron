import type { Dependency } from '../model/scenario'

type Policy = NonNullable<Dependency['circuitBreaker']>
export type BreakerTransition = 'circuit-open' | 'circuit-half-open' | 'circuit-close'

export class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  private epoch = 0
  private reopenAt = 0
  private probes = 0
  private failures: number[] = []

  constructor(private readonly policy: Policy) {}

  enter(now: number, transition: (event: BreakerTransition) => void): number | null {
    if (this.state === 'open') {
      if (now < this.reopenAt) return null
      this.state = 'half-open'
      transition('circuit-half-open')
    }
    if (this.state === 'half-open') {
      if (this.probes >= this.policy.halfOpenMaxProbes) return null
      this.probes++
    }
    return this.epoch
  }

  finish(epoch: number, now: number, outcome: string): BreakerTransition | undefined {
    // An older in-flight attempt cannot change a newer generation of this circuit.
    if (epoch !== this.epoch) return
    if (this.state === 'half-open' && outcome === 'success') {
      this.state = 'closed'
      this.epoch++
      this.failures = []
      return 'circuit-close'
    }
    if (outcome === 'success') return
    if (this.state === 'closed') {
      this.failures = this.failures.filter(time => time > now - this.policy.windowMs)
      this.failures.push(now)
      if (this.failures.length < this.policy.failureThreshold) return
    }
    this.state = 'open'
    this.epoch++
    this.probes = 0
    this.failures = []
    this.reopenAt = now + this.policy.openDurationMs
    return 'circuit-open'
  }
}
