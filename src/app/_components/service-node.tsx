import type { ServiceKind } from "@/domain/model/scenario";
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
      <strong>{name}</strong>
    </span>
  );
}
