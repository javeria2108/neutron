# Working on Neutron

Build the full prompt-first architecture simulator. Preserve detailed generated graphs, deterministic runs, graph-aware failure and repair experiments, trace-backed explanations, and the mandatory Firebase hybrid AI demo.

## Use context economically

- Answer questions directly. Before coding, give a brief plan covering the outcome, affected callers, main tradeoff and verification. Stop for plan-only requests.
- Start with the relevant feature spec and symbols. Read the relevant sections of docs/03-ARCHITECTURE.md for boundaries, 04-SIMULATION-ENGINE.md for engine semantics, 05-HYBRID-AI.md for AI, and 07-TEST-STRATEGY.md for verification. Reuse context already read unless it changed.
- Use targeted searches, file ranges and short tool output. Summarize passing checks once. Expand failures enough to diagnose them.
- Deliver one feature end to end. Keep commits specific to one task and formatting separate.

## Engineering and mentoring

- Use strict TypeScript, explicit command/event unions, boundary validation and immutable run snapshots. Keep the domain independent of UI, Firebase and persistence. Follow route ownership and shared contracts. Record architecture decisions in docs/10-DECISIONS-AND-RISKS.md.
- Prefer integration coverage and focused tests for crucial invariants. Run checks proportional to the change and the milestone gates in the test strategy. Report actual results.
- Keep routine replies short. For code changes, link affected files, explain ownership and one concrete example or tradeoff, report checks and flag remaining risks. Expand into a walkthrough when asked. Respect requests for code in chat.

# Token Efficiency Rules

- Read only files relevant to the current task.
- Use targeted searches instead of scanning the
  entire repository.
- Read relevant sections of large files instead
  of loading them entirely.
- Avoid repeatedly reading unchanged files when
  their contents are already available.
- Avoid unnecessary tool calls and redundant
  verification.
- Batch independent file reads where possible.
- Limit terminal output to relevant results
  and errors.
- Do not make unrelated changes, refactor
  unnecessarily, or overengineer.
- Run targeted tests first; run the full suite
  when necessary.
- Keep plans, progress updates, and final
  responses concise.
- Do not reproduce code in the response that
  has already been written to files.
- If the same approach fails twice, reassess
  before continuing.
- Ask for clarification when a missing decision
  could cause significant rework.
- Do not compromise correctness, security, or
  architectural integrity to save tokens.
- Generate detailed documentation only when
  explicitly requested.
