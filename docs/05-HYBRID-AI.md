# Firebase hybrid AI design

## Purpose
Hybrid inference is a user-visible capability, not a checkbox. Use **local** model for small, frequent, privacy-sensitive edit commands and **cloud** model for complex architecture suggestions and evidence-grounded explanations. Manual operation always works.

## Critical feasibility gate
Before full implementation, build a separate spike in a supported Chrome environment using the **official Firebase AI Logic hybrid web SDK**. Verify current API surface, supported model, structured output support, hardware/Chrome constraints, and actual `inferenceSource`. Do not assume VS Code/Electron/other browsers support local Gemini Nano. Verify model download and offline inference with network disabled *after initial setup*. Official starting point: https://firebase.google.com/docs/ai-logic/hybrid/web/get-started . Treat API examples as version-dependent; follow live official docs.

## AI capabilities
**P0 local:** Convert bounded user utterances into one of a small set of typed edit commands: `setNodeLatency`, `setEdgeTimeout`, `setMaxRetries`, `enableCircuitBreaker`, `disableCircuitBreaker`, `addSupportedNode` (if validation permits). Send minimal relevant graph context; do not require full architecture generation locally.

**P0 cloud:** Explain a bounded, deterministic evidence bundle: actual metrics, top N events, relevant node/edge configs, scenario hash. Request citations to event IDs and metrics keys. Check references before displaying. If citations invalid, show raw deterministic summary and mark AI narrative unavailable.

**P1:** Full natural-language graph generation is the first stretch feature once the deterministic engine and verified local inference work and P0 gates are met. Require validated schema, preview, and approval. Multi-edit plans and comparative recommendations follow.

## Command contract
```ts
type EditCommand =
  | { kind: 'setNodeLatency'; nodeId: string; latencyMs: number }
  | { kind: 'setEdgeTimeout'; edgeId: string; timeoutMs: number }
  | { kind: 'setMaxRetries'; edgeId: string; maxRetries: number }
  | { kind: 'enableCircuitBreaker'; edgeId: string; failureThreshold: number; windowMs: number; openDurationMs: number }
  | { kind: 'disableCircuitBreaker'; edgeId: string };
interface ProposedEdit { command: EditCommand; rationale?: string; }
```
Use discriminated unions and Zod. Reject unknown IDs, out-of-range values, unsupported operations, and attempts to modify results. Show before/after preview and require explicit approval.

## Routing and availability
- Prefer on-device for bounded edit commands; report whether local or cloud actually executed.
- Offer local-only privacy mode; if local unavailable, do not silently upload content.
- For cloud explanations, require internet and explain what bounded evidence will be sent.
- When offline, simulation, manual edits, imported projects, and saved results must still work; local AI only if Chrome model installed and supported.
- Do not claim `PREFER_ON_DEVICE` guarantees local execution; check response metadata.

## Mandatory hybrid demo acceptance

All checks below must pass before hackathon submission. Use a supported Chrome device with Gemini Nano installed and the workspace already loaded.

1. Run a bounded architecture edit with Gemini Nano and an incident explanation with cloud Gemini. Show the observed source for each response and verify that the explanation references actual run evidence.
2. Disable network access after setup. Run a fresh edit command and verify that its response reports local inference. Show that manual graph editing and deterministic simulation also work offline.
3. Show measured local and cloud inference latency alongside the observed source. Measure elapsed time from invocation to response for each call. Label the request used for each measurement so viewers can distinguish different workloads.
4. Show a validated edit preview and verify that a proposed result mutation is rejected. Approval applies the edit to the draft scenario. A completed run keeps its original trace and metrics, and an explicit deterministic rerun produces a new result for comparison.
5. Verify that unsupported hardware shows local unavailability, preserves manual operation, and requires consent before sending an edit to the cloud.

Record the observed sources, timings, and offline outcome without recording private prompts.

## Evidence protocol
Evidence bundle contains only trusted engine output. Prompt instructs model to reference metric keys/event IDs, not estimate or invent values. Parser validates all referenced keys/IDs against bundle. Show deterministic fallback explanation if model fails or times out. Cloud model output is advisory, not executable.

## Security/privacy
No credentials in prompts. Strip unnecessary user content; redact before cloud submission; show clear consent for sending scenario metadata. App Check and quotas/rate limits for public cloud usage; protect against prompt injection in imported project labels. Treat node labels as data, never instructions.

## Evaluation
Prepare 20 fixed edit prompts (including ambiguous and malicious), test schema validity, correct ID resolution, no unauthorized mutation, local success rate, latency and actual inference source. Prepare 10 evidence bundles, verify no fabricated references. Record limitations honestly.

## Fallback plan
If local inference is unavailable on development/demo hardware: do not fake it. Preserve deterministic app; document limitation, use a supported device for a verified hybrid demo if possible, and assess hackathon eligibility before submitting. A cloud-only demo leaves the mandatory Neutron submission gate unmet.
