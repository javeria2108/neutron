'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Background, Controls, MarkerType, ReactFlow, useNodesState, Position, type ReactFlowInstance, type XYPosition, type Connection, type Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { z } from 'zod'
import { checkoutScenario } from '@/domain/model/checkout'
import { connectionError, newDependency, newService, serviceKinds, type ServiceKind } from '@/domain/model/scenario'
import InfrastructureSymbol from './infrastructure-symbol'
import './editor.css'

const starter = checkoutScenario()
const positions = [[0, 90], [210, 90], [435, 0], [655, 0], [435, 180]]
function serviceClass(kind: ServiceKind) {
  return 'service-card kind-' + kind.toLowerCase().replaceAll(' ', '-')
}

function nodeLabel(name: string, kind: ServiceKind) {
  return <span className="node-face"><span className="node-symbol"><InfrastructureSymbol kind={kind} /></span><strong>{name}</strong></span>
}

const initialNodes: Node[] = starter.nodes.map((service, index) => ({
  id: service.id,
  position: { x: positions[index][0], y: positions[index][1] },
  sourcePosition: Position.Right, targetPosition: Position.Left,
  className: serviceClass(service.kind),
  data: { label: nodeLabel(service.name, service.kind) },
}))

const integer = (min: number, max: number) => z.coerce.number().int().min(min).max(max)
const serviceSettings = z.object({
  name: z.string().trim().min(1).max(80),
  processingLatencyMs: integer(0, 60000), maxConcurrent: integer(1, 10000),
  queueCapacity: integer(0, 10000), baseFailureRate: z.coerce.number().min(0).max(1),
})
const edgeSettings = z.object({
  timeoutMs: integer(1, 60000), maxRetries: integer(0, 10), retryBackoffMs: integer(0, 60000),
})
const breakerSettings = z.object({
  failureThreshold: integer(1, 10000), windowMs: integer(1, 60000),
  openDurationMs: integer(1, 60000), halfOpenMaxProbes: integer(1, 100),
})

function field(label: string, name: string, value: number, step = '1') {
  return <label>{label}<input required type="number" name={name} defaultValue={value} step={step} /></label>
}

