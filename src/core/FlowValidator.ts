import type { ChainPlan, EdgeCondition, FlowEdge, FlowNode, FlowRequest, RetryPolicy, ValidationIssue, ValidationResult } from "../types";
import type { NodeRegistry } from "./NodeRegistry";

const CONDITION_OPERATORS = new Set(["equals", "notEquals", "exists", "truthy", "falsy"]);

export class FlowValidator {
  constructor(private readonly registry: NodeRegistry) {}

  validate(request: unknown): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!isRecord(request)) return { valid: false, issues: [{ code: "INVALID_REQUEST", message: "Flow request must be an object." }] };
    if (!Object.hasOwn(request, "input")) issues.push({ code: "MISSING_INPUT", message: "Flow request must include input." });
    if (!Array.isArray(request.nodes)) issues.push({ code: "INVALID_NODES", message: "Flow request must include a nodes array." });
    if (!Array.isArray(request.edges)) issues.push({ code: "INVALID_EDGES", message: "Flow request must include an edges array." });
    if (typeof request.output !== "string" || request.output.trim() === "") issues.push({ code: "INVALID_OUTPUT", message: "Flow request must include a non-empty output node ID." });
    if (issues.length > 0) return { valid: false, issues };

    const typed = request as FlowRequest;
    issues.push(...this.validateNodes(typed.nodes), ...this.validateEdges(typed.edges));
    if (issues.length === 0) issues.push(...this.validateGraph(typed));
    return issues.length > 0 ? { valid: false, issues } : { valid: true };
  }

  buildChainPlan(request: FlowRequest): ChainPlan {
    const outgoingByNodeId = new Map<string, FlowEdge[]>();
    const incomingCount = new Map(request.nodes.map((node) => [node.id, 0]));
    for (const node of request.nodes) outgoingByNodeId.set(node.id, []);
    for (const edge of request.edges) {
      outgoingByNodeId.get(edge.from)?.push(edge);
      incomingCount.set(edge.to, (incomingCount.get(edge.to) ?? 0) + 1);
    }

    const startNodeId = request.nodes.find((node) => incomingCount.get(node.id) === 0)?.id ?? "";
    const queue = request.nodes.filter((node) => incomingCount.get(node.id) === 0).map((node) => node.id);
    const workingIncoming = new Map(incomingCount);
    const orderedNodeIds: string[] = [];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      orderedNodeIds.push(nodeId);
      for (const edge of outgoingByNodeId.get(nodeId) ?? []) {
        const remaining = (workingIncoming.get(edge.to) ?? 0) - 1;
        workingIncoming.set(edge.to, remaining);
        if (remaining === 0) queue.push(edge.to);
      }
    }

    const nextByNodeId = new Map<string, string>();
    for (const [nodeId, edges] of outgoingByNodeId) {
      const successEdges = edges.filter((edge) => (edge.on ?? "success") === "success");
      const onlyEdge = successEdges[0];
      if (successEdges.length === 1 && onlyEdge !== undefined && onlyEdge.condition === undefined) nextByNodeId.set(nodeId, onlyEdge.to);
    }
    return { startNodeId, orderedNodeIds, nextByNodeId, outgoingByNodeId };
  }

  private validateNodes(nodes: FlowNode[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const seen = new Set<string>();
    if (nodes.length === 0) issues.push({ code: "EMPTY_NODES", message: "Flow must include at least one node." });
    for (const [index, node] of nodes.entries()) {
      if (!isRecord(node)) { issues.push({ code: "INVALID_NODE", message: `Node at index ${index} must be an object.` }); continue; }
      if (typeof node.id !== "string" || node.id.trim() === "") issues.push({ code: "MISSING_NODE_ID", message: `Node at index ${index} must include a non-empty id.` });
      else if (seen.has(node.id)) issues.push({ code: "DUPLICATE_NODE_ID", message: `Node id "${node.id}" is duplicated.`, nodeId: node.id });
      else seen.add(node.id);
      if (typeof node.type !== "string" || node.type.trim() === "") issues.push({ code: "MISSING_NODE_TYPE", message: `Node "${String(node.id ?? index)}" must include a non-empty type.`, ...(typeof node.id === "string" ? { nodeId: node.id } : {}) });
      else if (!this.registry.hasNode(node.type)) issues.push({ code: "UNREGISTERED_NODE_TYPE", message: `Node type "${node.type}" is not registered.`, nodeType: node.type, ...(typeof node.id === "string" ? { nodeId: node.id } : {}) });
      if (node.timeoutMs !== undefined && (!Number.isInteger(node.timeoutMs) || node.timeoutMs <= 0 || node.timeoutMs > 86_400_000)) issues.push({ code: "INVALID_NODE_TIMEOUT", message: `Node "${String(node.id)}" timeoutMs must be an integer from 1 to 86400000.`, ...(typeof node.id === "string" ? { nodeId: node.id } : {}) });
      if (node.retry !== undefined) issues.push(...validateRetry(node.retry, typeof node.id === "string" ? node.id : undefined));
    }
    return issues;
  }

  private validateEdges(edges: FlowEdge[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const [index, edge] of edges.entries()) {
      if (!isRecord(edge)) { issues.push({ code: "INVALID_EDGE", message: `Edge at index ${index} must be an object.` }); continue; }
      if (typeof edge.from !== "string" || edge.from.trim() === "") issues.push({ code: "MISSING_EDGE_FROM", message: `Edge at index ${index} must include a non-empty from node ID.` });
      if (typeof edge.to !== "string" || edge.to.trim() === "") issues.push({ code: "MISSING_EDGE_TO", message: `Edge at index ${index} must include a non-empty to node ID.` });
      if (edge.on !== undefined && edge.on !== "success" && edge.on !== "failure") issues.push({ code: "INVALID_EDGE_OUTCOME", message: `Edge at index ${index} has an invalid outcome.` });
      if (edge.condition !== undefined) issues.push(...validateCondition(edge.condition, index));
    }
    return issues;
  }

  private validateGraph(request: FlowRequest): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const nodeIds = new Set(request.nodes.map((node) => node.id));
    const incoming = new Map(request.nodes.map((node) => [node.id, 0]));
    const outgoing = new Map<string, FlowEdge[]>(request.nodes.map((node) => [node.id, []]));
    if (!nodeIds.has(request.output)) issues.push({ code: "MISSING_OUTPUT_NODE", message: `Output node "${request.output}" does not exist.`, nodeId: request.output });
    for (const edge of request.edges) {
      if (!nodeIds.has(edge.from)) issues.push({ code: "MISSING_EDGE_SOURCE", message: `Edge source "${edge.from}" does not exist.`, nodeId: edge.from });
      if (!nodeIds.has(edge.to)) issues.push({ code: "MISSING_EDGE_TARGET", message: `Edge target "${edge.to}" does not exist.`, nodeId: edge.to });
      if (edge.from === edge.to) issues.push({ code: "SELF_EDGE", message: `Node "${edge.from}" cannot connect to itself.`, nodeId: edge.from });
      if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
        outgoing.get(edge.from)?.push(edge);
        incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
      }
    }
    if (issues.length > 0) return issues;

    const starts = request.nodes.filter((node) => incoming.get(node.id) === 0);
    if (starts.length !== 1) issues.push({ code: "INVALID_START_NODE_COUNT", message: `Flow must have exactly one start node. Found ${starts.length}.` });
    for (const node of request.nodes) {
      for (const outcome of ["success", "failure"] as const) {
        const candidates = (outgoing.get(node.id) ?? []).filter((edge) => (edge.on ?? "success") === outcome);
        if (candidates.filter((edge) => edge.condition === undefined).length > 1) issues.push({ code: "AMBIGUOUS_EDGE", message: `Node "${node.id}" has multiple unconditional ${outcome} edges.`, nodeId: node.id, nodeType: node.type });
      }
    }
    if (hasCycle(request.nodes, request.edges)) issues.push({ code: "CYCLE_DETECTED", message: "Flow contains a cycle." });
    if (starts[0]) {
      const reachable = collectReachable(starts[0].id, outgoing);
      for (const node of request.nodes) if (!reachable.has(node.id)) issues.push({ code: "DISCONNECTED_NODE", message: `Node "${node.id}" is unreachable from the start node.`, nodeId: node.id, nodeType: node.type });
      if (!reachable.has(request.output)) issues.push({ code: "UNREACHABLE_OUTPUT_NODE", message: `Output node "${request.output}" is unreachable from the start node.`, nodeId: request.output });
    }
    return issues;
  }
}

