# Neutron — Engineering specification

**Product:** A simulation-first architecture laboratory for understanding and mitigating cascading failures in distributed systems.

**Deadline:** November 30, 2026. **Priority:** One reliable, polished end-to-end scenario over broad functionality.

## Final hackathon direction
Neutron pairs a deterministic distributed-systems simulator with Firebase hybrid AI. The target experience is **Describe → Generate → Edit → Simulate → Break → Diagnose → Repair → Compare**. The MVP starts with a starter graph and drag-and-drop editing. Full natural-language generation is the first stretch feature after the engine and verified local inference are working and the MVP gates are met.

## Product promise
Design a service graph → run a reproducible workload → inject a fault → inspect actual traces and metrics → apply a mitigation → rerun the same scenario → compare outcomes. AI is a constrained assistant, never the simulation authority.

## Documents and reading order
1. `01-PRODUCT-REQUIREMENTS.md` — problem, scope, journeys, acceptance criteria.
2. `02-UX-AND-DESIGN.md` — layout, interaction, accessibility, demo.
3. `03-ARCHITECTURE.md` — boundaries, packages, data flow, contracts.
4. `04-SIMULATION-ENGINE.md` — deterministic semantics, algorithms, invariants.
5. `05-HYBRID-AI.md` — local/cloud behavior, schemas, guardrails, fallback.
6. `06-DATA-AND-SECURITY.md` — storage, privacy, authorization.
7. `07-TEST-STRATEGY.md` — unit, property, integration, E2E, performance.
8. `08-IMPLEMENTATION-PLAN.md` — milestones and exit gates.
9. `09-CODEX-INSTRUCTIONS.md` — working agreement and prompts.
10. `10-DECISIONS-AND-RISKS.md` — architectural decisions, assumptions and risks.

## Non-negotiables
- Pure deterministic simulation core: no Firebase, React, browser, network, wall-clock, or LLM dependencies.
- Every run records a seed, engine version, scenario snapshot and normalized configuration.
- Compare runs using identical workload/fault schedule unless the user explicitly changes them.
- AI output is untrusted: schema validation, semantic validation, user confirmation for consequential edits.
- Local inference is **not** assumed available; feature-detect and show the actual inference source.
- Honest limitations: educational model, not a prediction of production SLAs or safety guarantees.
- Every vertical slice must work before expanding scope.

## Definition of done
A first-time visitor can load a starter architecture, run baseline, inject a payment-provider outage, inspect cascading failure metrics, add a circuit breaker, rerun identically, and see a reproducible before/after comparison. The [mandatory hybrid AI demo gate](05-HYBRID-AI.md#mandatory-hybrid-demo-acceptance) passes on supported hardware. Manual editing and simulation work offline, and unsupported devices have a clearly labeled fallback. Automated tests pass; deployment and demo video work.
