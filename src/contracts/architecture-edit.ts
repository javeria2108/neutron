export type EditTarget =
  | { type: "service"; id: string; name: string; processingLatencyMs: number }
  | {
      type: "dependency";
      id: string;
      from: string;
      to: string;
      timeoutMs: number;
      maxRetries: number;
      breaker: {
        failureThreshold: number;
        windowMs: number;
        openDurationMs: number;
      };
    };