export default function CheckoutEditor() {
  const [scenario, setScenario] = useState(checkoutScenario)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [selected, select] = useState('gateway')
  const [flow, setFlow] = useState<ReactFlowInstance<Node> | null>(null)
  const [connectionWarning, setConnectionWarning] = useState('')
  const [message, report] = useState('')
  const service = scenario.nodes.find(node => node.id === selected)
  const edge = scenario.edges.find(item => item.id === selected)

  function initializeCanvas(instance: ReactFlowInstance<Node>) {
    setFlow(instance)
    if (window.matchMedia('(max-width: 480px)').matches) {
      const mobilePositions = [[0, 0], [0, 120], [0, 245], [0, 375], [195, 245]]
      setNodes(previous => previous.map((node, index) => ({
        ...node,
        position: { x: mobilePositions[index][0], y: mobilePositions[index][1] },
        sourcePosition: Position.Bottom, targetPosition: Position.Top,
      })))
      requestAnimationFrame(() => { void instance.fitView({ padding: 0.14 }) })
    }
  }

  function connect({ source, target }: Connection) {
    const error = connectionError(scenario.nodes, scenario.edges, source, target)
    if (error) return setConnectionWarning(error)
    setConnectionWarning('')
    const dependency = newDependency(source, target)
    setScenario({ ...scenario, edges: [...scenario.edges, dependency] })
    select(dependency.id)
    report('Dependency added.')
  }

  function addService(kind: ServiceKind, position?: XYPosition) {
    if (nodes.length >= 20) return report('The graph supports up to 20 services.')
    const id = crypto.randomUUID()
    const node = newService(id, kind, kind)
    setScenario({ ...scenario, nodes: [...scenario.nodes, node] })
    setNodes(previous => [...previous, { id, className: serviceClass(kind), position: position ?? { x: 210 + nodes.length * 8, y: 280 }, sourcePosition: Position.Right, targetPosition: Position.Left, data: { label: nodeLabel(kind, kind) } }])
    select(id)
    report('Connect the new service to the graph.')
  }

  function remove() {
    if (selected === scenario.workload.rootId) return
    setScenario({
      ...scenario, nodes: scenario.nodes.filter(node => node.id !== selected),
      edges: scenario.edges.filter(item => ![item.id, item.source, item.target].includes(selected)),
    })
    setNodes(previous => previous.filter(node => node.id !== selected))
    select('gateway')
    report('Selection removed.')
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    try {
      if (service) {
        const settings = serviceSettings.parse(values)
        setScenario({ ...scenario, nodes: scenario.nodes.map(node => node.id === selected ? { ...node, ...settings } : node) })
        setNodes(previous => previous.map(node => node.id === selected ? { ...node, data: { label: nodeLabel(settings.name, service.kind) } } : node))
      } else if (edge) {
        const settings = edgeSettings.parse(values)
        const circuitBreaker = values.breaker ? breakerSettings.parse(values) : undefined
        setScenario({ ...scenario, edges: scenario.edges.map(item => item.id === selected ? { ...item, ...settings, circuitBreaker } : item) })
      }
      report('Settings saved.')
    } catch (error) {
      if (!(error instanceof z.ZodError)) throw error
      report(error.issues.map(issue => issue.path.join('.') + ' - ' + issue.message).join('. '))
    }
  }

  return <main className="workbench">
    <header className="masthead">
      <div className="brand"><i className="brand-mark" aria-hidden="true" />Neutron</div>
      <span className="product-name">Architecture lab</span>
      <Link href="/ai-feasibility">AI diagnostics</Link>
    </header>
    <div className="scenario-heading"><div><h1>Checkout Under Pressure</h1>
      </div>
      <dl className="workload"><div><dt>Seed</dt><dd>{scenario.workload.seed}</dd></div>
        <div><dt>Traffic</dt><dd>{scenario.workload.arrivalRatePerSecond} req/s</dd></div>
        <div><dt>Duration</dt><dd>{scenario.workload.durationMs / 1000} s</dd></div></dl>
    </div>
    <div className="workspace">
      <nav className="library" aria-label="Component library"><h2>Components</h2><p>Click or drag to add</p>
        <div className="palette">{serviceKinds.filter(type => type !== 'Gateway').map(type =>
          <button key={type} className={serviceClass(type)} draggable onDragStart={event => event.dataTransfer.setData('application/x-neutron-component', type)}
            onClick={() => addService(type)} aria-label={`Add ${type}`}><InfrastructureSymbol kind={type} />{type}</button>
        )}</div>
        <div className="outline"><h2>In this graph</h2>{scenario.nodes.map(node =>
          <button key={node.id} aria-pressed={node.id === selected} onClick={() => select(node.id)}>
            <InfrastructureSymbol kind={node.kind} />{node.name}</button>
        )}</div>
      </nav>
      <section aria-label="Architecture editor">
      <div className="toolbar"><h2>Topology</h2><span>{nodes.length} nodes / {scenario.edges.length} dependencies</span></div>
      <div className="canvas" onDragOver={event => event.preventDefault()} onDrop={event => {
        event.preventDefault()
        const kind = serviceKinds.find(type => type !== 'Gateway' && type === event.dataTransfer.getData('application/x-neutron-component'))
        if (flow && kind) {
          addService(kind, flow.screenToFlowPosition({ x: event.clientX, y: event.clientY }))
        }
      }}><ReactFlow<Node> onInit={initializeCanvas} nodes={nodes.map(node => ({ ...node, selected: node.id === selected }))} edges={scenario.edges.map(item => {
          const highlighted = [item.id, item.source, item.target].includes(selected)
          const color = highlighted ? '#9bd7ff' : '#7082a4'
          return { ...item, style: { stroke: color, strokeWidth: highlighted ? 2.6 : 1.8 }, markerEnd: { type: MarkerType.ArrowClosed, color } }
        })} defaultEdgeOptions={{ type: 'smoothstep' }} onNodesChange={onNodesChange}
        onConnectStart={() => setConnectionWarning('')} onConnect={connect} deleteKeyCode={null} onNodeClick={(_, node) => select(node.id)}
        onEdgeClick={(_, item) => select(item.id)} fitView>
        <Background gap={19} size={1.2} color="#3a435a" /><Controls showInteractive={false} />
      </ReactFlow>
        {connectionWarning && <p className="connection-warning" role="alert">{connectionWarning}</p>}
      </div>
      <details className="comparison"><summary>Run comparison</summary>
        <p>Completed runs will appear here for comparison under the same workload.</p>
        <table><caption className="sr-only">Run availability</caption><thead><tr><th>Baseline</th><th>Provider outage</th><th>Mitigated</th></tr></thead>
          <tbody><tr>{['baseline', 'outage', 'mitigated'].map(run => <td key={run}>Awaiting run</td>)}</tr></tbody></table>
      </details>
    </section>
    <aside><div className="inspector-label">Inspector</div>{service && <span className={'inspector-symbol ' + serviceClass(service.kind)}><InfrastructureSymbol kind={service.kind} /></span>}<h2>{service?.name ?? 'Dependency'}</h2><form key={selected} onSubmit={save}>
      {service && <><p>{service.kind}</p><label>Name<input required name="name" defaultValue={service.name} maxLength={80} /></label>
        {field('Processing latency (ms)', 'processingLatencyMs', service.processingLatencyMs)}
        {field('Concurrent requests', 'maxConcurrent', service.maxConcurrent)}
        {field('Queue capacity', 'queueCapacity', service.queueCapacity)}
        {field('Failure probability (0 to 1)', 'baseFailureRate', service.baseFailureRate, 'any')}</>}
      {edge && <><p>{scenario.nodes.find(n => n.id === edge.source)?.name} to {scenario.nodes.find(n => n.id === edge.target)?.name}</p>
        {field('Timeout (ms)', 'timeoutMs', edge.timeoutMs)}
        {field('Maximum retries', 'maxRetries', edge.maxRetries)}
        {field('Retry backoff (ms)', 'retryBackoffMs', edge.retryBackoffMs)}
        <label><input type="checkbox" name="breaker" defaultChecked={!!edge.circuitBreaker} /> Enable circuit breaker</label>
        {field('Failure threshold', 'failureThreshold', edge.circuitBreaker?.failureThreshold ?? 3)}
        {field('Rolling window (ms)', 'windowMs', edge.circuitBreaker?.windowMs ?? 5000)}
        {field('Open duration (ms)', 'openDurationMs', edge.circuitBreaker?.openDurationMs ?? 2000)}
        {field('Half-open probes', 'halfOpenMaxProbes', edge.circuitBreaker?.halfOpenMaxProbes ?? 1)}</>}
      <button className="save">Save settings</button>
    </form>{selected !== scenario.workload.rootId && <button onClick={remove}>Remove selection</button>}
    <p role="status">{message}</p></aside></div>
  </main>
}
