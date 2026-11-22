# Neutron product requirements

## 1. Problem
Architecture diagrams explain structure but not operational consequences. Developers need an accessible way to test *modeled* failures, understand propagation, and compare mitigations without deploying real infrastructure.

## 2. Audience and jobs to be done
- Primary: junior–mid software engineers learning distributed-system resilience.
- Secondary: educators and engineering teams exploring design tradeoffs.
- Job: “Given a service graph and workload, help me understand what happens when a dependency slows or fails, and verify whether a mitigation helps.”

## 3. Product principles
Simulation first; explainable metrics; reproducibility; clear separation of modeled behavior and reality; no AI-generated numeric results; no false claims of production prediction.

## 4. Core journey
1. Open a prebuilt **Checkout Under Pressure** template (Gateway → Orders → Payments → External Payment Provider; Orders → Database).
2. Review service parameters and edge dependencies; optionally move or edit nodes.
3. Run 60 seconds of simulated traffic with fixed seed and inspect baseline metrics.
4. Inject an external payment-provider outage at t=15s for 20s; rerun.
5. Observe timeouts, retry amplification, saturation, and checkout success rate.
6. Ask AI “Why did checkout fail?” and receive trace-backed explanation with cited event IDs/metrics, never invented facts.
7. Enable a circuit breaker on the Orders→Payments call (or a specified edge), rerun with same seed/workload/faults.
8. Compare baseline/fault/mitigated results; inspect which metrics improved and which worsened.
9. Save/share a local project export (JSON). Optional cloud save after core flow is stable.

## 5. MVP features (P0)
- Starter scenario; drag-and-drop service graph with five node types: Gateway, Service, Database, Cache, External API. Queue is **out of MVP** unless engine semantics implemented.
- Edge configuration: timeout, retry count, retry backoff, optional circuit breaker.
- Service configuration: fixed processing latency, max concurrency, queue limit, failure probability (seeded), downstream dependencies.
- Seeded traffic generator (constant rate), fixed duration; one fault: provider outage; optional latency spike stretch.
- Deterministic discrete-event engine with request IDs, event log, aggregate metrics, and run snapshots.
- Run controls, event timeline, node health/metrics, before/after comparison.
- Firebase AI Logic hybrid inference: a narrow structured local command workflow and cloud analysis of bounded trace summary; clear source indicators and capability checks.
- Export/import project JSON, schema validation, responsive desktop-first UI, basic keyboard access.

## 6. P1 / stretch (only after P0 complete)
- First priority is full architecture generation from a natural-language description, once the engine and verified local inference are working. Generated graphs require validation, preview, and approval.
- Other stretch features include undo/redo; multiple templates; advanced workload shapes; persistence/sync; share links; additional fault types; richer charts; offline PWA shell.

## 7. Explicit non-goals
- No actual microservice deployment, network load testing, or performance prediction of real systems.
- No arbitrary graph semantics for queues, fan-out, transactions, or consistency until explicitly modeled.
- No production chaos engineering integration, Kubernetes connection, or automatic code changes.
- No claim that all Chrome devices support on-device Gemini Nano or that cloud calls work offline.

## 8. Functional acceptance criteria
- Graph edits are validated; invalid edges, orphan references, cycles (if unsupported), and bad parameter ranges produce actionable errors.
- Every run displays seed, engine version, workload, and fault schedule.
- Same inputs + seed + engine version yield byte-equivalent canonical metrics and event ordering.
- Simulated outage causes measurable degradation in a deliberately calibrated fixture.
- Mitigation comparison reuses same arrivals and failure schedule; show tradeoffs, not guaranteed improvement.
- AI cannot execute changes without validated structured commands and explicit approval.
- After the workspace loads, manual graph editing and deterministic simulation work offline, including when local AI is unavailable.
- The [mandatory hybrid AI demo gate](05-HYBRID-AI.md#mandatory-hybrid-demo-acceptance) passes before submission.

## 9. Success metrics
- 100% deterministic replay in automated fixtures.
- Zero AI-generated metrics presented as simulation measurements.
- User completes scenario in ≤3 minutes with starter template.
- No uncaught errors in scripted demo; app usable with AI disabled.
- Hybrid demo logs actual inference source and local capability without exposing private prompts.

## 10. Product wording
Use “modeled”, “simulated”, “under these assumptions”, and “this run suggests”. Avoid “guaranteed resilient”, “production-safe”, and “predicts your infrastructure”.
