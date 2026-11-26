import type { ServiceKind } from '@/domain/model/scenario'

const paths: Partial<Record<ServiceKind, string>> = {
  Gateway: 'M4 12h15m-5-5 5 5-5 5M5 5v3m0 8v3',
  Service: 'M3 4h18v6H3zM3 14h18v6H3zM6 7h2m-2 10h2',
  Database: 'M3 6c0-5 18-5 18 0s-18 5-18 0zm0 0v12c0 5 18 5 18 0V6M3 12c0 5 18 5 18 0',
  Cache: 'M14 2 5 14h6l-1 8 9-13h-6z',
  'External API': 'M10 6H4v14h14v-6M13 3h8v8m0-8L10 14',
}

export default function InfrastructureSymbol({ kind }: { kind: ServiceKind }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none"
    stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d={paths[kind] ?? paths.Service} />
  </svg>
}
