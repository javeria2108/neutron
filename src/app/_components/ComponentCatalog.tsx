import { useState } from 'react'
import { componentCatalog, type ServiceKind } from '@/domain/model/component-catalog'
import InfrastructureSymbol from './infrastructure-symbol'

export function ComponentCatalog({ onAdd }: { onAdd: (kind: ServiceKind) => void }) {
  const [search, setSearch] = useState('')
  const [planned, setPlanned] = useState(false)
  const entries = componentCatalog.filter(item =>
    (item.model === 'planned') === planned &&
    [item.kind, ...item.aliases].some(term => term.toLowerCase().includes(search.trim().toLowerCase())),
  )
  return <nav className="catalog" aria-label="Component library">
    <input type="search" aria-label="Search components" placeholder="Search components…" value={search} onChange={e => setSearch(e.target.value)} />
    <div className="catalog-tabs">
      <button aria-pressed={!planned} onClick={() => setPlanned(false)}>Runnable</button>
      <button aria-pressed={planned} onClick={() => setPlanned(true)}>Planned</button>
    </div>
    {entries.map(item => <article key={item.kind} className="catalog-item">
      <div>{item.model !== 'planned' && <InfrastructureSymbol kind={item.kind} />}<strong>{item.kind}</strong>
        {item.model !== 'planned' && item.kind !== 'Gateway' && <button draggable aria-label={'Add ' + item.kind}
          onDragStart={e => e.dataTransfer.setData('application/x-neutron-component', item.kind)}
          onClick={() => onAdd(item.kind)}>＋</button>}</div>
      <p>{item.description}</p>
    </article>)}
    {!entries.length && <p>No matching components.</p>}
  </nav>
}
