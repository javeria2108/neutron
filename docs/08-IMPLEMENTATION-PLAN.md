# Implementation roadmap

## Current capabilities

The checkout editor supports graph construction, connection validation, service settings and dependency policies. Edits are held in memory. The event scheduler has a golden ordering test. On the separate Firebase feasibility page the user verified cloud inference and offline local inference for structured latency edits.

## Feature sequence

1. **Run checkout simulation (implemented).** The workbench runs the edited scenario locally after validating the graph. The frozen baseline result includes the scenario, engine version, measured root outcomes, latency percentiles and per-request traces. Capacity, queues, timeouts, retries and deterministic replay are supported.
2. **Break, repair and compare.** Schedule the provider outage, apply circuit-breaker behavior and rerun. Populate the comparison drawer and timeline from immutable baseline, faulted and mitigated runs. Show configuration differences, metric definitions and regressions. Hold arrivals and outage schedule fixed between the faulted and mitigated runs.
3. **Apply natural-language edits.** Integrate Firebase local commands with the editor. Validate a proposed change using the same rules as manual edits, preview the diff and apply it on approval. Verify a fresh offline command, observed source, elapsed time and the unsupported-device fallback.
4. **Explain an incident.** Build a bounded evidence summary from a completed run. With consent, ask cloud Gemini for an explanation. Check its event and metric references and show the deterministic evidence when the explanation fails validation.
5. **Save and resume offline.** Persist drafts, canvas positions and completed runs locally. Add validated, versioned JSON export/import and verify that manual editing, running and comparison work after loading and disconnecting.
6. **Deploy and demonstrate.** Verify accessibility, performance limits and failure states through the checkout journey. Deploy with Firebase App Check configured for the deployed origin, rehearse the mandatory hybrid demo on supported hardware, and finish the setup guide, demo video and submission.

Before implementing each feature, present the plan specified in the [working agreement](09-CODEX-INSTRUCTIONS.md).

## First stretch priority
Full natural-language architecture generation is the first feature to schedule after the simulation engine and local inference are verified and the MVP gates are met. Validate the generated graph and show a preview before approval.

## Scope cut order when behind
Cut: cloud full-graph generation → additional fault types → Firestore → multi-template → fancy animation → node palette breadth. **Never cut:** deterministic engine, failure + mitigation comparison, the mandatory hybrid demo gate, tests of invariants, usable demo.

## Definition of done for each task
Working behavior + a proportionate verification check + error handling + brief documentation + passing typecheck/lint/build. No massive generated docs, speculative abstractions or unrelated refactors.