function validateRetry(value: unknown, nodeId?: string): ValidationIssue[] {
  if (!isRecord(value)) return [{ code: "INVALID_RETRY_POLICY", message: `Node "${String(nodeId)}" retry must be an object.`, ...(nodeId ? { nodeId } : {}) }];
  const retry = value as RetryPolicy;
  const issues: ValidationIssue[] = [];
  if (!Number.isInteger(retry.maxAttempts) || retry.maxAttempts < 1 || retry.maxAttempts > 10) issues.push({ code: "INVALID_RETRY_POLICY", message: "retry.maxAttempts must be an integer from 1 to 10.", ...(nodeId ? { nodeId } : {}) });
  if (retry.delayMs !== undefined && (!Number.isInteger(retry.delayMs) || retry.delayMs < 0 || retry.delayMs > 60_000)) issues.push({ code: "INVALID_RETRY_POLICY", message: "retry.delayMs must be an integer from 0 to 60000.", ...(nodeId ? { nodeId } : {}) });
  if (retry.backoffMultiplier !== undefined && (!Number.isFinite(retry.backoffMultiplier) || retry.backoffMultiplier < 1 || retry.backoffMultiplier > 10)) issues.push({ code: "INVALID_RETRY_POLICY", message: "retry.backoffMultiplier must be from 1 to 10.", ...(nodeId ? { nodeId } : {}) });
  if (retry.retryOn !== undefined && (!Array.isArray(retry.retryOn) || retry.retryOn.some((code) => typeof code !== "string" || code.trim() === ""))) issues.push({ code: "INVALID_RETRY_POLICY", message: "retry.retryOn must contain non-empty error codes.", ...(nodeId ? { nodeId } : {}) });
  return issues;
}

