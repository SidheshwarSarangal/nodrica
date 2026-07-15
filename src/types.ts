export type ExecutionStatus = "pending" | "running" | "success" | "failed" | "skipped";

export type FlowNode = {
  id: string;
  type: string;
  config?: unknown;
  timeoutMs?: number;
  retry?: RetryPolicy;
};

export type FlowEdge = {
  from: string;
  to: string;
  on?: "success" | "failure";
  condition?: EdgeCondition;
};

export type EdgeCondition = {
  path?: string;
  operator: "equals" | "notEquals" | "exists" | "truthy" | "falsy";
  value?: unknown;
};

export type RetryPolicy = {
  maxAttempts: number;
  delayMs?: number;
  backoffMultiplier?: number;
  retryOn?: string[];
};

export type FlowRequest = {
  input: unknown;
  nodes: FlowNode[];
  edges: FlowEdge[];
  output: string;
};

export type NodeContext = {
  runId: string;
  nodeId: string;
  nodeType: string;
  attempt: number;
  maxAttempts: number;
  signal: AbortSignal;
};

export type NodeHandler = (
  input: unknown,
  config: unknown,
  context: NodeContext
) => Promise<unknown> | unknown;

export type NodeDefinition = {
  type: string;
  run: NodeHandler;
};

export type SerializableError = {
  name: string;
  message: string;
  code: string;
  nodeId?: string;
  nodeType?: string;
  cause?: unknown;
};

export type NodeResult = {
  nodeId: string;
  nodeType: string;
  status: ExecutionStatus;
  input?: unknown;
  output?: unknown;
  error?: SerializableError;
  attempts: number;
  durationMs: number;
};

export type FlowResult = {
  success: boolean;
  output?: unknown;
  nodeResults: Record<string, NodeResult>;
  error?: SerializableError;
  runId: string;
};

export type ValidationIssue = {
  code: string;
  message: string;
  nodeId?: string;
  nodeType?: string;
};

export type ValidationResult =
  | {
      valid: true;
    }
  | {
      valid: false;
      issues: ValidationIssue[];
    };

export type ChainPlan = {
  startNodeId: string;
  orderedNodeIds: string[];
  nextByNodeId: Map<string, string>;
  outgoingByNodeId: Map<string, FlowEdge[]>;
};

export type FailureInput = {
  failedNodeId: string;
  failedNodeType: string;
  input: unknown;
  error: SerializableError;
  attempts: number;
};

export type ExecutionEvent =
  | { type: "runStarted"; runId: string; timestamp: number }
  | { type: "nodeStarted"; runId: string; nodeId: string; nodeType: string; attempt: number; timestamp: number }
  | { type: "nodeRetrying"; runId: string; nodeId: string; nodeType: string; attempt: number; delayMs: number; error: SerializableError; timestamp: number }
  | { type: "nodeSucceeded"; runId: string; nodeId: string; nodeType: string; result: NodeResult; timestamp: number }
  | { type: "nodeFailed"; runId: string; nodeId: string; nodeType: string; result: NodeResult; timestamp: number }
  | { type: "runSucceeded"; runId: string; timestamp: number }
  | { type: "runFailed"; runId: string; error: SerializableError; timestamp: number };

export type RunOptions = {
  signal?: AbortSignal;
  onEvent?: (event: ExecutionEvent) => void;
};
