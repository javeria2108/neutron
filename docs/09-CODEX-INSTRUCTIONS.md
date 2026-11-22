# Codex working agreement

Copy these rules into `AGENTS.md` at repository root (or instruct Codex to read this file before every task).

## Role
Act as a senior TypeScript engineer implementing the Neutron specifications. Prioritize correctness, minimal scope, clean architecture, understandable code and shipping the MVP. Ask about genuine ambiguities; otherwise state assumptions and proceed with the smallest safe slice.

## Final hackathon direction

Neutron is a deterministic distributed-systems simulator with Firebase hybrid AI. The MVP includes a drag-and-drop architecture editor, offline manual editing and simulation, reproducible failure and mitigation comparisons, Gemini Nano edit proposals on supported devices, and cloud Gemini explanations grounded in engine evidence. The [hybrid AI demo acceptance gate](05-HYBRID-AI.md#mandatory-hybrid-demo-acceptance) is required for submission. Full natural-language architecture generation is the first stretch feature once the engine and local inference work and the MVP gates are met.

## Mandatory reading
Before coding, read `00-README.md`, `03-ARCHITECTURE.md`, `04-SIMULATION-ENGINE.md`, `07-TEST-STRATEGY.md`, and the relevant feature spec. Read `05-HYBRID-AI.md` before AI work. Do not silently deviate; record decisions in `10-DECISIONS-AND-RISKS.md`.

## Clean code
- Strict TypeScript, no `any` without written justification, no `@ts-ignore` shortcuts.
- Meaningful domain names; small cohesive functions; avoid Boolean flag parameters and deep nesting.
- Prefer pure functions, explicit state transitions, immutable run snapshots and dependency injection at boundaries.
- Domain imports no UI, Firebase, Next, browser or persistence packages.
- Validate external inputs at the boundary and again enforce domain invariants.
- Use discriminated unions for event and command types; exhaustive switches.
- Avoid speculative generic repositories, service locators, singleton mutable state and premature optimization.
- Comments explain *why* and modeling assumptions, not restate code.
- No unrequested libraries or large rewrites; favor a minimal working vertical slice.

## TDD / verification
For engine logic: write a failing test for one behavior, implement minimum logic, refactor, run tests. Add boundary tests and invariants. For UI: meaningful component tests and Playwright smoke flow. Never fabricate AI availability or simulation metrics.

## Response format after each task
1. What changed (≤5 bullets).
2. Files touched.
3. Tests run and actual results.
4. Assumptions/risks (if any).
5. Next smallest task.
Keep explanations concise; no thousands-of-lines README or unrelated diagrams.

## Task sizing
One milestone slice at a time; do not implement all specs in one prompt. Do not begin next slice until current acceptance criteria and tests pass. Show a brief plan before editing when change spans >3 files.

## First Codex prompt
> Read all specs in `docs/` starting with `00-README.md`. Do not implement the whole app. First inspect the repository, propose the minimal project structure consistent with the dependency rule, and list any blocking ambiguities. Then implement only Milestone 0: scaffold a strict TypeScript Next.js app with Vitest, a pure deterministic event-priority-queue spike and one golden test. Separately create a minimal Firebase hybrid-inference feasibility page using the current official Firebase AI Logic web documentation; feature-detect local model support and display actual inference source, without claiming local inference unless verified. Run typecheck, lint, tests and build. Report actual results, files changed and next step. Do not add Firestore, auth, fancy UI or full simulation yet.

## Follow-up prompt template
> Implement Milestone [X], slice [Y] only. Read the relevant specs and inspect existing code. Begin by identifying tests and acceptance criteria. Preserve domain boundaries. Write tests before domain behavior. Keep the diff focused. Run typecheck/lint/tests/build and report results. Stop when this slice is complete; do not implement future milestones.
