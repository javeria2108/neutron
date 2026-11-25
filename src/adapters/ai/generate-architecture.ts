import { Schema } from 'firebase/ai'
import { componentCatalog, serviceKinds } from '@/domain/model/component-catalog'
import { generateStructured } from './firebase-feasibility'

const schema = Schema.object({ properties: {
  title: Schema.string(), assumptions: Schema.string(),
  nodes: Schema.array({ items: Schema.object({ properties: {
    id: Schema.string(), name: Schema.string(), kind: Schema.enumString({ enum: serviceKinds }),
  } }) }),
  edges: Schema.array({ items: Schema.object({ properties: { source: Schema.string(), target: Schema.string() } }) }),
} })

export function generateArchitecture(description: string) {
  const prompt = [
    'Design a runnable synchronous request/response graph for the following architecture description.',
    'Use one root Gateway. Connect every node, avoid cycles, allow at most 20 nodes and 8 downstream calls per node.',
    'Use unique lowercase slug IDs starting with a letter. Edges reference those IDs.',
    'State important modeling assumptions including any requested behavior that cannot run. Never claim unsupported behavior.',
    JSON.stringify(componentCatalog.filter(item => item.model !== 'planned')),
    JSON.stringify(description),
  ].join('\n')
  return generateStructured('cloud', prompt, schema, () => {})
}
