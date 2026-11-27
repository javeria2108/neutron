"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Background,
  Controls,
  ReactFlow,
  useNodesState,
  Position,
  type ReactFlowInstance,
  type XYPosition,
  type Connection,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { checkoutScenario } from "@/domain/model/checkout";
import {
  connectionError,
  newDependency,
  newService,
  serviceKinds,
  type ServiceKind,
} from "@/domain/model/scenario";
import { renderGraph } from "./render-graph";
import { SettingsInspector } from "./SettingsInspector";
import { ComponentCatalog } from "./ComponentCatalog";
import { nodeLabel, serviceClass } from "./service-node";
import AiEditPanel from "./ai-edit-panel";
import { getEditTarget } from "@/application/edit-target";
import { graphLayout } from "./graph-layout";
import type { readArchitecture } from "@/application/generated-architecture";
import type { RunResult } from "@/domain/simulation/run-simulation";
import { SimulationError } from "@/domain/simulation/validate-run";
import { describeStep, indexTrail } from "./request-replay";
import {
  compareOutage,
  compareScenario,
  type RunSeries,
} from "@/application/compare-scenario";
import type { OutageExperiment } from "@/application/outage-experiment";
import RunComparison from "./run-comparison";
import RunSummary from "./run-summary";
import "./editor.css";

const starter = checkoutScenario();
function starterNodes(vertical: boolean): Node[] {
  const positions = graphLayout(starter, vertical);
  return starter.nodes.map((service, index) => ({
  id: service.id,
  position: positions[index],
  sourcePosition: vertical ? Position.Bottom : Position.Right,
  targetPosition: vertical ? Position.Top : Position.Left,
  className: serviceClass(service.kind),
  data: { label: nodeLabel(service.name, service.kind) },
}));
}

function replaySteps(run: RunResult, requestId: number) {
  return run.trace.filter(
    (event) =>
      event.requestId === requestId &&
      !["service-start", "service-complete", "service-finished"].includes(
        event.kind,
      ),
  );
}

const subscribeToHydration = () => () => {};
export default function CheckoutEditor() {
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  if (!hydrated) return <main aria-label="Loading architecture studio" />;
  return <Workbench />;
}

