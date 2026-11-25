"use client";

import { useState } from "react";
import { z } from "zod";
import { detectLocalModel, requestEdit, type InferencePath } from "@/adapters/ai/firebase-feasibility";
import { previewEdit, type EditPreview } from "@/application/scenario-edits";
import type { EditTarget } from "@/contracts/architecture-edit";
import type { Scenario } from "@/domain/model/scenario";

interface Props {
  scenario: Scenario;
  target: EditTarget;
  onApply: (draft: Scenario) => void;
}

const clarification = z.strictObject({ kind: z.literal("clarify") });

export default function AiEditPanel({ scenario, target, onApply }: Props) {
  const [request, setRequest] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [measurement, setMeasurement] = useState("");
  const [proposal, setProposal] = useState<{ original: Scenario; preview: EditPreview } | null>(null);
  const name = target.type === "service" ? target.name : `${target.from} → ${target.to}`;
  const stale = proposal !== null && proposal.original !== scenario;

  async function propose(path: InferencePath) {
    const instruction = request.trim();
    if (!instruction || busy) return;
    setBusy(true);
    setProposal(null);
    setMeasurement("");
    setStatus(path === "local" ? "Checking the on-device model…" : "Waiting for cloud Gemini…");
    try {
      if (path === "local") {
        if (await detectLocalModel() === "unavailable") {
          setStatus("Local AI is unavailable on this device. Manual editing is available.");
          return;
        }
        setStatus("Requesting a local edit…");
      }
      const result = await requestEdit(path, target, instruction, () => setStatus("Preparing the on-device model…"));
      setMeasurement(`Observed source: ${result.source}. Inference: ${result.elapsedMs} ms.`);
      const value: unknown = JSON.parse(result.text);
      if (clarification.safeParse(value).success) {
        setStatus(`Describe one setting to change on ${name}.`);
        return;
      }
      const preview = previewEdit(scenario, target.id, value);
      if (preview.before === preview.after) {
        setStatus(`${preview.field} is already ${preview.before}.`);
        return;
      }
      setProposal({ original: scenario, preview });
      setStatus("Review the proposed change.");
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof z.ZodError) {
        setStatus("The model returned an invalid edit. Try one setting and an explicit value.");
      } else {
        setStatus(error instanceof Error ? error.message : "Could not generate an edit.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="ai-edit" aria-label="AI edit">
      <h3>AI edit</h3>
      <label>Request for {name}
        <textarea value={request} maxLength={500} disabled={busy}
          placeholder={target.type === "service" ? "Set processing latency to 750 ms" : "Set maximum retries to 2"}
          onChange={event => {
            setRequest(event.target.value);
            setProposal(null);
            setMeasurement("");
            setStatus("");
          }} />
      </label>
      <div className="ai-actions">
        <button type="button" disabled={busy || !request.trim()} onClick={() => propose("local")}>Propose locally</button>
        <button type="button" disabled={busy || !request.trim()} onClick={() => propose("cloud")}>Send to cloud</button>
      </div>
      <small>Cloud sends your request and the selected target’s settings to Gemini.</small>
      <div aria-live="polite">
        {status && <p>{stale ? "The draft changed. Generate a fresh preview." : status}</p>}
        {measurement && <p>{measurement}</p>}
      </div>
      {proposal && !stale && <div>
        <strong>{proposal.preview.field}</strong>
        <p>{proposal.preview.before} → {proposal.preview.after}</p>
        <div className="ai-actions">
          <button type="button" onClick={() => {
            onApply(proposal.preview.draft);
            setProposal(null);
            setStatus("Applied to the draft. Run the simulation to measure the effect.");
          }}>Apply to draft</button>
          <button type="button" onClick={() => {
            setProposal(null);
            setStatus("Proposal discarded.");
          }}>Discard</button>
        </div>
      </div>}
    </section>
  );
}
