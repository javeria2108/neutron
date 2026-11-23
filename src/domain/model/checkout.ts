import { newDependency, newService, type Scenario } from './scenario'

export function checkoutScenario(): Scenario {
  return {
    schemaVersion: 1,
    nodes: [
      newService('gateway', 'Gateway', 'Gateway'),
      newService('orders', 'Orders', 'Service'),
      newService('payments', 'Payments', 'Service'),
      newService('provider', 'External Payment Provider', 'External API'),
      newService('database', 'Database', 'Database'),
    ],
    edges: [
      newDependency('gateway', 'orders'),
      newDependency('orders', 'payments'),
      newDependency('payments', 'provider'),
      newDependency('orders', 'database'),
    ],
    workload: { rootId: 'gateway', durationMs: 60000, arrivalRatePerSecond: 10, seed: 42 },
    faults: [],
  }
}
