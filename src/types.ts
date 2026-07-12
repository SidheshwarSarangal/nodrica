export type ExecutionStatus = "pending" | "running" | "success" | "failed" | "skipped";

export type FlowNode = {
  id: string;
  type: string;
  config?: unknown;
};

export type FlowEdge = {
  from: string;
  to: string;
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
};
