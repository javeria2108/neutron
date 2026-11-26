"use client";

import { useState } from "react";
import { generateArchitecture } from "@/adapters/ai/generate-architecture";
import { readArchitecture } from "@/application/generated-architecture";
import { z } from "zod";
import { detectLocalModel, requestEdit, type InferencePath } from "@/adapters/ai/firebase-feasibility";
import { previewEdit, type EditPreview } from "@/application/scenario-edits";
import type { EditTarget } from "@/contracts/architecture-edit";
import type { Scenario } from "@/domain/model/scenario";

interface Props {
  onGenerate: (graph: ReturnType<typeof readArchitecture>, view: number) => void;
  scenario: Scenario;
  target: EditTarget;
  onApply: (draft: Scenario) => void;
}

const clarification = z.strictObject({ kind: z.literal("clarify") });

export default function AiEditPanel({ scenario, target, onApply, onGenerate }: Props) {
  const [mode, setMode] = useState<"generate" | "edit">("generate");
  const [workflow, chooseWorkflow] = useState(-1);
  const [generated, setGenerated] = useState<{ original: Scenario; graph: ReturnType<typeof readArchitecture> } | null>(null);
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
    setGenerated(null);
    setProposal(null);
    setMeasurement("");
    setStatus(path === "local" ? "Checking the on-device model…" : "Waiting for cloud Gemini…");
    try {
      if (mode === "generate") {
        const result = await generateArchitecture(instruction);
        setMeasurement(`Observed source: ${result.source}. Inference: ${result.elapsedMs} ms.`);
        const graph = readArchitecture(JSON.parse(result.text), scenario.workload);
        chooseWorkflow(-1);
        setGenerated({ original: scenario, graph });
        setStatus("Review this architecture before replacing the canvas and its runs.");
        return;
      }
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
        setStatus("The model returned an invalid proposal. Try a more specific request.");
      } else {
        setStatus(error instanceof Error ? error.message : "Could not generate an edit.");
      }
    } finally {
      setBusy(false);
    }
  }

  const view = generated?.graph.workflows[workflow];
  const previewDraft = view?.draft ?? generated?.graph.draft;
  return (
    <section className="ai-edit" aria-label="AI edit">
      <form className="composer" onSubmit={event => {
        event.preventDefault();
        void propose(mode === "generate" ? "cloud" : "local");
      }}>
        <span className="prompt-symbol" aria-hidden="true">✦</span>
        <input aria-label="Architecture prompt" value={request} maxLength={2000} disabled={busy}
          placeholder={mode === "generate" ? "Describe a system to generate its architecture…" : `Describe an edit to ${name}…`}
          onChange={event => { setRequest(event.target.value); setProposal(null); setGenerated(null); setMeasurement(""); setStatus(""); }} />
        <select aria-label="Prompt action" value={mode} disabled={busy} onChange={event => {
          setMode(event.target.value === "generate" ? "generate" : "edit");
          setProposal(null); setGenerated(null); setStatus(""); setMeasurement("");
        }}>
          <option value="generate">Generate graph</option>
          <option value="edit">Edit selection</option>
        </select>
        <button className="send" disabled={busy || !request.trim()} type="submit">{busy ? "Working…" : mode === "generate" ? "Generate ↗" : "Propose locally"}</button>
        {mode === "edit" && <button type="button" disabled={busy || !request.trim()} onClick={() => propose("cloud")}>Send to cloud</button>}
      </form>
      {(request || mode === "edit") && <small>{mode === "generate" ? "Generate sends your description to cloud Gemini." : `Editing ${name}. Cloud sends the request and the selected settings.`}</small>}
      {generated && generated.original === scenario && <div className="proposal">
        <strong>{generated.graph.title}</strong>
        <label>Canvas view <select value={workflow} onChange={event => chooseWorkflow(Number(event.target.value))}>
          <option value={-1}>Architecture overview</option>
          {generated.graph.workflows.map((flow, index) => <option key={index} value={index}>{flow.name}</option>)}
        </select></label><p>{previewDraft?.nodes.map(node => node.name).join(" · ")}</p>
        <p>{previewDraft?.edges.map(edge => edge.source + " → " + edge.target).join(" · ")}</p>
        <p>{generated.graph.assumptions}</p>
        <button type="button" onClick={() => { onGenerate(generated.graph, workflow); setGenerated(null); setStatus("Architecture applied."); }}>Replace canvas</button>
        <button type="button" onClick={() => { setGenerated(null); setStatus("Proposal discarded."); }}>Discard</button>
      </div>}
      <div aria-live="polite">
        {status && <p>{stale || (generated && generated.original !== scenario) ? "The draft changed. Generate a fresh preview." : status}</p>}
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
