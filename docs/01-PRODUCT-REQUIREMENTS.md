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
1. Describe a system and review the generated topology and workload. The checkout graph is one reproducible example.
2. Review service parameters and edge dependencies; optionally move or edit nodes.
3. Run 60 seconds of simulated traffic with fixed seed and inspect baseline metrics.
4. Inject an external payment-provider outage at t=15s for 20s; rerun.
5. Observe timeouts, retry amplification, saturation, and checkout success rate.
6. Ask AI “Why did checkout fail?” and receive trace-backed explanation with cited event IDs/metrics, never invented facts.
7. Enable a circuit breaker on the Orders→Payments call (or a specified edge), rerun with same seed/workload/faults.
8. Compare baseline/fault/mitigated results; inspect which metrics improved and which worsened.
9. Save/share a local project export (JSON). Optional cloud save after core flow is stable.

## 5. Product capabilities
- Prompt-generated and manually editable graphs. Support synchronous services, asynchronous producers/queues/consumers, and parallel branches through versioned engine models.
- Edge configuration: timeout, retry count, retry backoff, optional circuit breaker.
- Service configuration: fixed processing latency, max concurrency, queue limit, failure probability (seeded), downstream dependencies.
- Seeded traffic and explicit failure schedules selected through graph-aware prompts.
- Deterministic discrete-event engine with request IDs, event log, aggregate metrics, and run snapshots.
- Run controls, event timeline, node health/metrics, before/after comparison.
- Firebase hybrid inference for graph generation, graph-aware conversation, failure and repair proposals, and explanations grounded in run evidence.
- Export/import project JSON, schema validation, responsive desktop-first UI, basic keyboard access.

## 6. Additional capabilities
- Resolve named components across the graph and ask for clarification when several targets match.
- Additional capabilities include undo/redo, multiple templates, advanced workload shapes, persistence/sync, share links and richer charts.

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
