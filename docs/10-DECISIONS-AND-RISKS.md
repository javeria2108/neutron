# Architecture decisions, assumptions, risks

## ADR-001: Pure TypeScript discrete-event engine
**Decision:** A deterministic event queue in a framework-independent domain module. **Reason:** reproducibility, testability, explainability, portability. **Tradeoff:** not a realistic network emulator.

## ADR-002: Simplified synchronous DAG semantics
**Decision:** MVP supports required sequential downstream calls in a DAG. **Reason:** unambiguous causal propagation in limited time. **Tradeoff:** no real-world concurrency/fanout/queues; clearly disclose.

## ADR-003: AI as validated adapter
**Decision:** AI proposes commands and explains evidence; cannot alter results or execute unapproved changes. **Reason:** deterministic correctness. **Tradeoff:** extra validation UX.

## ADR-004: Local-first persistence
**Decision:** Save locally, optional Firestore later. **Reason:** offline usability, privacy, scope control. **Tradeoff:** no cross-device sync in MVP.

## ADR-005: Narrow hybrid AI use case
**Decision:** Local model handles bounded structured edits; cloud handles evidence explanation. **Reason:** local model capability limits. **Tradeoff:** hybrid feature may be less impressive than full generation; make value observable.

## ADR-006: Final Neutron hackathon scope
Neutron ships a deterministic architecture editor and failure simulator with Firebase hybrid AI. Submission requires verified source labels for Gemini Nano and cloud Gemini, a fresh Nano command offline after model setup, measured latency for both inference paths, and proof that AI cannot mutate completed simulation results. Offline manual editing and simulation are P0. Full natural-language architecture generation is the first stretch feature once the engine and local inference work and the MVP gates are met.

## ADR-007: Scheduler spike ordering
Events are dequeued by ascending virtual time, then ascending numeric priority. Equal time and priority use FIFO insertion order via a queue-assigned sequence number. Use a sorted array for the spike. Event-kind priority assignments remain an open decision for the simulation core. Keep the sorted array until profiling shows queue operations matter at target workloads. Then consider an array-backed binary min-heap with O(log n) enqueue and dequeue. Preserve the comparator, public API, and golden ordering test.

## ADR-008: Firebase feasibility route
Use reCAPTCHA Enterprise for cloud App Check to match the Firebase web app registration. Use separate local-only and cloud-only requests for the same sample command so cloud submission requires a deliberate click and timings are comparable. Display the response metadata as the observed source and validate the returned sample without applying edits. Live inference and offline behavior require manual verification with a configured Firebase project and supported desktop Chrome. The Firebase umbrella SDK currently installs a Firestore/gRPC dependency chain flagged by npm audit. The feasibility route imports only Firebase App, App Check, and AI Logic. Recheck the advisory after SDK updates.

## ADR-009: Hackathon test scope
Use integration coverage for the checkout demo and AI edit boundaries. Reserve isolated unit tests for crucial correctness rules. Prioritize delivering and verifying one working slice at a time.

## ADR-010: Deliver product features directly
Start the editor with the five-node checkout graph and the production scenario fields. Keep canvas coordinates in presentation state. Allow disconnected components while editing and require a reachable graph before running. Editor defaults are scenario inputs. The demo workload still needs calibration against engine output.

## ADR-011: Baseline engine semantics
The arrival window is half-open. Drain accepted work after the final arrival. At equal virtual times process local completions (including their synchronous responses), deadlines, retries, then arrivals. Within each class use queue sequence order. Services hold a concurrency slot while awaiting sequential dependencies. A timeout releases the caller from waiting, while the downstream work continues and a late reply is recorded. Each attempt has one accepted outcome. Key failure sampling by seed and request/attempt path. Root latency percentiles use successful requests only. Version 1.0-baseline handled healthy traffic. Version 1.1 adds the outage and breaker behavior below. Cap scheduled actions at 100,000 and trace records at 200,000 per run.

## ADR-012: Outage and breaker comparisons
Determine outage exposure at service start using the half-open interval [startMs, endMs). Keep the configured processing delay for an affected call. Record outage boundaries in the run timeline and exposure in the request trace. Each protected edge owns a fresh breaker per run. Count accepted attempt failures in (now - windowMs, now]. Once the open period expires, the next attempt admits a recovery probe and records the half-open transition. The first settled probe determines recovery or reopening. A generation number prevents older outstanding attempts from modifying the new state. A blocked attempt immediately rejects on that edge and skips its retries.

Compare matched snapshots by rerunning reference scenarios when the draft changes. Derive the healthy and unprotected outage runs from the same graph, seed and workload as the mitigated scenario. Only the breaker settings differ between the faulted and mitigated columns.

## Open decisions (resolve early)
- Exact Firebase AI Logic SDK version, supported local inference modes and device compatibility: verify from current official docs.
- Whether structured JSON output is natively enforced locally or needs prompt+parse+retry: test.
- Failure semantics for in-flight calls during outage: default start-time outcome; verify fixture.
- Circuit breaker threshold and half-open behavior: freeze before implementation.
- Hosting target and billing requirements: verify early.

## Risk register
| Risk | Impact | Mitigation |
|---|---|---|
| Gemini Nano unavailable on demo hardware | Critical | Day-1 spike; supported device; manual fallback; never fake |
| AI JSON malformed | High | Zod + semantic validation + preview + reject |
| Simulation grows complex/unreliable | Critical | Strict MVP semantics, invariants, golden tests |
| Mitigation does not improve success | Medium | Show honest tradeoffs; tune demo scenario without rigging metrics |
| Too much UI polish too early | High | Vertical slices; baseline demo first |
| Cloud quota/billing issue | Medium | Quotas, explicit limits, fallback, early deployment test |
| Misleading production claims | High | Clearly state modeled assumptions and limitations |
| Deadline slips | Critical | Scope cut order in roadmap; freeze features 48h before submission |
