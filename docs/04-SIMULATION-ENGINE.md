# Deterministic discrete-event simulation specification

## Goal and boundary
Simulate a *simplified synchronous request/response dependency graph*. Not a full network emulator. Document assumptions prominently. MVP graph is a DAG with one root Gateway, synchronous downstream calls, and no queue/message-broker semantics.

## Simulation time and scheduler
Use integer virtual milliseconds (`timeMs >= 0`). Event queue ordered lexicographically by `(timeMs, priority, sequenceNumber)`; sequenceNumber increments deterministically. No `Date.now()`, `Math.random()`, setTimeout, or network calls in core. Define event priority explicitly; e.g. completion/timeout/fault transition ordering must be stable at equal timestamps. Choose and document tie-breaking before coding.

## PRNG
Seeded 32-bit PRNG (e.g. mulberry32 or xorshift32), tested against golden fixtures. Never use ambient randomness. Derive stochastic decisions deterministically from seed and stable request/attempt IDs if possible so scenario edits do not accidentally resample unrelated arrivals. Prefer precomputed arrival schedule and exogenous fault schedule shared between comparisons.

## Models
`Node`: id, kind, processingLatencyMs, maxConcurrent, queueCapacity, baseFailureRate (0..1). `Edge`: id, source, target, timeoutMs, maxRetries, retryBackoffMs, circuitBreaker? {failureThreshold, windowMs, openDurationMs, halfOpenMaxProbes}. `Workload`: durationMs, arrivalRatePerSecond, rootId, seed. `Fault`: outage {targetId,startMs,endMs}; optionally latency multiplier later. Use bounded integer ranges.

## Request semantics — must settle before implementation
A root request enters Gateway. A service processes a request, then invokes its declared downstream dependencies in deterministic order **sequentially for MVP**; response succeeds only if all required downstream calls succeed. No parallel fan-out, asynchronous queues, or fallback business logic in MVP. Clearly label this simplification. Each downstream attempt can time out; retry uses configured backoff; timeout cancellation and late completions must not double-complete a parent. Service capacity and bounded FIFO waiting queue apply per node. Queue overflow yields immediate rejection. A failed required dependency propagates failure upstream. If a circuit is open, the call fails fast; no retry of an open-circuit rejection unless explicitly specified.

## Events (suggested)
`ARRIVAL`, `SERVICE_START`, `SERVICE_COMPLETE`, `DEPENDENCY_ATTEMPT`, `DEPENDENCY_TIMEOUT`, `DEPENDENCY_RESPONSE`, `RETRY_READY`, `FAULT_START`, `FAULT_END`, `CIRCUIT_OPEN`, `CIRCUIT_HALF_OPEN`, `CIRCUIT_CLOSE`, `ROOT_FINISHED`. Event IDs, request IDs, attempt IDs, parent IDs and virtual time included. Maintain state machine and ignore stale timeout/completion events via attempt status/version token.

## Fault semantics
Outage: requests starting service execution during active outage fail deterministically; define whether already in-flight requests fail or finish (MVP: in-flight requests retain their start-time outcome). External API is modeled as a node; outage events change availability at exact timestamps. State this in UI/docs.

## Circuit breaker semantics
Per-edge state `closed | open | halfOpen`; failures counted in a rolling virtual-time window; threshold opens circuit; open period rejects calls; half-open permits bounded probes; successful probe closes, failed probe reopens. Specify whether timeouts and immediate failures count (yes), and whether queue rejection counts (yes for MVP). Reset window on close. Test exact boundary times.

## Metrics
Root outcomes: attempted, success, failed, timeout, rejected; each root counted once. Latency measured from root arrival to terminal event; p50/p95/p99 nearest-rank on successful roots, with sample size shown. Service metrics: starts, completions, failures, timeouts, queue rejects, max queue depth, busy-time integral / (capacity × run horizon), retry attempts. Distinguish completed root latency from failed root latency. Timeline samples derived from events, not AI.

## Invariants
- Every root request terminates at most once.
- No negative active count or queue size; active ≤ capacity; queue ≤ capacity.
- Every retry respects `maxRetries` and backoff.
- No events processed out of scheduler order.
- Identical canonical input + seed + engineVersion → identical canonical RunResult.
- Every metric can be recomputed from event log or documented state counters.
- Termination bounded: max event count, max graph size, max duration, max retries; return typed limit error rather than freezing UI.

## Comparison methodology
Freeze arrival timestamps, root IDs, fault schedule and seed. Run `faulted` and `mitigated` with the same exogenous conditions. Circuit breaker may reduce resource use but also reject requests; show success rate, timeout rate, p95, retries and fast failures together. Do **not** promise mitigation improves all metrics. For stochastic internal failure outcomes, use stable keyed randomness to reduce resampling bias; document remaining limitations.

## Verification fixtures
1. One node, zero faults, 1 req/s, fixed 10ms latency → 100% success, exact latency.
2. Always-failed dependency, no retries → all affected roots fail.
3. Fixed timeout + 2 retries → exactly 3 attempts; expected backoffs.
4. Capacity 1, queue 0, simultaneous arrivals → deterministic rejection order.
5. Circuit threshold reached → opens, fails fast, half-open probe, closes on success.
6. Same seed twice → exact event/metric match.
7. Same arrivals and fault schedule with/without breaker → comparison deterministic.

## Engine development order
First single-node success; then graph dependency propagation; then capacity/queue; then timeouts; then retries; then outage; then circuit breaker; finally metrics, snapshots, playback. Write tests before each mechanism. Resist adding queue nodes until semantics are modeled and tested.
