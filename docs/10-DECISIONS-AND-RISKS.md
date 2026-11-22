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

## Open decisions (resolve early)
- Exact Firebase AI Logic SDK version, supported local inference modes and device compatibility: verify from current official docs.
- Whether structured JSON output is natively enforced locally or needs prompt+parse+retry: test.
- Event priority tie-breaks at equal virtual timestamp: specify in code/tests.
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