function validateCondition(value: unknown, edgeIndex: number): ValidationIssue[] {
  if (!isRecord(value)) return [{ code: "INVALID_EDGE_CONDITION", message: `Edge at index ${edgeIndex} condition must be an object.` }];
  const condition = value as EdgeCondition;
  if (!CONDITION_OPERATORS.has(condition.operator)) return [{ code: "INVALID_EDGE_CONDITION", message: `Edge at index ${edgeIndex} has an invalid condition operator.` }];
  if (condition.path !== undefined && (typeof condition.path !== "string" || condition.path.split(".").some((part) => part.trim() === ""))) return [{ code: "INVALID_EDGE_CONDITION", message: `Edge at index ${edgeIndex} has an invalid condition path.` }];
  if ((condition.operator === "equals" || condition.operator === "notEquals") && !Object.hasOwn(condition, "value")) return [{ code: "INVALID_EDGE_CONDITION", message: `Edge at index ${edgeIndex} condition requires a value.` }];
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }

function collectReachable(start: string, outgoing: Map<string, FlowEdge[]>): Set<string> {
  const seen = new Set<string>();
  const stack = [start];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const edge of outgoing.get(id) ?? []) stack.push(edge.to);
  }
  return seen;
}

function hasCycle(nodes: FlowNode[], edges: FlowEdge[]): boolean {
  const outgoing = new Map<string, string[]>(nodes.map((node) => [node.id, []]));
  for (const edge of edges) outgoing.get(edge.from)?.push(edge.to);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const next of outgoing.get(id) ?? []) if (visit(next)) return true;
    visiting.delete(id); visited.add(id); return false;
  };
  return nodes.some((node) => visit(node.id));
}
