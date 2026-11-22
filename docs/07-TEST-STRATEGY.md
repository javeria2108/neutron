# Testing and quality gates

## Test pyramid
**Unit (Vitest):** event scheduler ordering, PRNG fixture, request state machine, queue/capacity, timeout cancellation, retries, outage boundaries, circuit breaker transitions, metrics percentiles, graph validation, command schemas.

**Property/metamorphic:** fixed seed determinism; root terminal count ≤ arrivals; no negative capacity; bounded retries; no invalid event references; importing/exporting a scenario preserves canonical meaning. Use fast-check if time permits.

**Integration:** application command orchestration; import/export; AI adapter parsing and rejection; evidence citation validation; persistence adapter; worker message protocol.

**E2E (Playwright):** load starter; run baseline; inject outage; see metrics; enable breaker; rerun; compare; export/import; unavailable AI does not block manual flow. Browser-specific local AI tested manually on supported hardware, not faked in CI.

## Required golden fixtures
Store versioned JSON input and expected canonical metrics/event digests for simple engine cases. Snapshot tests are not substitutes for explicit invariants.

## AI evaluation
Test 20 known prompts against expected commands and 10 explanations against evidence bundles. Include ambiguous prompts (“make it faster”), unknown IDs, malicious labels, invalid ranges, and offline/unavailable cases. AI quality is probabilistic; reject unsupported outputs rather than guessing.

## Hybrid demo release gate
Automate rejection of result mutations and verify that an approved draft edit preserves the completed run snapshot. On supported Chrome, verify observed local and cloud sources, measured latency for both, a fresh offline Nano command after setup, offline manual editing and simulation, and a cloud explanation grounded in the engine output. Verify the unsupported-device fallback and consent separately. Record actual outcomes against the [demo acceptance criteria](05-HYBRID-AI.md#mandatory-hybrid-demo-acceptance).

## Performance
Target 5–20 nodes, 60s virtual time, up to a few thousand root requests in a few seconds on ordinary development hardware; benchmark and adjust caps. Keep UI responsive; use worker if necessary. Event log retention may be sampled for UI, but metrics must remain exact and trace references valid.

## CI gates
`typecheck`, `lint`, `test`, `build`, `e2e` (smoke) on every milestone. No skipped failing tests without a written rationale. Verify production build and deployed URL.

## Manual QA checklist
Chrome on supported local-AI device; Chrome unsupported device; network offline after preload; reduced motion; keyboard navigation; mobile narrow viewport; bad import; 0 requests; high load; circuit open; cloud quota error; user denies cloud consent.
