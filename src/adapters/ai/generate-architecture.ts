import { Schema } from 'firebase/ai'
import { componentCatalog, serviceKinds } from '@/domain/model/component-catalog'
import { generateStructured } from './firebase-feasibility'

const schema = Schema.object({ properties: {
  title: Schema.string(), assumptions: Schema.string(),
  nodes: Schema.array({ items: Schema.object({ properties: {
    id: Schema.string(), name: Schema.string(), kind: Schema.enumString({ enum: serviceKinds }),
  } }) }),
  workflows: Schema.array({ items: Schema.object({ properties: { name: Schema.string(), edges: Schema.array({ items: Schema.object({ properties: { source: Schema.string(), target: Schema.string() } }) }) } }) }),
  edges: Schema.array({ items: Schema.object({ properties: { source: Schema.string(), target: Schema.string() } }) }),
} })

export function generateArchitecture(description: string, correction?: string) {
  const prompt = [
    'Design a detailed proposed architecture. For a real product label it as a proposed design and explain the modeled workflow. Include meaningful subsystems for the requested use case. Support synchronous calls and background publishing. A Message Queue distributes accepted jobs across workers; a Pub/Sub Topic delivers to every connected worker. Connect brokers only to Worker nodes. Include diagram-only catalog kinds where appropriate and identify their simulation limits in assumptions.',
    'Return named user workflows such as Open feed or Upload media, each a connected subset of the overview edges starting at its Gateway. Include only calls used by that workflow, including its asynchronous deliveries.',
    'Use one root Gateway. Connect every node, avoid cycles, allow at most 20 nodes and 8 downstream calls per node.',
    'Use unique lowercase slug IDs starting with a letter. Edges reference those IDs.',
    'Limit title, node names and workflow names to 80 characters, IDs to 60, assumptions to 800 characters, and workflows to 8. Every workflow must have at least one edge. For upload/thumbnail processing, a runnable path is Gateway -> upload Service -> Message Queue -> Worker.',
    'State important modeling assumptions including any requested behavior that cannot run. Never claim unsupported behavior.',
    JSON.stringify(componentCatalog),
    JSON.stringify(description),
    ...(correction ? [JSON.stringify({ previousValidationError: correction }), "Return a complete corrected graph for the original request."] : []),
  ].join('\n')
  return generateStructured('cloud', prompt, schema, () => {}, 'gemini-4-hydrogen')
}
