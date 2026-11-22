# Implementation roadmap — deadline Nov 30, 2026

## Scheduling principle
As of Nov 19, ~11 days remain. Work in vertical slices with a deployable result each day. Do not spend multiple days polishing an empty canvas. Timebox uncertain Firebase local AI feasibility immediately.

### Milestone 0 — Day 1: prove critical assumptions
- Scaffold Next.js TS strict + lint/test/build.
- Firebase hybrid inference spike in Chrome; record actual local availability and source; test simple structured command; verify offline after model download.
- Tiny simulation spike: single service + event queue + seeded workload.
**Exit:** real local model call demonstrated or explicit blocker documented; unit test of deterministic engine passes.

### Milestone 1 — Days 2–3: simulation core
- Model/schema, event queue, PRNG, synchronous DAG calls, capacity, timeout/retry, outage, breaker, metrics.
- Golden fixtures and invariants.
**Exit:** CLI/unit-test-only scenario demonstrates failure and mitigation deterministically.

### Milestone 2 — Days 4–5: canvas + configuration
- React Flow editor, starter template, inspector, graph validation, ELK layout.
- Run and replay controls; event timeline.
**Exit:** user can edit starter graph and see real simulated outcomes.

### Milestone 3 — Days 6–7: comparisons + AI
- Frozen run snapshots; baseline/fault/mitigated comparisons.
- Firebase local structured edit with preview/approve; cloud evidence explanation with reference checks.
- Observed inference source, measured elapsed inference time, and offline status. Verify that approved edits preserve completed run results.
**Exit:** end-to-end primary journey complete.

### Milestone 4 — Days 8–9: persistence, polish, deploy
- Local save/export/import; accessibility; error states; performance caps; Firebase deploy.
- Tests for core and critical E2E flow.
**Exit:** shareable stable demo URL and zero known P0 blockers.

### Milestone 5 — Days 10–11: validation + submission
- Pass the [mandatory hybrid AI demo gate](05-HYBRID-AI.md#mandatory-hybrid-demo-acceptance) on real hardware; fix edge cases; rehearse 3-minute script; record video; README, architecture diagram, limitations, setup instructions, screenshots; submit before deadline.
**Exit:** mandatory hybrid demo checks passed, submission assets complete, and working deployment verified.

## First stretch priority
Full natural-language architecture generation is the first feature to schedule after the simulation engine and local inference are verified and the MVP gates are met. Validate the generated graph and show a preview before approval.

## Scope cut order when behind
Cut: cloud full-graph generation → additional fault types → Firestore → multi-template → fancy animation → node palette breadth. **Never cut:** deterministic engine, failure + mitigation comparison, the mandatory hybrid demo gate, tests of invariants, usable demo.

## Definition of done for each task
Working behavior + test + error handling + brief documentation + passing typecheck/lint/build. No massive generated docs, speculative abstractions or unrelated refactors.
