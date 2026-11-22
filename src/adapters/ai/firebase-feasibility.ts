import { getApps, initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, InferenceSource, Schema } from 'firebase/ai'

export type InferencePath = 'local' | 'cloud'

type PromptApi = { availability(): Promise<string> }

export async function detectLocalModel() {
  const browser = globalThis as typeof globalThis & { LanguageModel?: PromptApi }
  return browser.LanguageModel?.availability() ?? 'unavailable'
}

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId)

const schema = Schema.object({
  properties: {
    kind: Schema.enumString({ enum: ['setNodeLatency'] }),
    nodeId: Schema.enumString({ enum: ['payments'] }),
    latencyMs: Schema.integer(),
  },
})

export async function runSample(path: InferencePath, latencyMs: number, onDownload: (progress: number) => void) {
  if (!firebaseConfigured) throw new Error('Add the Firebase web app configuration to .env.local.')
  const appName = `neutron-ai-feasibility-${path}`
  const existing = getApps().find((app) => app.name === appName)
  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY
  if (path === 'cloud' && !siteKey) {
    throw new Error('Set the Firebase App Check reCAPTCHA Enterprise site key in .env.local.')
  }
  const app = existing ?? initializeApp(config, appName)

  if (path === 'cloud' && siteKey && !existing) {
    if (process.env.NODE_ENV === 'development' && location.hostname === 'localhost') {
      Object.assign(globalThis, { FIREBASE_APPCHECK_DEBUG_TOKEN: true })
    }
    initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(siteKey) })
  }

  const ai = getAI(app, { backend: new GoogleAIBackend() })
  const model = getGenerativeModel(ai, path === 'local' ? {
    mode: InferenceMode.ONLY_ON_DEVICE,
    onDeviceParams: { promptOptions: { responseConstraint: schema } },
  } : {
    mode: InferenceMode.ONLY_IN_CLOUD,
    inCloudParams: {
      model: 'gemini-3.5-flash-lite',
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema },
    },
  })

  if (path === 'local') await model.initializeDeviceModel(onDownload)
  const started = performance.now()
  const { response } = await model.generateContent(
    `Convert this request to a setNodeLatency command. The Payments service ID is payments. Set Payments latency to ${latencyMs} ms.`,
  )
  const elapsedMs = Math.round(performance.now() - started)

  const source = response.inferenceSource === InferenceSource.ON_DEVICE ? 'Local'
    : response.inferenceSource === InferenceSource.IN_CLOUD ? 'Cloud'
      : 'Unknown'

  const text = response.text()
  let matchesSample = false
  try {
    const value: unknown = JSON.parse(text)
    matchesSample = typeof value === 'object' && value !== null &&
      Object.keys(value).length === 3 &&
      'kind' in value && value.kind === 'setNodeLatency' &&
      'nodeId' in value && value.nodeId === 'payments' &&
      'latencyMs' in value && value.latencyMs === latencyMs
  } catch {
    // Keep the source and timing visible even when the model returns invalid JSON.
  }
  return { source, elapsedMs, text, matchesSample, latencyMs }
}
