'use client'

import { useState } from 'react'
import { detectLocalModel, firebaseConfigured, runSample, type InferencePath } from '@/adapters/ai/firebase-feasibility'

export default function AiFeasibilityPage() {
  const [availability, setAvailability] = useState('Unchecked')
  const [latencyMs, setLatencyMs] = useState(500)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<Partial<Record<InferencePath, Awaited<ReturnType<typeof runSample>>>>>({})

  async function check() {
    setBusy(true)
    try {
      setAvailability(await detectLocalModel())
    } catch {
      setAvailability('Check failed')
    } finally {
      setBusy(false)
    }
  }

  async function run(path: InferencePath) {
    setBusy(true)
    setStatus('Preparing inference...')
    setResults((previous) => ({ ...previous, [path]: undefined }))
    try {
      const result = await runSample(path, latencyMs, (progress) => {
        setStatus(`Downloading Gemini Nano: ${Math.round(progress * 100)}%`)
      })
      setResults((previous) => ({ ...previous, [path]: result }))
      setStatus('')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Inference failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main>
      <h1>Firebase AI feasibility</h1>
      <p>Firebase configuration: {firebaseConfigured ? 'Present' : 'Missing (.env.local)'}</p>
      <p>Chrome model availability: {availability}</p>
      <button type="button" disabled={busy} onClick={check}>Check local support</button>
      <p>
        <label>
          Set Payments latency to{' '}
          <select value={latencyMs} disabled={busy} onChange={(event) => setLatencyMs(Number(event.target.value))}>
            <option value={500}>500 ms</option>
            <option value={750}>750 ms</option>
          </select>
        </label>
      </p>
      <button type="button" disabled={busy || !firebaseConfigured} onClick={() => run('local')}>Run local only</button>{' '}
      <button type="button" disabled={busy || !firebaseConfigured} onClick={() => run('cloud')}>Send sample to cloud</button>
      <p role="status">{status}</p>
      {(['local', 'cloud'] as const).map((path) => {
        const result = results[path]
        if (!result) return null
        return (
          <section key={path}>
            <h2>{path === 'local' ? 'Local-only request' : 'Cloud-only request'}</h2>
            <p>Sample: {result.latencyMs} ms. Observed source: {result.source}. Inference: {result.elapsedMs} ms.</p>
            <p>{result.matchesSample ? 'Command matches sample' : 'Command failed validation'}</p>
            <pre>{result.text}</pre>
          </section>
        )
      })}
    </main>
  )
}
