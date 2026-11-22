# UX and interaction specification

## Information architecture
Single workspace with: top toolbar (project, seed, run controls, connection/AI status); left palette (components and scenarios); central React Flow canvas; right inspector (selected node/edge configuration); bottom results drawer (timeline, event trace, metrics, comparison). Desktop first; on narrow screens use collapsible panels.

## First-run experience
Land directly in a meaningful starter scenario with one sentence explaining the challenge. Prominent sequence: **Run baseline → Inject outage → Diagnose → Add circuit breaker → Compare**. No signup gate. Show sample defaults and clearly label all simulated data.

## Canvas
- Distinct service types, consistent iconography, labels, status rings, and semantic connection arrows.
- ELK.js or dagre lays out generated/imported graphs; manual positions persist.
- Click selects; drag moves; connect through handles; inspector edits validated fields.
- Color is not the only signal: status text/icons; tooltips and keyboard alternatives.
- Avoid noisy animations. Animate only active requests/failed edges at limited density; reduced-motion preference respected.

## Simulation states
Idle → Validating → Running (in worker if practical) → Completed / Failed / Cancelled. Deterministic simulation can finish rapidly; playback scrubs over virtual time, separate from engine execution. Disable conflicting edits while playback active or explicitly invalidate the prior run.

## Metrics
Top-level: requests attempted, successful, failed, timed out, success %, p50/p95/p99 latency (for completed requests; disclose treatment of failures), retry attempts, queue drops, circuit opens. Per-service: utilization proxy, active requests over virtual time, queue length, failure count. Define every metric in tooltips.

## Before/after
Show baseline, faulted, mitigated as separate named runs. Comparison must include workload/seed/fault equivalence indicator and config diff. Use percentage-point differences for success rates and absolute/relative differences for latency. Never hide regressions.

## AI UX
Three distinct actions: “Edit architecture” (structured proposal + preview + approve), “Explain this result” (evidence-linked response), and “Generate starter architecture” (first stretch priority/cloud). Label Local, Cloud, or Unavailable using observed source, not assumption. Show measured elapsed inference time next to the observed source for completed AI calls. Manual controls remain available offline after the workspace loads.

## Errors/empty states
Invalid graph → list exact invalid nodes/edges. Unsupported local model → explain requirement, offer cloud with consent or manual mode. Cloud unavailable → retain local workflow. Import failure → show schema issue, no partial overwrite. No metrics → suggest running scenario.

## Visual direction
Engineering workbench: clean typography, restrained neutral palette, meaningful amber/red/green states, ample whitespace, polished charts. Avoid decorative AI art and gratuitous gamification.

## Three-minute demo script
Load the checkout template, run the baseline, and inject the outage. Ask cloud Gemini to explain the faulted run and show its source, measured latency, and evidence references. Disconnect the network and ask Gemini Nano to propose a circuit breaker. Show its verified local source and measured latency beside the cloud measurement. Approve the draft edit, verify that the faulted snapshot still contains its original results, and rerun offline with the same inputs except for the mitigation. Compare the runs. Verify rejection of a result mutation and the unsupported-device fallback as part of the [full demo gate](05-HYBRID-AI.md#mandatory-hybrid-demo-acceptance).
