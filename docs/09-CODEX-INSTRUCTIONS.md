# Codex working agreement

## Role

Act as a senior TypeScript engineer implementing the full Neutron product. Deliver features in reviewable changes and keep commits focused on one task.

## Final hackathon direction

Neutron starts with a prompt that generates an editable, runnable system graph. Users ask topology questions, describe failures and repairs by name, and compare reproducible runs with explanations linked to trace events and metrics. The full conversational workflow is the hackathon deliverable. Simulation coverage grows to include asynchronous messaging and parallel flows; each modeled behavior requires explicit deterministic semantics. Keep the mandatory hybrid AI demo gate. Follow the route ownership and shared-contract rules in the architecture specification.

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
- Comments explain _why_ and modeling assumptions, not restate code.
- No unrequested libraries or large rewrites; favor complete, scoped product features.

## TDD / verification

Prefer integration tests for the checkout scenario and validated AI edits. Add focused unit tests for crucial rules such as event ordering, deterministic replay, and preventing duplicate completions. Use a browser smoke check for the demo flow. Never fabricate AI availability or simulation metrics.

## Response format after each task

When explaining code, briefly describe what each new or substantially changed file does and how it fits into Neutron. For the main logic:

- Define domain terms with a concrete Neutron example. Distinguish user actions and scenario settings from internal simulation events and recorded results.
- Walk through unfamiliar language features and library methods in execution order. Explain what each operation reads, changes, or returns, including relevant edge cases.
- Explain why the implementation fits the current milestone. When performance matters, give the cost of the current approach and explain when an alternative would be worth using.

Mentor the user as a junior software engineer. Link to the relevant code and trace one concrete example from input to outcome. Explain which layer owns each important decision, why it belongs there, and the tradeoff with a realistic alternative. Describe the blast radius: which callers, stored data, or user workflows could change if the contract changes, and which check protects them. Keep the lesson proportional to the feature.

1. What changed (≤5 bullets).
2. Files touched.
3. Tests run and actual results.
4. Assumptions/risks (if any).
5. Next smallest task.
   Keep explanations concise; no thousands-of-lines README or unrelated diagrams.

## Task sizing

Deliver one specified product feature end to end. Use the production model and normal app entry point from the start. Reserve feasibility experiments for unresolved technical risks. Verify the feature against its acceptance criteria. Before starting any feature or writing new code, present its implementation plan to the user, regardless of file count. State the user-visible outcome, the implementation steps in order, the affected layers and callers, the main tradeoff, and how success will be verified. If the user asks for a plan only, stop after the plan.

## First Codex prompt

> Read all specs in `docs/` starting with `00-README.md`. Do not implement the whole app. First inspect the repository, propose the minimal project structure consistent with the dependency rule, and list any blocking ambiguities. Then implement only Milestone 0: scaffold a strict TypeScript Next.js app with Vitest, a pure deterministic event-priority-queue spike and one golden test. Separately create a minimal Firebase hybrid-inference feasibility page using the current official Firebase AI Logic web documentation; feature-detect local model support and display actual inference source, without claiming local inference unless verified. Run typecheck, lint, tests and build. Report actual results, files changed and next step. Do not add Firestore, auth, fancy UI or full simulation yet.

## Follow-up prompt template

> Implement [specified feature] for Milestone [X]. Read the relevant specs and inspect existing code. Present the implementation plan before writing code. Preserve domain boundaries. Choose the smallest check that verifies the feature. Keep the diff focused. Run typecheck/lint/tests/build and report results. Stop when the feature is complete; do not implement future milestones.
