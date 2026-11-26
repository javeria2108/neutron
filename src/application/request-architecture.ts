import { z } from 'zod'
import type { Scenario } from '../domain/model/scenario'
import { readArchitecture } from './generated-architecture'

interface Response {
  text: string
  source: string
  elapsedMs: number
}

export async function requestArchitecture(
  request: (correction?: string) => Promise<Response>,
  workload: Scenario['workload'],
  observed: (response: Response, attempt: number) => void,
  correcting: (reason: string) => void,
) {
  let reason: string | undefined
  for (const attempt of [1, 2]) {
    const response = await request(reason)
    observed(response, attempt)
    try {
      return readArchitecture(JSON.parse(response.text), workload)
    } catch (error) {
      if (error instanceof z.ZodError) {
        reason = error.issues.slice(0, 3).map(issue =>
          `${issue.path.join('.') || 'graph'}: ${issue.message}`).join('. ')
      } else if (error instanceof SyntaxError) {
        reason = 'The response could not be parsed as a complete JSON object.'
      } else if (error instanceof Error) {
        reason = error.message
      } else {
        throw error
      }
      if (attempt === 1) correcting(reason)
    }
  }
  throw new Error(`Architecture validation failed after two attempts. ${reason}`)
}
