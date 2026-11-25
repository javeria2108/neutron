"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
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
import { z } from "zod";
import { checkoutScenario } from "@/domain/model/checkout";
import {
  connectionError,
  newDependency,
  newService,
  serviceKinds,
  type ServiceKind,
} from "@/domain/model/scenario";
import { serviceSettings, edgeSettings, breakerSettings, updateService, updateDependency } from "@/application/scenario-edits";
import type { EditTarget } from "@/contracts/architecture-edit";
import AiEditPanel from "./ai-edit-panel";
import { renderGraph } from "./render-graph";
import { serviceClass, nodeLabel } from "./service-node";
import InfrastructureSymbol from "./infrastructure-symbol";
import type { RunResult } from "@/domain/simulation/run-simulation";
import { SimulationError } from "@/domain/simulation/validate-run";
import { describeStep, indexTrail } from "./request-replay";
import {
  compareScenario,
  type RunSeries,
} from "@/application/compare-scenario";
import RunComparison from "./run-comparison";
import RunSummary from "./run-summary";
import "./editor.css";

const starter = checkoutScenario();
const positions = [
  [0, 90],
  [210, 90],
  [435, 0],
  [655, 0],
  [435, 180],
];
const initialNodes: Node[] = starter.nodes.map((service, index) => ({
  id: service.id,
  position: { x: positions[index][0], y: positions[index][1] },
  sourcePosition: Position.Right,
  targetPosition: Position.Left,
  className: serviceClass(service.kind),
  data: { label: nodeLabel(service.name, service.kind) },
}));

