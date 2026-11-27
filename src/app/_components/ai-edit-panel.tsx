"use client";

import { useState } from "react";
import { generateArchitecture } from "@/adapters/ai/generate-architecture";
import type { readArchitecture } from "@/application/generated-architecture";
import { namedBreakerAction, resolveEditTarget } from "@/application/edit-target";
import { requestArchitecture } from "@/application/request-architecture";
import { isOutagePrompt, previewOutage, type OutageExperiment } from "@/application/outage-experiment";
import { z } from "zod";
import { detectLocalModel, requestEdit, type InferencePath } from "@/adapters/ai/firebase-feasibility";
import { previewEdit, type EditPreview } from "@/application/scenario-edits";
import type { EditTarget } from "@/contracts/architecture-edit";
import type { Scenario } from "@/domain/model/scenario";

interface Props {
  onGenerate: (graph: ReturnType<typeof readArchitecture>, view: number) => void;
  scenario: Scenario;
  target?: EditTarget;
  onApply: (draft: Scenario) => void;
  onExperiment: (experiment: OutageExperiment) => void;
}

const clarification = z.strictObject({ kind: z.literal("clarify") });

export default function AiEditPanel({ scenario, target, onApply, onGenerate, onExperiment }: Props) {
  const [mode, setMode] = useState<"generate" | "edit">("generate");
  const [workflow, chooseWorkflow] = useState(-1);
  const [generated, setGenerated] = useState<{ original: Scenario; graph: ReturnType<typeof readArchitecture> } | null>(null);
  const [request, setRequest] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [measurement, setMeasurement] = useState("");
  const [proposal, setProposal] = useState<{ original: Scenario; preview: EditPreview; name: string } | null>(null);
  const [experiment, setExperiment] = useState<{ original: Scenario; preview: ReturnType<typeof previewOutage> } | null>(null);
  const breakerAction = namedBreakerAction(request);
  const experimentPrompt = isOutagePrompt(request);
  const localPreview = breakerAction || experimentPrompt;
  const generating = mode === "generate" && !localPreview;
  const stale = (proposal && proposal.original !== scenario) || (experiment && experiment.original !== scenario);

  async function propose(path: InferencePath) {
    const instruction = request.trim();
    if (!instruction || busy) return;
    setBusy(true);
    setGenerated(null);
    setProposal(null);
    setExperiment(null);
    setMeasurement("");
    setStatus("");
    try {
      if (experimentPrompt) {
        setExperiment({ original: scenario, preview: previewOutage(scenario, instruction) });
        return;
      }
      if (generating) {
        setStatus("Waiting for cloud Gemini…");
        const graph = await requestArchitecture(
          correction => generateArchitecture(instruction, correction),
          scenario.workload,
          (result, attempt) => setMeasurement(previous =>
            [previous, `Attempt ${attempt}: ${result.source}, ${result.elapsedMs} ms.`].filter(Boolean).join(" ")),
          reason => setStatus(`Requesting a corrected graph. ${reason}`),
        );
        chooseWorkflow(-1);
        setGenerated({ original: scenario, graph });
        setStatus("Review this architecture before replacing the canvas and its runs.");
        return;
      }
      const resolved = resolveEditTarget(scenario, instruction, target);
      const name = resolved.type === "service" ? resolved.name : `${resolved.from} → ${resolved.to}`;
      let value: unknown;
      if (breakerAction && resolved.type === "dependency") {
        value = breakerAction === "enable"
          ? { kind: "enableCircuitBreaker", edgeId: resolved.id, ...resolved.breaker }
          : { kind: "disableCircuitBreaker", edgeId: resolved.id };
      } else {
        setStatus(path === "local" ? "Checking the on-device model…" : "Waiting for cloud Gemini…");
        if (path === "local") {
          if (await detectLocalModel() === "unavailable") {
            setStatus("Local AI is unavailable on this device. Manual editing is available.");
            return;
          }
          setStatus("Requesting a local edit…");
        }
        const result = await requestEdit(path, resolved, instruction, () => setStatus("Preparing the on-device model…"));
        setMeasurement(`Observed source: ${result.source}. Inference: ${result.elapsedMs} ms.`);
        value = JSON.parse(result.text);
      }
      if (clarification.safeParse(value).success) {
        setStatus(`Describe one setting to change on ${name}.`);
        return;
      }
      const preview = previewEdit(scenario, resolved.id, value);
      if (preview.before === preview.after) {
        setStatus(`${preview.field} is already ${preview.before}.`);
        return;
      }
      setProposal({ original: scenario, preview, name });
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
        void propose(generating ? "cloud" : "local");
      }}>
        <span className="prompt-symbol" aria-hidden="true">✦</span>
        <input aria-label="Architecture prompt" value={request} maxLength={2000} disabled={busy}
          placeholder={mode === "generate" ? "Describe a system, edit, or outage…" : "Name a service or dependency and describe the edit…"}
          onChange={event => { setRequest(event.target.value); setProposal(null); setGenerated(null); setExperiment(null); setMeasurement(""); setStatus(""); }} />
        <select aria-label="Prompt action" value={mode} disabled={busy} onChange={event => {
          setMode(event.target.value === "generate" ? "generate" : "edit");
          setProposal(null); setGenerated(null); setExperiment(null); setStatus(""); setMeasurement("");
        }}>
          <option value="generate">Generate graph</option>
          <option value="edit">Edit architecture</option>
        </select>
        <button className="send" disabled={busy || !request.trim()} type="submit">{busy ? "Working…" : generating ? "Generate ↗" : experimentPrompt ? "Preview experiment" : breakerAction ? "Preview edit" : "Propose locally"}</button>
        {mode === "edit" && !localPreview && <button type="button" disabled={busy || !request.trim()} onClick={() => propose("cloud")}>Send to cloud</button>}
      </form>
      {(request || mode === "edit") && !localPreview && <small>{generating ? "Generate sends your description to cloud Gemini." : "Cloud sends the request and settings for the resolved service or dependency."}</small>}
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
        {stale || (generated && generated.original !== scenario) ? <p>The draft changed. Generate a fresh preview.</p> : status && <p>{status}</p>}
        {measurement && <p>{measurement}</p>}
      </div>
      {experiment && !stale && <div className="proposal">
        <strong>{experiment.preview.name} · {experiment.preview.experiment.kind === "repair" ? "Repair" : "Outage"}</strong>
        <p>{experiment.preview.experiment.kind === "repair" ? "Remove scheduled outage" : "Schedule outage"} {experiment.preview.schedule}.</p>
        <button type="button" onClick={() => {
          onExperiment(experiment.preview.experiment);
          setExperiment(null);
        }}>Run experiment</button>
        <button type="button" onClick={() => setExperiment(null)}>Discard</button>
      </div>}
      {proposal && !stale && <div>
        <strong>{proposal.name} · {proposal.preview.field}</strong>
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
