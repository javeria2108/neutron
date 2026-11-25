// A model identifier describes the execution semantics available to a generated graph.
// Recognizing an architecture term alone does not make it executable.
function entry<const K extends string, const M extends 'request-response' | 'planned'>(
  kind: K, model: M, description: string, aliases: readonly string[],
) {
  return { kind, model, description, aliases }
}

export const componentCatalog = [
  entry('Gateway', 'request-response', 'Entry point for simulated traffic. Calls each configured dependency in sequence.', ['API gateway', 'ingress']),
  entry('Service', 'request-response', 'Processes requests with bounded concurrency and waits for downstream calls.', ['application server', 'microservice']),
  entry('Database', 'request-response', 'Models storage call latency, capacity and failure. Reads and writes share one behavior.', ['PostgreSQL', 'SQL database']),
  entry('Cache', 'request-response', 'Models the cost of a cache call. Hit, miss and expiry behavior still needs a model.', ['Redis', 'Memcached']),
  entry('External API', 'request-response', 'Models latency, saturation and failure at a remote provider.', ['third-party API', 'payment provider']),
  entry('Message Queue', 'planned', 'Buffers published jobs until a consumer acknowledges them. Unacknowledged work can be redelivered.', ['SQS', 'job queue']),
  entry('Worker', 'planned', 'Consumes queued jobs independently of the original request.', ['background worker', 'consumer']),
  entry('Pub/Sub Topic', 'planned', 'Delivers a publication to independent subscriptions.', ['SNS', 'event topic']),
  entry('Event Stream', 'planned', 'Retains ordered records per partition. Consumer groups track independent offsets.', ['Kafka', 'Kinesis']),
  entry('Dead Letter Queue', 'planned', 'Retains messages after the delivery attempt limit is exhausted.', ['DLQ']),
  entry('Load Balancer', 'planned', 'Routes a request to one eligible target using a balancing policy.', ['ALB', 'reverse proxy']),
  entry('Replica Pool', 'planned', 'Supplies independently available instances with per-instance capacity.', ['service replicas']),
  entry('Rate Limiter', 'planned', 'Admits or rejects requests against a configured budget and time window.', ['token bucket']),
  entry('CDN', 'planned', 'Serves edge-cache hits and forwards misses to the origin.', ['edge cache', 'content delivery network']),
  entry('Object Storage', 'planned', 'Models object reads and writes with distinct latency and throughput.', ['S3', 'blob storage']),
  entry('Read Replica', 'planned', 'Serves reads subject to replication lag and availability.', ['database replica']),
  entry('Sharded Store', 'planned', 'Routes operations to partitions by key and models partition-specific failures.', ['partitioned database']),
  entry('Parallel Fan-out', 'planned', 'Starts independent downstream calls at the same virtual time.', ['scatter']),
  entry('Join', 'planned', 'Continues after a specified set or quorum of parallel calls completes.', ['gather', 'fan-in']),
  entry('Scheduler', 'planned', 'Triggers independent work according to a virtual-time schedule.', ['cron', 'scheduled job']),
  entry('Regional Router', 'planned', 'Selects an available region according to routing and failover policy.', ['global traffic manager']),
] as const

const runnableEntries = componentCatalog.filter(component => component.model === 'request-response')
export const serviceKinds = runnableEntries.map(component => component.kind)
export type ServiceKind = typeof serviceKinds[number]
