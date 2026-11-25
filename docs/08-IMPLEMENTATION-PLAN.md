# Implementation roadmap

## Current capabilities

The checkout editor supports graph construction, connection validation, service settings and dependency policies. Edits are held in memory. The event scheduler has a golden ordering test. On the separate Firebase feasibility page the user verified cloud inference and offline local inference for structured latency edits.

## Feature sequence

1. **Run checkout simulation (implemented).** The workbench runs the edited scenario locally after validating the graph. The frozen baseline result includes the scenario, engine version, measured root outcomes, latency percentiles and per-request traces. Capacity, queues, timeouts, retries and deterministic replay are supported.
2. **Break, repair and compare (implemented).** Schedule the provider outage, apply circuit-breaker behavior and rerun. Populate the comparison drawer and timeline from immutable baseline, faulted and mitigated runs. Show configuration differences, metric definitions and regressions. Hold arrivals and outage schedule fixed between the faulted and mitigated runs.
3. **Build the shared component catalog first.** Keep canonical kinds, aliases, simulation support and modeling assumptions in one registry. The editor and run validation consume the runnable subset. Specify connection rules, settings and observable outcomes for each new model. Verify queued uploads can finish while workers are offline and the backlog drains after recovery. Cover routing, storage, cache behavior and parallel branches with their own fixtures as models land.
4. **Generate a runnable graph from a prompt.** Consume the catalog and verified models. Surface any unmodeled behavior before a run. Validate the graph and workload, lay it out and run it. Verify with both checkout and a different architecture.
5. **Add graph-aware conversation.** Reuse the working local edit adapter and approval flow. Resolve named nodes and edges, answer topology questions and clarify ambiguous references.
6. **Run failure and repair prompts.** Turn a prompt into a previewable experiment. Compare equivalent workloads and fault schedules on arbitrary generated graphs.
7. **Explain and compare.** Link answers to checked event IDs and metric keys. Surface regressions and assumptions.
8. **Save, resume and demonstrate.** Implement local persistence and versioned import/export. Verify hybrid routing, offline behavior, accessibility and the deployed end-to-end journey.

Implementation order describes dependencies. All stages belong to the product. Present an implementation plan before each feature.

## Definition of done for each task
Working behavior + a proportionate verification check + error handling + brief documentation + passing typecheck/lint/build. No massive generated docs, speculative abstractions or unrelated refactors.