function field(label: string, name: string, value: number, step = "1") {
  return (
    <label>
      {label}
      <input
        required
        type="number"
        name={name}
        defaultValue={value}
        step={step}
      />
    </label>
  );
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

export default function CheckoutEditor() {
  const [scenario, setScenario] = useState(checkoutScenario);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [selected, select] = useState("gateway");
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

  function execute(draft: typeof scenario) {
    try {
      const completed = compareScenario(draft, series);
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
  const service = scenario.nodes.find((node) => node.id === selected);
  const edge = scenario.edges.find((item) => item.id === selected);

  let editTarget: EditTarget | undefined;
  if (service) {
    editTarget = {
      type: "service", id: service.id, name: service.name,
      processingLatencyMs: service.processingLatencyMs,
    };
  } else if (edge) {
    editTarget = {
      type: "dependency", id: edge.id,
      from: scenario.nodes.find(node => node.id === edge.source)?.name ?? edge.source,
      to: scenario.nodes.find(node => node.id === edge.target)?.name ?? edge.target,
      timeoutMs: edge.timeoutMs, maxRetries: edge.maxRetries,
      breaker: {
        failureThreshold: edge.circuitBreaker?.failureThreshold ?? 3,
        windowMs: edge.circuitBreaker?.windowMs ?? 5000,
        openDurationMs: edge.circuitBreaker?.openDurationMs ?? 2000,
      },
    };
  }

  function initializeCanvas(instance: ReactFlowInstance<Node>) {
    setFlow(instance);
    if (window.matchMedia("(max-width: 480px)").matches) {
      const mobilePositions = [
        [0, 0],
        [0, 120],
        [0, 245],
        [0, 375],
        [195, 245],
      ];
      setNodes((previous) =>
        previous.map((node, index) => ({
          ...node,
          position: {
            x: mobilePositions[index][0],
            y: mobilePositions[index][1],
          },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        })),
      );
      requestAnimationFrame(() => {
        void instance.fitView({ padding: 0.14 });
      });
    }
  }

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
    select(id);
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
    select("gateway");
    report("Selection removed.");
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (service) {
        const settings = serviceSettings.parse(values);
        setScenario(updateService(scenario, { ...service, ...settings }));
        setNodes((previous) =>
          previous.map((node) =>
            node.id === selected
              ? {
                  ...node,
                  data: { label: nodeLabel(settings.name, service.kind) },
                }
              : node,
          ),
        );
      } else if (edge) {
        const settings = edgeSettings.parse(values);
        const circuitBreaker = values.breaker
          ? breakerSettings.parse(values)
          : undefined;
        setScenario(updateDependency(scenario, { ...edge, ...settings, circuitBreaker }));
      }
      report("Settings saved.");
    } catch (error) {
      if (!(error instanceof z.ZodError)) throw error;
      report(
        error.issues
          .map((issue) => issue.path.join(".") + " - " + issue.message)
          .join(". "),
      );
    }
  }

  return (
    <main className="workbench">
      <header className="masthead">
        <div className="brand">
          <i className="brand-mark" aria-hidden="true" />
          Neutron
        </div>
        <span className="product-name">Architecture lab</span>
        <Link href="/ai-feasibility">AI diagnostics</Link>
      </header>
      <div className="scenario-heading">
        <div>
          <h1>Checkout Under Pressure</h1>
        </div>
        <dl className="workload">
          <div>
            <dt>Seed</dt>
            <dd>{scenario.workload.seed}</dd>
          </div>
          <div>
            <dt>Traffic</dt>
            <dd>{scenario.workload.arrivalRatePerSecond} req/s</dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>{scenario.workload.durationMs / 1000} s</dd>
          </div>
        </dl>
      </div>
      <div className="workspace">
        <nav className="library" aria-label="Component library">
          <h2>Components</h2>
          <p>Click or drag to add</p>
          <div className="palette">
            {serviceKinds
              .filter((type) => type !== "Gateway")
              .map((type) => (
                <button
                  key={type}
                  className={serviceClass(type)}
                  draggable
                  onDragStart={(event) =>
                    event.dataTransfer.setData(
                      "application/x-neutron-component",
                      type,
                    )
                  }
                  onClick={() => addService(type)}
                  aria-label={`Add ${type}`}
                >
                  <InfrastructureSymbol kind={type} />
                  {type}
                </button>
              ))}
          </div>
          <div className="outline">
            <h2>In this graph</h2>
            {scenario.nodes.map((node) => (
              <button
                key={node.id}
                aria-pressed={node.id === selected}
                onClick={() => select(node.id)}
              >
                <InfrastructureSymbol kind={node.kind} />
                {node.name}
              </button>
            ))}
          </div>
        </nav>
        <section aria-label="Architecture editor">
          <div className="toolbar">
            <h2>Topology</h2>
            <button type="button" onClick={() => execute(scenario)}>
              Run simulation
            </button>
            {scenario.nodes.some((node) => node.id === "provider") && (
              <button
                onClick={() =>
                  execute({
                    ...scenario,
                    faults: scenario.faults.length
                      ? []
                      : [
                          {
                            kind: "outage",
                            targetId: "provider",
                            startMs: 15000,
                            endMs: 35000,
                          },
                        ],
                  })
                }
              >
                {scenario.faults.length
                  ? "Clear outage"
                  : "Inject provider outage"}
              </button>
            )}
            <span>
              {nodes.length} nodes / {scenario.edges.length} dependencies
            </span>
          </div>
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
                  checkouts succeeded
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
                        select(
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
              onInit={initializeCanvas}
              nodes={graph.nodes}
              edges={graph.edges}
              defaultEdgeOptions={{ type: "smoothstep" }}
              onNodesChange={onNodesChange}
              onConnectStart={() => setConnectionWarning("")}
              onConnect={connect}
              deleteKeyCode={null}
              onNodeClick={(_, node) => select(node.id)}
              onEdgeClick={(_, item) => select(item.id)}
              fitView
            >
              <Background gap={19} size={1.2} color="#3a435a" />
              <Controls showInteractive={false} />
            </ReactFlow>
            {connectionWarning && (
              <p className="connection-warning" role="alert">
                {connectionWarning}
              </p>
            )}
          </div>
          {result && (
            <RunSummary
              key={requestId}
              run={result}
              label={runLabel}
              requestId={requestId}
              chooseRequest={chooseRequest}
            />
          )}
          <RunComparison series={series} />
        </section>
        <aside>
          <div className="inspector-label">Inspector</div>
          {service && (
            <span className={"inspector-symbol " + serviceClass(service.kind)}>
              <InfrastructureSymbol kind={service.kind} />
            </span>
          )}
          <h2>{service?.name ?? "Dependency"}</h2>
          <form key={JSON.stringify(service ?? edge)} onSubmit={save}>
            {service && (
              <>
                <p>{service.kind}</p>
                <label>
                  Name
                  <input
                    required
                    name="name"
                    defaultValue={service.name}
                    maxLength={80}
                  />
                </label>
                {field(
                  "Processing latency (ms)",
                  "processingLatencyMs",
                  service.processingLatencyMs,
                )}
                {field(
                  "Concurrent requests",
                  "maxConcurrent",
                  service.maxConcurrent,
                )}
                {field(
                  "Queue capacity",
                  "queueCapacity",
                  service.queueCapacity,
                )}
                {field(
                  "Failure probability (0 to 1)",
                  "baseFailureRate",
                  service.baseFailureRate,
                  "any",
                )}
              </>
            )}
            {edge && (
              <>
                <p>
                  {scenario.nodes.find((n) => n.id === edge.source)?.name} to{" "}
                  {scenario.nodes.find((n) => n.id === edge.target)?.name}
                </p>
                {field("Timeout (ms)", "timeoutMs", edge.timeoutMs)}
                {field("Maximum retries", "maxRetries", edge.maxRetries)}
                {field(
                  "Retry backoff (ms)",
                  "retryBackoffMs",
                  edge.retryBackoffMs,
                )}
                <label>
                  <input
                    type="checkbox"
                    name="breaker"
                    defaultChecked={!!edge.circuitBreaker}
                  />{" "}
                  Enable circuit breaker
                </label>
                {field(
                  "Failure threshold",
                  "failureThreshold",
                  edge.circuitBreaker?.failureThreshold ?? 3,
                )}
                {field(
                  "Rolling window (ms)",
                  "windowMs",
                  edge.circuitBreaker?.windowMs ?? 5000,
                )}
                {field(
                  "Open duration (ms)",
                  "openDurationMs",
                  edge.circuitBreaker?.openDurationMs ?? 2000,
                )}
                {field(
                  "Half-open probes",
                  "halfOpenMaxProbes",
                  edge.circuitBreaker?.halfOpenMaxProbes ?? 1,
                )}
              </>
            )}
            <button className="save">Save settings</button>
          </form>
          {editTarget && (
            <AiEditPanel key={editTarget.id} scenario={scenario} target={editTarget} onApply={setScenario} />
          )}
          {selected !== scenario.workload.rootId && (
            <button onClick={remove}>Remove selection</button>
          )}
          <p role="status">{message}</p>
        </aside>
      </div>
    </main>
  );
}
