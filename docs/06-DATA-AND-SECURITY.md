# Data, persistence, security

## Storage strategy
P0 local-first. Scenario drafts and saved runs in IndexedDB (preferred for larger event logs) or localStorage for small scenario metadata; use an adapter interface. Export/import versioned JSON. Firestore sync is P1 only; no authentication needed to try the demo.

## Versioned entities
`Project {id,name,createdAt,updatedAt,schemaVersion,scenario}`; `RunRecord {id,projectId,engineVersion,scenarioHash,scenarioSnapshot,seed,metrics,events,createdAt}`. Dates are metadata outside the simulation core. Store canonical scenario snapshots with runs; never recompute old metrics using a changed scenario without explicit rerun.

## Validation
Zod schema on import, AI output, persisted data, and server boundaries. Domain semantic checks for node uniqueness, known endpoints, DAG constraint, one root, bounded fanout, positive timeouts, max retries, valid outage interval. Limit import size, graph size, event count and AI prompt length.

## Privacy
Projects may contain internal architecture labels; default to local storage. Cloud requests only send the minimum necessary context after visible disclosure. Never log raw prompts, API keys or full project payloads to analytics. Clear local data option.

## Threat model
Untrusted JSON imports, prompt injection in node labels, oversized graphs causing CPU/memory exhaustion, Firebase quota abuse, XSS through labels, leaked API credentials, accidental cloud uploads. Mitigations: validation, escaping (never render untrusted HTML), hard limits, Firebase App Check where supported, explicit cloud consent, usage caps, server-side enforcement where applicable.

## Firebase deployment
Choose Firebase Hosting for static-compatible build or App Hosting if server rendering required. Verify platform/billing implications early. Keep secrets out of `NEXT_PUBLIC_*`; browser Firebase config is public identification, not an authorization secret. Firestore security rules must deny unintended access if sync is added.

## Observability
Record anonymous client errors, feature usage, simulation duration and model source only with privacy-conscious telemetry. Separate deterministic event trace from application logs.
