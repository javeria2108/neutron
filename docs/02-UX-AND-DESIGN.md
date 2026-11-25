# UX and interaction specification

## Information architecture
One conversation composer and an editable graph share the workspace. Answers highlight relevant paths and link to run evidence. The palette, settings inspector and trace remain available for direct manipulation and deeper inspection.

## First-run experience
Start with a system description or optional example. Show the generated graph and modeling assumptions before the first run.

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

## Checkout replay
Show completion and the measured run total next to the Run control. Start the guided replay at the first checkout arrival, with a virtual timestamp and a sentence naming the active service. Highlight the receiving component for the current hop. Label outbound calls and returning replies and orient the arrow toward the receiver. Previously traversed dependencies retain a dashed trail through the selected step. Changing the selected checkout starts its own trail at arrival. Let the user pause, step, replay, choose another checkout or jump to the full trace. Playback uses a reading pace independent of virtual time. Start paused for reduced-motion preferences. When the graph draft changes, keep the snapshot trace and suspend graph highlighting until the next run.

## Before/after
Show baseline, faulted, mitigated as separate named runs. Comparison must include workload/seed/fault equivalence indicator and config diff. Use percentage-point differences for success rates and absolute/relative differences for latency. Never hide regressions.

## AI UX
Use a single composer for generation, topology questions, failure experiments, repairs and comparisons. Resolve named targets from the graph. Show observed source and elapsed inference time per answer. Request consent for cloud routing.

## Errors/empty states
Invalid graph → list exact invalid nodes/edges. Unsupported local model → explain requirement, offer cloud with consent or manual mode. Cloud unavailable → retain local workflow. Import failure → show schema issue, no partial overwrite. No metrics → suggest running scenario.

## Visual direction
Engineering workbench: clean typography, restrained neutral palette, meaningful amber/red/green states, ample whitespace, polished charts. Avoid decorative AI art and gratuitous gamification.

## Workbench design

A full-width prompt sits above the light dotted canvas. Generate graph sends the description to cloud Gemini and previews the replacement. Edit selection targets the selected service or dependency. The component drawer supports search by name or alias, with separate runnable and planned views. Selecting a node or edge opens its properties. The two drawers share space; closing them restores the full canvas.

Show the active workload below the canvas. Run feedback appears beside the graph and detailed results and comparisons appear after a run.

Design references include [Canva Whiteboards](https://www.canva.com/online-whiteboard/) and [React Flow interactions](https://reactflow.dev/examples/interaction/contextual-zoom).

## Three-minute demo script
Load the checkout template, run the baseline, and inject the outage. Ask cloud Gemini to explain the faulted run and show its source, measured latency, and evidence references. Disconnect the network and ask Gemini Nano to propose a circuit breaker. Show its verified local source and measured latency beside the cloud measurement. Approve the draft edit, verify that the faulted snapshot still contains its original results, and rerun offline with the same inputs except for the mitigation. Compare the runs. Verify rejection of a result mutation and the unsupported-device fallback as part of the [full demo gate](05-HYBRID-AI.md#mandatory-hybrid-demo-acceptance).