function Workbench() {
  const [initialNodes] = useState(() => starterNodes(window.matchMedia("(max-width: 600px)").matches));
  const [scenario, setScenario] = useState(checkoutScenario);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [selected, select] = useState("gateway");
  const [faultTarget, setFaultTarget] = useState("provider");
  const [architecture, setArchitecture] = useState<ReturnType<typeof readArchitecture> | null>(null);
  const [activeView, setActiveView] = useState(-1);
  const [savedViews, setSavedViews] = useState<Record<number, { draft: typeof scenario; nodes: typeof nodes }>>({});
  const [panel, setPanel] = useState<"catalog" | "settings" | null>(null);
  const editTarget = getEditTarget(scenario, scenario.nodes.find(n => n.id === selected), scenario.edges.find(e => e.id === selected));
  function inspectSelection(id: string) { select(id); setPanel("settings"); }
  function showView(draft: typeof scenario, savedNodes?: typeof nodes) {
    const vertical = window.matchMedia("(max-width: 600px)").matches;
    const layout = savedNodes ? [] : graphLayout(draft, vertical);
    setNodes(savedNodes ?? draft.nodes.map((node, index) => ({
      id: node.id, position: layout[index], sourcePosition: vertical ? Position.Bottom : Position.Right,
      targetPosition: vertical ? Position.Top : Position.Left, className: serviceClass(node.kind),
      data: { label: nodeLabel(node.name, node.kind) },
    })));
    setFaultTarget(draft.nodes.find(node => node.kind === "Worker")?.id ?? draft.workload.rootId);
    setScenario(draft); select(draft.workload.rootId);
    setPanel(null); setSeries({}); setResult(null); setRunDraft(null); setPlaying(false);
    setConnectionWarning(""); setRunError(""); report("");
    requestAnimationFrame(() => requestAnimationFrame(() => void flow?.fitView({ padding: .18, maxZoom: 1.25 })));
  }
  function replaceGraph(graph: ReturnType<typeof readArchitecture>, view: number) {
    setArchitecture(graph);
    setActiveView(view);
    setSavedViews({});
    showView(graph.workflows[view]?.draft ?? graph.draft);
  }
  function switchView(view: number) {
    if (!architecture || view === activeView) return;
    const saved = savedViews[view];
    setSavedViews(previous => ({ ...previous, [activeView]: { draft: scenario, nodes } }));
    setActiveView(view);
    showView(saved?.draft ?? architecture.workflows[view]?.draft ?? architecture.draft, saved?.nodes);
  }
  const [flow, setFlow] = useState<ReactFlowInstance<Node> | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [runDraft, setRunDraft] = useState<typeof scenario | null>(null);
  const [requestId, setRequestId] = useState(1);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const steps = useMemo(
    () => (result ? replaySteps(result, requestId) : []),
    [result, requestId],
  );
  const current = steps[step];
  const onGraph = runDraft === scenario ? current : undefined;
  const trail = useMemo(() => indexTrail(steps), [steps]);
  const graph = renderGraph(nodes, scenario.edges, selected, onGraph, trail, step);
  const advancing = playing && !!onGraph && step < steps.length - 1;
  useEffect(() => {
    if (!advancing) return;
    const timer = window.setTimeout(() => setStep(step + 1), 1700);
    return () => window.clearTimeout(timer);
  }, [advancing, step, result, requestId]);
  function chooseRequest(id: number) {
    setRequestId(id);
    setStep(0);
    setPlaying(false);
  }
  const [runError, setRunError] = useState("");
  const [series, setSeries] = useState<RunSeries>({});
  const [runLabel, setRunLabel] = useState("Baseline");
  const incident = useMemo(
    () => result?.trace.find((event) => event.kind === "outage-hit"),
    [result],
  );
  const recovery = useMemo(
    () => result?.trace.find((event) => event.kind === "circuit-close"),
    [result],
  );
  function inspect(event: RunResult["trace"][number]) {
    if (!result) return;
    chooseRequest(event.requestId);
    setStep(
      replaySteps(result, event.requestId).findIndex(
        (item) => item.id === event.id,
      ),
    );
  }

  function execute(draft: typeof scenario, experiment?: OutageExperiment) {
    try {
      setPanel(null);
      const completed = experiment ? compareOutage(experiment, series) : compareScenario(draft, series);
      setSeries(completed.series);
      setRunLabel(completed.label);
      setResult(completed.result);
      setScenario(draft);
      setRunDraft(draft);
      setStep(0);
      setRequestId(1);
      setPlaying(
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
      setRunError("");
    } catch (error) {
      if (!(error instanceof SimulationError)) throw error;
      setRunError(error.message);
    }
  }
  const [connectionWarning, setConnectionWarning] = useState("");
  const [message, report] = useState("");
  function connect({ source, target }: Connection) {
    const error = connectionError(
      scenario.nodes,
      scenario.edges,
      source,
      target,
    );
    if (error) return setConnectionWarning(error);
    setConnectionWarning("");
    const dependency = newDependency(source, target);
    setScenario({ ...scenario, edges: [...scenario.edges, dependency] });
    select(dependency.id);
    report("Dependency added.");
  }

  function addService(kind: ServiceKind, position?: XYPosition) {
    if (nodes.length >= 20)
      return report("The graph supports up to 20 services.");
    const id = crypto.randomUUID();
    const node = newService(id, kind, kind);
    setScenario({ ...scenario, nodes: [...scenario.nodes, node] });
    setNodes((previous) => [
      ...previous,
      {
        id,
        className: serviceClass(kind),
        position: position ?? { x: 210 + nodes.length * 8, y: 280 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: { label: nodeLabel(kind, kind) },
      },
    ]);
    inspectSelection(id);
    report("Connect the new service to the graph.");
  }

  function remove() {
    if (selected === scenario.workload.rootId) return;
    setScenario({
      ...scenario,
      faults: scenario.faults.filter((fault) => fault.targetId !== selected),
      nodes: scenario.nodes.filter((node) => node.id !== selected),
      edges: scenario.edges.filter(
        (item) => ![item.id, item.source, item.target].includes(selected),
      ),
    });
    setNodes((previous) => previous.filter((node) => node.id !== selected));
    select(scenario.workload.rootId);
    report("Selection removed.");
  }

  function renameNode(id: string, name: string, kind: ServiceKind) {
    setNodes((previous) =>
      previous.map((node) =>
        node.id === id
          ? {
              ...node,
              data: { label: nodeLabel(name, kind) },
            }
          : node,
      ),
    );
  }

  return (
    <main className="workbench">
      <header className="masthead">
        <div className="brand">
          <i className="brand-mark" aria-hidden="true" />
          Neutron
        </div>
        <span className="product-name">/ &nbsp; Architecture studio</span>
        <Link href="/ai-feasibility">AI diagnostics ↗</Link>
      </header>
      <div className="studio">
        <div className="scenario-heading">
          <div><div className="workspace-path">Workspace <span>/</span> Architecture</div><h1>{architecture?.title ?? "Checkout Under Pressure"}</h1></div>
          <button className="run-button" onClick={() => execute(scenario)}><span aria-hidden="true">▷</span> Run simulation</button>
        </div>
        <AiEditPanel scenario={scenario} target={editTarget} onApply={setScenario} onGenerate={replaceGraph}
          onExperiment={experiment => execute(experiment.kind === "repair" ? experiment.baseline : experiment.faulted, experiment)} />
      <div className="workspace">
        <section aria-label="Architecture editor">
          <div className="toolbar">
            <h2><span className="canvas-icon" aria-hidden="true">⌘</span> System canvas</h2>
            <span className="counts">{nodes.length} nodes · {scenario.edges.length} connections</span>
            <div className="tools">
            <button aria-expanded={panel === "catalog"} onClick={() => setPanel(panel === "catalog" ? null : "catalog")}>＋ Components</button>
            <button aria-expanded={panel === "settings"} onClick={() => setPanel(panel === "settings" ? null : "settings")}>Inspector</button>
            </div>
          </div>
          {architecture && <div className="architecture-views">
            {architecture.workflows.length > 0 && (
              <label>Canvas view <select value={activeView} onChange={event => switchView(Number(event.target.value))}>
                <option value={-1}>Overview</option>
                {architecture.workflows.map((workflow, index) => <option key={index} value={index}>{workflow.name}</option>)}
              </select></label>
            )}
            {architecture.assumptions && <details><summary>Architecture assumptions</summary><p>{architecture.assumptions}</p></details>}
          </div>}

          {runError && (
            <p className="run-error" role="alert">
              {runError}
            </p>
          )}
          {result && (
            <div className="replay" aria-label="Checkout replay">
              <div className="replay-heading">
                <strong>Run complete</strong>
                <span>
                  {result.metrics.success} of {result.metrics.attempted}{" "}
                  {architecture ? "requests succeeded" : "checkouts succeeded"}
                </span>
                {incident && (
                  <button onClick={() => inspect(incident)}>
                    Inspect first affected checkout
                  </button>
                )}
                {recovery && (
                  <button onClick={() => inspect(recovery)}>
                    Inspect recovery probe
                  </button>
                )}
                {!!result.scenario.faults.length &&
                  scenario.edges.some(
                    (edge) =>
                      edge.source === "orders" && edge.target === "payments",
                  ) && (
                    <button
                      onClick={() =>
                        inspectSelection(
                          scenario.edges.find(
                            (edge) =>
                              edge.source === "orders" &&
                              edge.target === "payments",
                          )!.id,
                        )
                      }
                    >
                      Configure Orders breaker
                    </button>
                  )}
                <a href="#baseline-results">Inspect results</a>
              </div>
              {current && (
                <>
                  <div
                    className="replay-story"
                    aria-live={advancing ? "off" : "polite"}
                  >
                    <span>{current.timeMs} ms</span>{" "}
                    {describeStep(result, current)}
                    {current.kind === "attempt" && (
                      <small>The caller is waiting for this dependency.</small>
                    )}
                  </div>
                  <div className="replay-controls">
                    <label>
                      Checkout{" "}
                      <input
                        type="number"
                        min={1}
                        max={result.metrics.attempted}
                        value={requestId}
                        onChange={(event) =>
                          chooseRequest(
                            Math.max(
                              1,
                              Math.min(
                                result.metrics.attempted,
                                Math.trunc(Number(event.target.value)) || 1,
                              ),
                            ),
                          )
                        }
                      />
                    </label>
                    <button
                      onClick={() => {
                        setPlaying(false);
                        setStep(step - 1);
                      }}
                      disabled={!step}
                    >
                      Previous step
                    </button>
                    <button
                      disabled={!onGraph || steps.length < 2}
                      onClick={() => {
                        if (step === steps.length - 1) setStep(0);
                        setPlaying(!advancing);
                      }}
                    >
                      {advancing
                        ? "Pause"
                        : step === steps.length - 1
                          ? "Replay"
                          : "Play"}
                    </button>
                    <button
                      onClick={() => {
                        setPlaying(false);
                        setStep(step + 1);
                      }}
                      disabled={step === steps.length - 1}
                    >
                      Next step
                    </button>
                    <span>
                      Step {step + 1} of {steps.length}
                    </span>
                  </div>
                </>
              )}
              {runDraft !== scenario && (
                <p>Draft edited. Run again to follow this graph.</p>
              )}
            </div>
          )}
          <div className={"drawing" + (panel ? " has-panel" : "")}>
          <div
            className="canvas"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const kind = serviceKinds.find(
                (type) =>
                  type !== "Gateway" &&
                  type ===
                    event.dataTransfer.getData(
                      "application/x-neutron-component",
                    ),
              );
              if (flow && kind) {
                addService(
                  kind,
                  flow.screenToFlowPosition({
                    x: event.clientX,
                    y: event.clientY,
                  }),
                );
              }
            }}
          >
            <ReactFlow<Node>
              onInit={instance => setFlow(instance)}
              nodes={graph.nodes}
              edges={graph.edges}
              defaultEdgeOptions={{ type: "smoothstep" }}
              onNodesChange={onNodesChange}
              onConnectStart={() => setConnectionWarning("")}
              onConnect={connect}
              deleteKeyCode={null}
              onNodeClick={(_, node) => inspectSelection(node.id)}
              onEdgeClick={(_, item) => inspectSelection(item.id)}
              fitViewOptions={{ padding: .18, maxZoom: 1.25 }}
              onPaneClick={() => setPanel(null)} fitView
            >
              <Background gap={20} size={1} color="#c8c8d5" />
              <Controls showInteractive={false} />
            </ReactFlow>
            {connectionWarning && (
              <p className="connection-warning" role="alert">
                {connectionWarning}
              </p>
            )}
          </div>
          {panel && <div className="drawer">
            <div className="drawer-heading"><strong>{panel === "catalog" ? "Components" : "Properties"}</strong>
              <button aria-label="Close panel" onClick={() => setPanel(null)}>×</button></div>
            {panel === "catalog" ? <ComponentCatalog onAdd={addService} /> :
              <SettingsInspector scenario={scenario} selected={selected} message={message}
                report={report} onApply={setScenario} onRemove={remove} onRename={renameNode} />}
          </div>}
          </div>
          <div className="canvas-footer"><span className="state-dot" />{result ? runLabel + " run" : "Draft"}<span className="workload-meta">{scenario.workload.arrivalRatePerSecond} req/s · {scenario.workload.durationMs / 1000} s · Seed {scenario.workload.seed}</span>
          <div className="experiment-tools">
            <select aria-label="Outage target" value={scenario.nodes.some(node => node.id === faultTarget) ? faultTarget : scenario.workload.rootId} onChange={event => setFaultTarget(event.target.value)}>
              {scenario.nodes.map(node => <option key={node.id} value={node.id}>{node.name}</option>)}
            </select>
            {(
              <button
                onClick={() =>
                  execute({
                    ...scenario,
                    faults: scenario.faults.length
                      ? []
                      : [
                          {
                            kind: "outage",
                            targetId: scenario.nodes.some(node => node.id === faultTarget) ? faultTarget : scenario.workload.rootId,
                            startMs: 15000,
                            endMs: 35000,
                          },
                        ],
                  })
                }
              >
                {scenario.faults.length
                  ? "Clear outage"
                  : faultTarget === "provider" ? "Inject provider outage" : "Inject outage"}
              </button>
            )}
          </div></div>
          {result && (
            <RunSummary
              key={requestId}
              run={result}
              label={runLabel}
              requestId={requestId}
              chooseRequest={chooseRequest}
            />
          )}
          {result && <RunComparison series={series} />}
        </section>
      </div>
      </div>
    </main>
  );
}
