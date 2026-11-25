import type { FormEvent } from "react";
import { z } from "zod";
import type { Scenario, ServiceKind } from "@/domain/model/scenario";
import { serviceSettings, edgeSettings, breakerSettings, updateService, updateDependency } from "@/application/scenario-edits";
import InfrastructureSymbol from "./infrastructure-symbol";
import { serviceClass } from "./service-node";

interface Props {
  scenario: Scenario;
  selected: string;
  message: string;
  report: (message: string) => void;
  onApply: (draft: Scenario) => void;
  onRename: (id: string, name: string, kind: ServiceKind) => void;
  onRemove: () => void;
}

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

export function SettingsInspector({ scenario, selected, message, report, onApply, onRename, onRemove }: Props) {
  const service = scenario.nodes.find((node) => node.id === selected);
  const edge = scenario.edges.find((item) => item.id === selected);



  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (service) {
        const settings = serviceSettings.parse(values);
        onApply(updateService(scenario, { ...service, ...settings }));
        onRename(service.id, settings.name, service.kind);
      } else if (edge) {
        const settings = edgeSettings.parse(values);
        const circuitBreaker = values.breaker
          ? breakerSettings.parse(values)
          : undefined;
        onApply(updateDependency(scenario, { ...edge, ...settings, circuitBreaker }));
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
      {selected !== scenario.workload.rootId && (
        <button onClick={onRemove}>Remove selection</button>
      )}
      <p role="status">{message}</p>
    </aside>
  );
}
