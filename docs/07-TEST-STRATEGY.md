# Testing and quality gates

## Hackathon coverage

Exercise the checkout journey with integration tests that grow with the app. Reuse the same fixture for baseline, outage, mitigation, and replay. When AI edits land, check that an approved proposal updates the draft and preserves the completed run.

Reserve isolated unit tests for crucial rules where a subtle error could change results, such as scheduler ties or a late response completing a timed-out request twice. Check other behavior through the integration scenario when it already exposes the outcome.

Use one browser smoke flow for the working demo. Verify real local inference manually on supported hardware.

## Required golden fixtures
Store versioned JSON input and expected canonical metrics/event digests for simple engine cases. Snapshot tests are not substitutes for explicit invariants.

## AI evaluation
Test 20 known prompts against expected commands and 10 explanations against evidence bundles. Include ambiguous prompts (“make it faster”), unknown IDs, malicious labels, invalid ranges, and offline/unavailable cases. AI quality is probabilistic; reject unsupported outputs rather than guessing.

## Hybrid demo release gate
Automate rejection of result mutations and verify that an approved draft edit preserves the completed run snapshot. On supported Chrome, verify observed local and cloud sources, measured latency for both, a fresh offline Nano command after setup, offline manual editing and simulation, and a cloud explanation grounded in the engine output. Verify the unsupported-device fallback and consent separately. Record actual outcomes against the [demo acceptance criteria](05-HYBRID-AI.md#mandatory-hybrid-demo-acceptance).

## Performance
Target 5–20 nodes, 60s virtual time, up to a few thousand root requests in a few seconds on ordinary development hardware; benchmark and adjust caps. Keep UI responsive; use worker if necessary. Event log retention may be sampled for UI, but metrics must remain exact and trace references valid.

## CI gates
`typecheck`, `lint`, `test`, `build`, `e2e` (smoke) at milestone boundaries once the browser flow exists. Run typecheck, lint, existing tests, and build for implementation slices. No skipped failing tests without a written rationale. Verify production build and deployed URL.

## Manual QA checklist
Chrome on supported local-AI device; Chrome unsupported device; network offline after preload; reduced motion; keyboard navigation; mobile narrow viewport; bad import; 0 requests; high load; circuit open; cloud quota error; user denies cloud consent.
