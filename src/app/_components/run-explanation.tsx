"use client";

import { useRef, useState } from "react";
import { explainRun } from "@/adapters/ai/explain-run";
import type { RunSeries } from "@/application/compare-scenario";
import { buildRunEvidence, readRunExplanation } from "@/application/run-evidence";

type Response = {
  series: RunSeries;
  status: "waiting" | "unavailable";
} | {
  series: RunSeries;
  status: "ready";
  claims: ReturnType<typeof readRunExplanation>;
  source: string;
  elapsedMs: number;
};

export default function RunExplanation({ series }: { series: RunSeries }) {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<Response | null>(null);
  const sequence = useRef(0);
  const current = response?.series === series ? response : null;

  async function submit() {
    const prompt = question.trim();
    if (!prompt || current?.status === "waiting") return;
    const request = ++sequence.current;
    setResponse({ series, status: "waiting" });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const evidence = await buildRunEvidence(series);
      const result = await Promise.race([
        explainRun(prompt, evidence),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("Cloud explanation timed out.")), 20000);
        }),
      ]);
      const claims = readRunExplanation(JSON.parse(result.text), evidence);
      if (request === sequence.current) setResponse({
        series, status: "ready", claims, source: result.source, elapsedMs: result.elapsedMs,
      });
    } catch {
      if (request === sequence.current) setResponse({ series, status: "unavailable" });
    } finally {
      clearTimeout(timer);
    }
  }

  return <section className="comparison run-explanation" aria-label="Explain runs">
    <h2>Explain runs</h2>
    <form onSubmit={event => { event.preventDefault(); void submit(); }}>
      <label>Question about these runs <input value={question} maxLength={500} onChange={event => {
        setQuestion(event.target.value);
        sequence.current++;
        setResponse(null);
      }} /></label>
      <button disabled={!question.trim() || current?.status === "waiting"}>Ask cloud Gemini</button>
    </form>
    <small>Sends your question, run metrics, sampled trace events, and related settings to cloud Gemini.</small>
    <div aria-live="polite">
      {current?.status === "waiting" && <p>Waiting for cloud Gemini…</p>}
      {current?.status === "unavailable" && <p>Cloud explanation unavailable. The run comparison and trace show the measured results.</p>}
      {current?.status === "ready" && <>
        <p>Observed source {current.source} · {current.elapsedMs} ms</p>
        <ul>{current.claims.map((claim, index) => <li key={index}>
          <p>{claim.text}</p>
          <ul>
            {claim.metrics.map(metric => <li key={metric.ref}>{metric.ref} = {metric.value ?? "n/a"}</li>)}
            {claim.events.map(event => <li key={event.ref}>{event.ref} · {event.timeMs} ms · {event.kind} · {event.nodeId}{event.outcome ? ` · ${event.outcome}` : ""}</li>)}
          </ul>
        </li>)}</ul>
      </>}
    </div>
  </section>;
}
