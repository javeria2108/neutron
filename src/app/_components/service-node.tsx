import type { ServiceKind } from "@/domain/model/scenario";
import { componentCatalog } from "@/domain/model/component-catalog";
import InfrastructureSymbol from "./infrastructure-symbol";

export function serviceClass(kind: ServiceKind) {
  return "service-card kind-" + kind.toLowerCase().replaceAll(" ", "-");
}

export function nodeLabel(name: string, kind: ServiceKind) {
  return (
    <span className="node-face">
      <span className="node-symbol">
        <InfrastructureSymbol kind={kind} />
      </span>
      <strong>{name}{componentCatalog.some(entry => entry.kind === kind && entry.model === 'planned') && <small className="model-note">Diagram only</small>}</strong>
    </span>
  );
}
